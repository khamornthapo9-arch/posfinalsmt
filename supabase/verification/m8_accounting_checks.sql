-- M8 verification: refunds, sale integrity, tab payment, customer payments, expense correction, cash
-- classification, payment methods, database guards.
--
-- SAFE ON LIVE DATA: one DO block creates its own test item / customers / shifts / sales / expenses in
-- an existing store and ALWAYS ends by raising an exception, which rolls EVERYTHING back (including
-- temporary store memberships and a temporary require_shift switch). The exception text is the report
-- (PASS / FAIL / SKIP lines). Run it AFTER the M7 and M8 migrations, in the Supabase SQL editor.
--
-- Manager = the store owner. Cashier = an active CASHIER member of that store, or (when none exists)
-- another existing user temporarily added as CASHIER (rolled back). Cross-store checks need a second
-- store with a different owner; otherwise they are reported as SKIP.
-- The SQL editor bypasses row-level security, so this proves the FUNCTION rules and TRIGGERS, not RLS.

CREATE OR REPLACE FUNCTION pg_temp.m8as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END, true);
END $$;

-- Runs one statement in a sub-transaction; returns 'OK' or the error message (its effects roll back on error).
CREATE OR REPLACE FUNCTION pg_temp.m8try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN 'OK';
EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $$;

CREATE OR REPLACE FUNCTION pg_temp.m8chk(p_name text, p_ok boolean, p_detail text) RETURNS text LANGUAGE sql AS $$
  SELECT E'\n' || CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END || ' ' || p_name || ' | ' || COALESCE(p_detail, '')
$$;

-- debit - credit of all ledger rows of one reference id (0 = balanced)
CREATE OR REPLACE FUNCTION pg_temp.m8bal(p_ref uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(sum(CASE direction WHEN 'DEBIT' THEN amount ELSE -amount END), 0)
    FROM public.ledger_entries WHERE reference_id::text = p_ref::text
$$;
-- number of ledger rows of one reference id, optionally by type / account / direction
CREATE OR REPLACE FUNCTION pg_temp.m8cnt(p_ref uuid, p_type text DEFAULT NULL, p_acct text DEFAULT NULL, p_dir text DEFAULT NULL)
RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.ledger_entries WHERE reference_id::text = p_ref::text
    AND (p_type IS NULL OR reference_type = p_type) AND (p_acct IS NULL OR account = p_acct)
    AND (p_dir IS NULL OR direction = p_dir)
$$;
-- signed amount (debit +, credit -) of one account for one reference id
CREATE OR REPLACE FUNCTION pg_temp.m8acct(p_ref uuid, p_acct text) RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(sum(CASE direction WHEN 'DEBIT' THEN amount ELSE -amount END), 0)
    FROM public.ledger_entries WHERE reference_id::text = p_ref::text AND account = p_acct
$$;
CREATE OR REPLACE FUNCTION pg_temp.m8exp(p_shift uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT (public.get_shift_summary(p_shift)->>'expected_cash')::numeric
$$;

DO $$
DECLARE
  v_store uuid := NULL;                       -- NULL = auto-pick
  v_owner uuid; v_cashier uuid; v_other uuid; v_other_owner uuid;
  v_rate numeric := 0; v_total numeric; v_half numeric;
  v_item uuid := gen_random_uuid(); v_item2 uuid := gen_random_uuid();
  v_rep text := ''; v_err text; v_r jsonb; v_r2 jsonb;
  v_sh uuid; v_sh_old uuid;
  v_s1 uuid := gen_random_uuid(); v_s2 uuid := gen_random_uuid(); v_s3 uuid := gen_random_uuid();
  v_s4 uuid := gen_random_uuid(); v_s5 uuid := gen_random_uuid(); v_s6 uuid := gen_random_uuid();
  v_s7 uuid := gen_random_uuid(); v_s8 uuid := gen_random_uuid(); v_tab uuid := gen_random_uuid();
  v_tab2 uuid := gen_random_uuid(); v_tab_other uuid := gen_random_uuid();
  v_cust uuid := gen_random_uuid(); v_cust2 uuid := gen_random_uuid();
  v_e1 uuid; v_e2 uuid; v_e3 uuid; v_e4 uuid; v_leg uuid := gen_random_uuid();
  v_n bigint; v_n2 bigint; v_n3 bigint; v_a numeric; v_b numeric; v_c numeric; v_x0 numeric; v_x1 numeric;
  v_stock int; v_stock0 int; v_status text; v_tmpmember boolean := false;
  v_lines jsonb; v_lines12 jsonb; v_cash_bd jsonb; v_kbz_bd jsonb; v_split_bd jsonb; v_credit_bd jsonb;
  v_t0 timestamptz := now();
  v_mv uuid; v_si_before numeric;
BEGIN
  -- ----- setup -----------------------------------------------------------------------------------------
  IF v_store IS NULL THEN
    SELECT id, owner_id, COALESCE(tax_rate, 0) INTO v_store, v_owner, v_rate FROM public.stores
      WHERE owner_id IS NOT NULL ORDER BY id LIMIT 1;
  ELSE
    SELECT owner_id, COALESCE(tax_rate, 0) INTO v_owner, v_rate FROM public.stores WHERE id = v_store;
  END IF;
  IF v_store IS NULL THEN RAISE EXCEPTION 'SETUP: no store with an owner found'; END IF;
  SELECT user_id INTO v_cashier FROM public.store_members
   WHERE store_id = v_store AND role = 'CASHIER' AND is_active AND user_id IS NOT NULL LIMIT 1;
  IF v_cashier IS NULL THEN
    SELECT id INTO v_cashier FROM auth.users WHERE id <> v_owner LIMIT 1;
    IF v_cashier IS NOT NULL THEN
      INSERT INTO public.store_members (store_id, user_id, role, is_active) VALUES (v_store, v_cashier, 'CASHIER', true);
      v_tmpmember := true;
    END IF;
  END IF;
  IF v_cashier IS NULL THEN
    RAISE EXCEPTION E'M8 CHECK REPORT (everything rolled back):%', pg_temp.m8chk('SETUP', false, 'need a second user for the cashier checks');
  END IF;
  SELECT id, owner_id INTO v_other, v_other_owner FROM public.stores s
   WHERE s.id <> v_store AND s.owner_id IS NOT NULL AND s.owner_id <> v_cashier AND s.owner_id <> v_owner
     AND NOT EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = s.id AND m.user_id = v_cashier)
   ORDER BY s.id LIMIT 1;

  -- snapshots for the "history unchanged" check
  CREATE TEMP TABLE m8_si ON COMMIT DROP AS SELECT id, unit_cost FROM public.sale_items;
  CREATE TEMP TABLE m8_ex ON COMMIT DROP AS SELECT id, amount, paid_with FROM public.expenses;
  CREATE TEMP TABLE m8_le ON COMMIT DROP AS SELECT id, account, direction, amount FROM public.ledger_entries;
  CREATE TEMP TABLE m8_sa ON COMMIT DROP AS SELECT id, total_amount, status FROM public.sales;

  INSERT INTO public.items (id, store_id, sku, name, price, stock_quantity, cost_price)
    VALUES (v_item, v_store, 'M8T-' || v_item, 'M8 test item', 1000, 1000, 400);
  INSERT INTO public.items (id, store_id, sku, name, price, stock_quantity, cost_price)
    VALUES (v_item2, v_store, 'M8U-' || v_item2, 'M8 carton item', 100, 1000, 10);
  INSERT INTO public.item_units (item_id, unit_name, conversion, price) VALUES (v_item2, 'Carton', 12, 1200);
  INSERT INTO public.customers (id, store_id, name) VALUES (v_cust, v_store, 'M8 customer');
  INSERT INTO public.customers (id, store_id, name) VALUES (v_cust2, v_store, 'M8 customer 2');
  v_total := round(1000 * (1 + v_rate / 100.0), 2);
  v_half := round(v_total / 2, 2);
  v_lines := jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 1, 'unit_price', 1000, 'conversion', 1));
  v_cash_bd := jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total));
  v_kbz_bd := jsonb_build_array(jsonb_build_object('method', 'KBZ Pay', 'amount', v_total));
  v_split_bd := jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_half),
                                  jsonb_build_object('method', 'Wave Pay', 'amount', v_total - v_half));
  v_credit_bd := jsonb_build_array(jsonb_build_object('method', 'အကြွေး', 'amount', v_total));

  PERFORM pg_temp.m8as(v_cashier);
  v_sh := (public.open_shift(v_store, 1000, '10000000-0000-0000-0000-0000000000a1', 'Cashier A')->>'shift_id')::uuid;

  -- ===== 1 cash sale: stock, payment, ledger, shift -----------------------------------------------------------------------
  v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item);
  v_r := public.post_sale(v_s1, v_store, v_lines, v_total, 'ငွေသား', v_cash_bd, NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_stock := (SELECT stock_quantity FROM public.items WHERE id = v_item);
  SELECT count(*) INTO v_n FROM public.inventory_movements WHERE reference_id = v_s1 AND movement_type = 'SALE' AND quantity = -1;
  v_rep := v_rep || pg_temp.m8chk('1 cash sale: stock -1 and one SALE movement', v_stock = v_stock0 - 1 AND v_n = 1, 'stock ' || v_stock0 || '->' || v_stock || ' movements=' || v_n);
  v_rep := v_rep || pg_temp.m8chk('1 cash sale: ledger balanced, CASH debited, COGS 400',
    pg_temp.m8bal(v_s1) = 0 AND pg_temp.m8acct(v_s1, 'CASH') = v_total AND pg_temp.m8acct(v_s1, 'COGS') = 400,
    'balance=' || pg_temp.m8bal(v_s1) || ' cash=' || pg_temp.m8acct(v_s1, 'CASH'));
  v_rep := v_rep || pg_temp.m8chk('1 cash sale: linked to the shift, expected cash +total',
    (SELECT shift_id FROM public.sales WHERE id = v_s1) = v_sh AND pg_temp.m8exp(v_sh) = 1000 + v_total, 'expected=' || pg_temp.m8exp(v_sh));
  -- ===== 2 digital payment does not raise drawer cash ============================================================================
  v_x0 := pg_temp.m8exp(v_sh);
  PERFORM public.post_sale(v_s2, v_store, v_lines, v_total, 'KBZ Pay', v_kbz_bd, NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_rep := v_rep || pg_temp.m8chk('2 KBZ sale: expected cash unchanged, KBZPAY debited, no CASH ledger row',
    pg_temp.m8exp(v_sh) = v_x0 AND pg_temp.m8acct(v_s2, 'KBZPAY') = v_total AND pg_temp.m8cnt(v_s2, 'SALE', 'CASH') = 0,
    'expected=' || pg_temp.m8exp(v_sh));
  -- ===== 3 split payment ============================================================================================================
  PERFORM public.post_sale(v_s3, v_store, v_lines, v_total, 'ငွေသား', v_split_bd, NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_rep := v_rep || pg_temp.m8chk('3 split: cash part in the drawer, Wave part in WAVEPAY, ledger balanced',
    pg_temp.m8exp(v_sh) = v_x0 + v_half AND pg_temp.m8acct(v_s3, 'CASH') = v_half
    AND pg_temp.m8acct(v_s3, 'WAVEPAY') = v_total - v_half AND pg_temp.m8bal(v_s3) = 0,
    'expected=' || pg_temp.m8exp(v_sh));
  -- invalid payment method
  SELECT count(*) INTO v_n FROM public.sales WHERE store_id = v_store;
  v_err := pg_temp.m8try(format('SELECT public.post_sale(%L, %L, %L::jsonb, %s, %L, %L::jsonb, NULL, %L, %L, now(), false, %L)',
    gen_random_uuid(), v_store, v_lines::text, v_total, 'Bitcoin',
    jsonb_build_array(jsonb_build_object('method', 'Bitcoin', 'amount', v_total))::text, 'COMPLETED', 'PAID', v_sh));
  SELECT count(*) INTO v_n2 FROM public.sales WHERE store_id = v_store;
  v_rep := v_rep || pg_temp.m8chk('F unknown payment method rejected, nothing saved', v_err LIKE '%INVALID_PAYMENT_METHOD%' AND v_n = v_n2, v_err);
  v_err := pg_temp.m8try(format('SELECT public.post_sale(%L, %L, %L::jsonb, %s, %L, %L::jsonb, NULL, %L, %L, now(), false, %L)',
    gen_random_uuid(), v_store, v_lines::text, v_total, 'ငွေသား',
    jsonb_build_array(jsonb_build_object('amount', v_total))::text, 'COMPLETED', 'PAID', v_sh));
  v_rep := v_rep || pg_temp.m8chk('F missing payment method rejected', v_err LIKE '%INVALID_PAYMENT_METHOD%', v_err);

  -- ===== multi-unit sale + refund returns base units ===========================================================================
  v_lines12 := jsonb_build_array(jsonb_build_object('item_id', v_item2, 'quantity', 1, 'unit_price', 1200, 'unit_name', 'Carton', 'conversion', 12));
  v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item2);
  PERFORM public.post_sale(v_s4, v_store, v_lines12, round(1200 * (1 + v_rate / 100.0), 2), 'ငွေသား',
    jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', round(1200 * (1 + v_rate / 100.0), 2))),
    NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_stock := (SELECT stock_quantity FROM public.items WHERE id = v_item2);
  v_rep := v_rep || pg_temp.m8chk('7 carton sale takes 12 base units', v_stock = v_stock0 - 12, 'stock ' || v_stock0 || '->' || v_stock);
  v_r := public.refund_sale(v_s4, 'carton returned', NULL, 'Cashier A', NULL);
  v_stock := (SELECT stock_quantity FROM public.items WHERE id = v_item2);
  SELECT count(*) INTO v_n FROM public.inventory_movements WHERE reference_id = v_s4 AND movement_type = 'RETURN' AND quantity = 12;
  v_rep := v_rep || pg_temp.m8chk('7 carton refund returns 12 base units with one RETURN movement', v_stock = v_stock0 AND v_n = 1, 'stock=' || v_stock || ' return rows=' || v_n);

  -- ===== 4 refund of the cash sale: all effects, history preserved ============================================================
  v_x0 := pg_temp.m8exp(v_sh);
  SELECT sum(unit_cost) INTO v_si_before FROM public.sale_items WHERE sale_id = v_s1;
  v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item);
  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE reference_type = 'SALE' AND reference_id::text = v_s1::text;
  v_r := public.refund_sale(v_s1, 'wrong item', 'customer returned', 'Cashier A', 'Mgr PIN');
  SELECT status, payment_status INTO v_status, v_err FROM public.sales WHERE id = v_s1;
  v_rep := v_rep || pg_temp.m8chk('4 refund: status REFUNDED, reason stored, original total/breakdown/items unchanged',
    v_status = 'REFUNDED' AND v_err = 'REFUNDED'
    AND (SELECT total_amount FROM public.sales WHERE id = v_s1) = v_total
    AND (SELECT payment_breakdown FROM public.sales WHERE id = v_s1) = v_cash_bd
    AND (SELECT sum(unit_cost) FROM public.sale_items WHERE sale_id = v_s1) = v_si_before
    AND (SELECT refund_reason FROM public.sales WHERE id = v_s1) = 'wrong item', v_status);
  v_rep := v_rep || pg_temp.m8chk('4/7 refund returns stock +1 with one RETURN movement',
    (SELECT stock_quantity FROM public.items WHERE id = v_item) = v_stock0 + 1
    AND (SELECT count(*) FROM public.inventory_movements WHERE reference_id = v_s1 AND movement_type = 'RETURN' AND quantity = 1) = 1,
    'stock=' || (SELECT stock_quantity FROM public.items WHERE id = v_item));
  v_rep := v_rep || pg_temp.m8chk('4 refund ledger mirrors the sale: every account nets to 0 and it stays balanced',
    pg_temp.m8cnt(v_s1, 'REFUND') = v_n AND pg_temp.m8acct(v_s1, 'CASH') = 0 AND pg_temp.m8acct(v_s1, 'SALES_REVENUE') = 0
    AND pg_temp.m8acct(v_s1, 'COGS') = 0 AND pg_temp.m8acct(v_s1, 'INVENTORY') = 0 AND pg_temp.m8acct(v_s1, 'TAX_PAYABLE') = 0
    AND pg_temp.m8bal(v_s1) = 0, 'sale rows=' || v_n || ' refund rows=' || pg_temp.m8cnt(v_s1, 'REFUND'));
  v_rep := v_rep || pg_temp.m8chk('4 cash refund: one drawer movement in the open shift, expected cash -cash part',
    (SELECT count(*) FROM public.cash_movements WHERE reference_id = v_s1 AND movement_type = 'REFUND_PAID' AND shift_id = v_sh AND amount = v_total) = 1
    AND pg_temp.m8exp(v_sh) = v_x0 - v_total AND (v_r->>'drawer_recorded')::boolean, 'expected=' || pg_temp.m8exp(v_sh));
  SELECT count(*) INTO v_n FROM public.sale_refunds WHERE sale_id = v_s1 AND approved_by_name = 'Mgr PIN' AND shift_id = v_sh AND cash_amount = v_total;
  v_rep := v_rep || pg_temp.m8chk('4 refund audit row (who, approver, shift, amounts)', v_n = 1, 'rows=' || v_n);
  -- ===== 6 duplicate refund ===========================================================================================================
  v_x1 := pg_temp.m8exp(v_sh); v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item);
  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE reference_id::text = v_s1::text;
  v_r := public.refund_sale(v_s1, 'wrong item', NULL, 'Cashier A', NULL);
  v_err := pg_temp.m8try(format('SELECT public.refund_sale(%L, %L)', v_s1, 'again'));
  SELECT count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_id::text = v_s1::text;
  v_rep := v_rep || pg_temp.m8chk('6 duplicate refund: already_refunded, no new stock/ledger/drawer/audit rows',
    (v_r->>'already_refunded')::boolean AND v_err = 'OK' AND v_n = v_n2 AND pg_temp.m8exp(v_sh) = v_x1
    AND (SELECT stock_quantity FROM public.items WHERE id = v_item) = v_stock0
    AND (SELECT count(*) FROM public.sale_refunds WHERE sale_id = v_s1) = 1
    AND (SELECT count(*) FROM public.cash_movements WHERE reference_id = v_s1 AND movement_type = 'REFUND_PAID') = 1,
    'ledger ' || v_n || '->' || v_n2);
  -- ===== digital refund: reversed on KBZPAY, not CASH, no drawer movement ======================================================
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.refund_sale(v_s2, 'kbz refund', NULL, 'Cashier A', NULL);
  v_rep := v_rep || pg_temp.m8chk('4/F KBZ refund reverses KBZPAY (not CASH); drawer untouched',
    pg_temp.m8acct(v_s2, 'KBZPAY') = 0 AND pg_temp.m8cnt(v_s2, 'REFUND', 'CASH') = 0 AND pg_temp.m8bal(v_s2) = 0
    AND pg_temp.m8exp(v_sh) = v_x0 AND NOT (v_r->>'drawer_recorded')::boolean
    AND (SELECT count(*) FROM public.cash_movements WHERE reference_id = v_s2) = 0, 'expected=' || pg_temp.m8exp(v_sh));
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.refund_sale(v_s3, 'split refund', NULL, 'Cashier A', NULL);
  v_rep := v_rep || pg_temp.m8chk('4/3 split refund: cash part leaves the drawer, Wave part reversed on WAVEPAY',
    pg_temp.m8exp(v_sh) = v_x0 - v_half AND pg_temp.m8acct(v_s3, 'WAVEPAY') = 0 AND pg_temp.m8acct(v_s3, 'CASH') = 0
    AND pg_temp.m8bal(v_s3) = 0, 'expected=' || pg_temp.m8exp(v_sh));

  -- ===== 5 failed refund leaves nothing behind ========================================================================================
  PERFORM public.post_sale(v_s5, v_store, v_lines, v_total, 'ငွေသား', v_cash_bd, NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item); v_x0 := pg_temp.m8exp(v_sh);
  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE reference_id::text = v_s5::text;
  -- a pre-existing audit row makes the LAST step of the refund fail, after every other step ran
  INSERT INTO public.sale_refunds (store_id, sale_id, refunded_by, reason, total_amount) VALUES (v_store, v_s5, v_cashier, 'blocker', v_total);
  v_err := pg_temp.m8try(format('SELECT public.refund_sale(%L, %L)', v_s5, 'will fail'));
  SELECT count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_id::text = v_s5::text;
  v_rep := v_rep || pg_temp.m8chk('5/19 failed refund rolls back sale status, stock, movements, ledger and drawer',
    v_err <> 'OK' AND (SELECT status FROM public.sales WHERE id = v_s5) = 'COMPLETED'
    AND (SELECT stock_quantity FROM public.items WHERE id = v_item) = v_stock0
    AND (SELECT count(*) FROM public.inventory_movements WHERE reference_id = v_s5 AND movement_type = 'RETURN') = 0
    AND v_n = v_n2 AND pg_temp.m8exp(v_sh) = v_x0
    AND (SELECT count(*) FROM public.cash_movements WHERE reference_id = v_s5) = 0, v_err);
  DELETE FROM public.sale_refunds WHERE sale_id = v_s5 AND reason = 'blocker';

  -- ===== credit sale, customer payments (partial, duplicate, final), refund of credit ===========================================
  PERFORM public.post_sale(v_s6, v_store, v_lines, v_total, 'အကြွေး', v_credit_bd, v_cust, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_rep := v_rep || pg_temp.m8chk('credit sale: customer owes the total, Receivable debited, drawer untouched',
    (SELECT balance FROM public.customers WHERE id = v_cust) = v_total AND pg_temp.m8acct(v_s6, 'ACCOUNTS_RECEIVABLE') = v_total,
    'balance=' || (SELECT balance FROM public.customers WHERE id = v_cust));
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.receive_customer_payment(v_store, v_cust, 300, 'ငွေသား', '40000000-0000-0000-0000-000000000001', 'Cashier A');
  v_e1 := (v_r->>'payment_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('8 partial cash payment: balance reduced, Dr CASH / Cr RECEIVABLE, drawer +300 once',
    (SELECT balance FROM public.customers WHERE id = v_cust) = v_total - 300 AND pg_temp.m8acct(v_e1, 'CASH') = 300
    AND pg_temp.m8acct(v_e1, 'ACCOUNTS_RECEIVABLE') = -300 AND pg_temp.m8bal(v_e1) = 0
    AND pg_temp.m8exp(v_sh) = v_x0 + 300 AND (v_r->>'shift_linked')::boolean, 'balance=' || (v_r->>'balance'));
  v_r := public.receive_customer_payment(v_store, v_cust, 300, 'ငွေသား', '40000000-0000-0000-0000-000000000001', 'Cashier A');
  v_rep := v_rep || pg_temp.m8chk('10 duplicate customer payment request posts nothing twice',
    (v_r->>'duplicate')::boolean AND (SELECT balance FROM public.customers WHERE id = v_cust) = v_total - 300
    AND pg_temp.m8cnt(v_e1) = 2 AND pg_temp.m8exp(v_sh) = v_x0 + 300
    AND (SELECT count(*) FROM public.debt_payments WHERE request_id = '40000000-0000-0000-0000-000000000001') = 1, 'balance=' || (SELECT balance FROM public.customers WHERE id = v_cust));
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, %s, %L, %L)', v_store, v_cust, v_total, 'ငွေသား', '40000000-0000-0000-0000-000000000002'));
  v_rep := v_rep || pg_temp.m8chk('8 payment above the balance is refused', v_err = 'overpayment', v_err);
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 10, %L, %L)', v_store, v_cust, 'Bitcoin', '40000000-0000-0000-0000-000000000003'));
  v_rep := v_rep || pg_temp.m8chk('F payment method must be valid', v_err = 'invalid_payment_method', v_err);
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 10, %L, %L)', v_store, v_cust, 'အကြွေး', '40000000-0000-0000-0000-000000000003'));
  v_rep := v_rep || pg_temp.m8chk('credit is not a way to pay a debt', v_err = 'invalid_payment_method', v_err);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.receive_customer_payment(v_store, v_cust, v_total - 300, 'KBZ Pay', '40000000-0000-0000-0000-000000000004', 'Cashier A');
  v_e2 := (v_r->>'payment_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('9 final KBZ payment clears the balance; KBZPAY debited; drawer untouched',
    (SELECT balance FROM public.customers WHERE id = v_cust) = 0 AND pg_temp.m8acct(v_e2, 'KBZPAY') = v_total - 300
    AND pg_temp.m8exp(v_sh) = v_x0 AND NOT (v_r->>'shift_linked')::boolean, 'balance=' || (SELECT balance FROM public.customers WHERE id = v_cust));
  v_rep := v_rep || pg_temp.m8chk('9 receivable for the credit sale nets to zero after both payments',
    pg_temp.m8acct(v_s6, 'ACCOUNTS_RECEIVABLE') + pg_temp.m8acct(v_e1, 'ACCOUNTS_RECEIVABLE') + pg_temp.m8acct(v_e2, 'ACCOUNTS_RECEIVABLE') = 0,
    'net=' || (pg_temp.m8acct(v_s6, 'ACCOUNTS_RECEIVABLE') + pg_temp.m8acct(v_e1, 'ACCOUNTS_RECEIVABLE') + pg_temp.m8acct(v_e2, 'ACCOUNTS_RECEIVABLE')));
  -- failure after the ledger/balance steps rolls everything back (duplicate cash-movement key)
  PERFORM public.post_sale(v_s7, v_store, v_lines, v_total, 'အကြွေး', v_credit_bd, v_cust2, 'COMPLETED', 'PAID', now(), false, v_sh);
  INSERT INTO public.cash_movements (store_id, shift_id, movement_type, amount, reason, request_id, created_by)
    VALUES (v_store, v_sh, 'SAFE_TO_DRAWER', 1, 'blocker', '40000000-0000-0000-0000-000000000005', v_cashier);
  v_x0 := pg_temp.m8exp(v_sh);
  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE reference_type = 'CUSTOMER_PAYMENT';
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 100, %L, %L)', v_store, v_cust2, 'ငွေသား', '40000000-0000-0000-0000-000000000005'));
  SELECT count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_type = 'CUSTOMER_PAYMENT';
  v_rep := v_rep || pg_temp.m8chk('19 failing customer payment rolls back balance, debt record and ledger',
    v_err <> 'OK' AND (SELECT balance FROM public.customers WHERE id = v_cust2) = v_total AND v_n = v_n2
    AND (SELECT count(*) FROM public.debt_payments WHERE request_id = '40000000-0000-0000-0000-000000000005') = 0, v_err);
  DELETE FROM public.cash_movements WHERE reason = 'blocker' AND shift_id = v_sh;
  -- refund of the credit sale reverses the receivable and the customer's debt
  v_r := public.refund_sale(v_s7, 'credit refund', NULL, 'Cashier A', NULL);
  v_rep := v_rep || pg_temp.m8chk('4 refund of a credit sale: customer debt back to 0, Receivable reversed, REFUND debt record',
    (SELECT balance FROM public.customers WHERE id = v_cust2) = 0 AND pg_temp.m8acct(v_s7, 'ACCOUNTS_RECEIVABLE') = 0
    AND (SELECT count(*) FROM public.debt_payments WHERE party_id = v_cust2 AND method = 'REFUND' AND amount = v_total) = 1,
    'balance=' || (SELECT balance FROM public.customers WHERE id = v_cust2));

  -- ===== open tab payment ==================================================================================================================
  INSERT INTO public.sales (id, store_id, total_amount, payment_method, status, table_number, is_offline_sync)
    VALUES (v_tab, v_store, 2000, 'Unpaid', 'OPEN', 1, false);
  INSERT INTO public.sale_items (sale_id, item_id, quantity, unit_price, conversion) VALUES (v_tab, v_item, 2, 1000, 1);
  v_a := round(2000 * (1 + v_rate / 100.0), 2);
  v_err := pg_temp.m8try(format('UPDATE public.sales SET total_amount = %s WHERE id = %L', v_a, v_tab));
  v_rep := v_rep || pg_temp.m8chk('B open tab total can still be edited by the register', v_err = 'OK', v_err);
  v_err := pg_temp.m8try(format('UPDATE public.sales SET status = %L, payment_status = %L WHERE id = %L', 'COMPLETED', 'PAID', v_tab));
  v_rep := v_rep || pg_temp.m8chk('B direct client UPDATE of a tab to COMPLETED is refused', v_err = 'sale_financial_fields_locked', v_err);
  v_err := pg_temp.m8try(format('SELECT public.pay_open_tab(%L, %s, %L, %L::jsonb, NULL, %L)', v_tab, v_a + 5, 'ငွေသား',
    jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_a + 5))::text, v_sh));
  v_rep := v_rep || pg_temp.m8chk('B tab payment with a wrong total is refused', v_err LIKE '%TOTAL_MISMATCH%', v_err);
  v_err := pg_temp.m8try(format('SELECT public.pay_open_tab(%L, %s, %L, %L::jsonb, NULL, %L)', v_tab, v_a, 'Bitcoin',
    jsonb_build_array(jsonb_build_object('method', 'Bitcoin', 'amount', v_a))::text, v_sh));
  v_rep := v_rep || pg_temp.m8chk('F tab payment with an unknown method is refused', v_err LIKE '%INVALID_PAYMENT_METHOD%', v_err);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.pay_open_tab(v_tab, v_a, 'ငွေသား', jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_a)), NULL, v_sh, 'Cashier A');
  v_rep := v_rep || pg_temp.m8chk('C tab paid in cash: COMPLETED, linked to the shift, drawer +total, ledger balanced, cost snapshot 400/line',
    (SELECT status FROM public.sales WHERE id = v_tab) = 'COMPLETED' AND (SELECT shift_id FROM public.sales WHERE id = v_tab) = v_sh
    AND pg_temp.m8exp(v_sh) = v_x0 + v_a AND pg_temp.m8bal(v_tab) = 0 AND pg_temp.m8acct(v_tab, 'CASH') = v_a
    AND pg_temp.m8acct(v_tab, 'COGS') = 800 AND (SELECT unit_cost FROM public.sale_items WHERE sale_id = v_tab) = 400,
    'expected=' || pg_temp.m8exp(v_sh));
  v_n := pg_temp.m8cnt(v_tab);
  v_r := public.pay_open_tab(v_tab, v_a, 'ငွေသား', jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_a)), NULL, v_sh, 'Cashier A');
  v_rep := v_rep || pg_temp.m8chk('C/10 duplicate tab payment posts nothing twice',
    (v_r->>'already_paid')::boolean AND pg_temp.m8cnt(v_tab) = v_n AND pg_temp.m8exp(v_sh) = v_x0 + v_a, 'ledger rows=' || pg_temp.m8cnt(v_tab));
  v_x0 := pg_temp.m8exp(v_sh); v_stock0 := (SELECT stock_quantity FROM public.items WHERE id = v_item);
  v_r := public.refund_sale(v_tab, 'tab refund', NULL, 'Cashier A', NULL);
  v_rep := v_rep || pg_temp.m8chk('C refund of a paid tab: ledger mirrored, stock returned, drawer -total',
    pg_temp.m8bal(v_tab) = 0 AND pg_temp.m8acct(v_tab, 'CASH') = 0 AND pg_temp.m8acct(v_tab, 'COGS') = 0
    AND (SELECT stock_quantity FROM public.items WHERE id = v_item) = v_stock0 + 2 AND pg_temp.m8exp(v_sh) = v_x0 - v_a,
    'expected=' || pg_temp.m8exp(v_sh));
  -- tab with a credit part
  INSERT INTO public.sales (id, store_id, total_amount, payment_method, status, table_number, is_offline_sync)
    VALUES (v_tab2, v_store, v_total, 'Unpaid', 'OPEN', 2, false);
  INSERT INTO public.sale_items (sale_id, item_id, quantity, unit_price, conversion) VALUES (v_tab2, v_item, 1, 1000, 1);
  v_err := pg_temp.m8try(format('SELECT public.pay_open_tab(%L, %s, %L, %L::jsonb, NULL, %L)', v_tab2, v_total, 'အကြွေး', v_credit_bd::text, v_sh));
  v_rep := v_rep || pg_temp.m8chk('C tab on credit without a customer is refused', v_err LIKE '%CUSTOMER_REQUIRED%', v_err);
  v_r := public.pay_open_tab(v_tab2, v_total, 'ငွေသား',
    jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_half), jsonb_build_object('method', 'အကြွေး', 'amount', v_total - v_half)),
    v_cust, v_sh, 'Cashier A');
  v_rep := v_rep || pg_temp.m8chk('C tab split cash + credit: customer owes the credit part, ledger balanced',
    (SELECT balance FROM public.customers WHERE id = v_cust) = v_total - v_half AND pg_temp.m8bal(v_tab2) = 0
    AND pg_temp.m8acct(v_tab2, 'ACCOUNTS_RECEIVABLE') = v_total - v_half, 'balance=' || (SELECT balance FROM public.customers WHERE id = v_cust));

  -- ===== database guards ======================================================================================================================
  v_err := pg_temp.m8try(format('UPDATE public.customers SET balance = 0 WHERE id = %L', v_cust));
  v_rep := v_rep || pg_temp.m8chk('G direct customer balance change is refused', v_err = 'balance_managed_by_database', v_err);
  v_err := pg_temp.m8try(format('UPDATE public.sales SET status = %L WHERE id = %L', 'REFUNDED', v_s5));
  v_rep := v_rep || pg_temp.m8chk('G direct sale status change is refused', v_err = 'sale_financial_fields_locked', v_err);
  v_err := pg_temp.m8try(format('INSERT INTO public.sales (store_id, total_amount, payment_method, status) VALUES (%L, 10, %L, %L)', v_store, 'ငွေသား', 'COMPLETED'));
  v_rep := v_rep || pg_temp.m8chk('15 fallback/direct COMPLETED sale insert is refused (cannot bypass shift rules or ledger)', v_err = 'direct_sale_insert_not_allowed', v_err);

  -- ===== 15 require_shift is enforced for every path ====================================================================================
  UPDATE public.stores SET require_shift = true WHERE id = v_store;
  INSERT INTO public.sales (id, store_id, total_amount, payment_method, status, table_number, is_offline_sync)
    VALUES (v_tab_other, v_store, 1000, 'Unpaid', 'OPEN', 3, false);
  INSERT INTO public.sale_items (sale_id, item_id, quantity, unit_price, conversion) VALUES (v_tab_other, v_item, 1, 1000, 1);
  v_err := pg_temp.m8try(format('SELECT public.pay_open_tab(%L, %s, %L, %L::jsonb, NULL, NULL)', v_tab_other, v_total, 'ငွေသား', v_cash_bd::text));
  v_rep := v_rep || pg_temp.m8chk('15 tab payment without a shift is refused when a shift is required', v_err LIKE '%SHIFT_REQUIRED%', v_err);
  PERFORM public.close_shift(v_sh, pg_temp.m8exp(v_sh), NULL, 'Cashier A');
  PERFORM public.post_sale(v_s8, v_store, v_lines, v_total, 'ငွေသား', v_cash_bd, NULL, 'COMPLETED', 'PAID', now() - interval '1 hour', true, NULL);
  v_err := pg_temp.m8try(format('SELECT public.refund_sale(%L, %L)', v_s8, 'no shift'));
  v_rep := v_rep || pg_temp.m8chk('15 cash refund without an open shift is refused when a shift is required', v_err = 'shift_required', v_err);
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 10, %L, %L)', v_store, v_cust, 'ငွေသား', '40000000-0000-0000-0000-000000000006'));
  v_rep := v_rep || pg_temp.m8chk('15 cash customer payment without an open shift is refused when a shift is required', v_err = 'shift_required', v_err);
  v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 10, %L, %L)', v_store, v_cust, 'KBZ Pay', '40000000-0000-0000-0000-000000000007'));
  v_rep := v_rep || pg_temp.m8chk('15 digital customer payment needs no shift', v_err = 'OK', v_err);
  v_rep := v_rep || pg_temp.m8chk('16 offline sale is never lost when a shift is required (saved unlinked)',
    (SELECT status FROM public.sales WHERE id = v_s8) = 'COMPLETED' AND (SELECT shift_id FROM public.sales WHERE id = v_s8) IS NULL, 'saved');
  UPDATE public.stores SET require_shift = false WHERE id = v_store;
  v_sh_old := v_sh;
  v_sh := (public.open_shift(v_store, 500, '10000000-0000-0000-0000-0000000000a2', 'Cashier A')->>'shift_id')::uuid;
  PERFORM public.post_sale(gen_random_uuid(), v_store, v_lines, v_total, 'ငွေသား', v_cash_bd, NULL, 'COMPLETED', 'PAID', now() + interval '1 second', true, v_sh);
  PERFORM public.post_sale(gen_random_uuid(), v_store, v_lines, v_total, 'ငွေသား', v_cash_bd, NULL, 'COMPLETED', 'PAID', now() - interval '3 hours', true, v_sh);
  SELECT count(*) INTO v_n FROM public.sales WHERE shift_id = v_sh;
  v_rep := v_rep || pg_temp.m8chk('16 offline sync links only a sale made while the shift was open',
    v_n = 1, 'linked rows=' || v_n);

  -- ===== cash movement classification (E) ===================================================================================================
  v_x0 := pg_temp.m8exp(v_sh);
  v_err := pg_temp.m8try(format('SELECT public.record_cash_movement(%L, %L, 10, %L, %L)', v_sh, 'CASH_IN', 'old type', '50000000-0000-0000-0000-000000000001'));
  v_rep := v_rep || pg_temp.m8chk('E generic CASH_IN is no longer accepted', v_err = 'use_specific_movement_type', v_err);
  v_err := pg_temp.m8try(format('SELECT public.record_cash_movement(%L, %L, 100, %L, %L)', v_sh, 'OWNER_CONTRIBUTION', 'cashier tries', '50000000-0000-0000-0000-000000000002'));
  v_rep := v_rep || pg_temp.m8chk('18 a cashier cannot book an owner contribution', v_err = 'not_authorized', v_err);
  v_r := public.record_cash_movement(v_sh, 'SAFE_TO_DRAWER', 200, 'float from safe', '50000000-0000-0000-0000-000000000003', 'Cashier A');
  v_mv := (v_r->>'movement_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('E safe->drawer: drawer +200, NO ledger rows (no equity, no revenue)',
    pg_temp.m8exp(v_sh) = v_x0 + 200 AND pg_temp.m8cnt(v_mv) = 0, 'expected=' || pg_temp.m8exp(v_sh));
  v_r := public.record_cash_movement(v_sh, 'CASH_DROP', 150, 'drop to safe', '50000000-0000-0000-0000-000000000004', 'Cashier A');
  v_mv := (v_r->>'movement_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('E cash drop: drawer -150, NO ledger rows',
    pg_temp.m8exp(v_sh) = v_x0 + 50 AND pg_temp.m8cnt(v_mv) = 0, 'expected=' || pg_temp.m8exp(v_sh));
  PERFORM pg_temp.m8as(v_owner);
  v_r := public.record_cash_movement(v_sh, 'OWNER_CONTRIBUTION', 300, 'owner adds capital', '50000000-0000-0000-0000-000000000005', 'Owner');
  v_mv := (v_r->>'movement_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('E owner contribution: Dr CASH / Cr OWNER_EQUITY, drawer +300, balanced',
    pg_temp.m8acct(v_mv, 'CASH') = 300 AND pg_temp.m8acct(v_mv, 'OWNER_EQUITY') = -300 AND pg_temp.m8exp(v_sh) = v_x0 + 350, 'expected=' || pg_temp.m8exp(v_sh));
  v_r := public.record_cash_movement(v_sh, 'OWNER_WITHDRAWAL', 100, 'owner draws', '50000000-0000-0000-0000-000000000006', 'Owner');
  v_mv := (v_r->>'movement_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('E owner withdrawal: Dr OWNER_EQUITY / Cr CASH, drawer -100',
    pg_temp.m8acct(v_mv, 'CASH') = -100 AND pg_temp.m8acct(v_mv, 'OWNER_EQUITY') = 100 AND pg_temp.m8exp(v_sh) = v_x0 + 250, 'expected=' || pg_temp.m8exp(v_sh));
  SELECT count(*) INTO v_n FROM public.ledger_entries
   WHERE reference_id IN (SELECT id FROM public.cash_movements WHERE shift_id = v_sh AND movement_type IN ('SAFE_TO_DRAWER', 'CASH_DROP'));
  v_rep := v_rep || pg_temp.m8chk('14 internal transfers created no revenue / equity / ledger rows at all', v_n = 0, 'rows=' || v_n);

  -- ===== expenses: cash/non-cash, correction (D) =================================================================================================
  PERFORM pg_temp.m8as(v_cashier);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.record_expense(v_store, '60000000-0000-0000-0000-000000000001', 'Tea', 100, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_e1 := (v_r->>'expense_id')::uuid;
  v_r := public.record_expense(v_store, '60000000-0000-0000-0000-000000000001', 'Tea', 100, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_rep := v_rep || pg_temp.m8chk('11 cash expense: drawer -100 once, ledger 2 rows once even after a retry',
    pg_temp.m8exp(v_sh) = v_x0 - 100 AND pg_temp.m8cnt(v_e1) = 2 AND (v_r->>'duplicate')::boolean
    AND (SELECT count(*) FROM public.expenses WHERE request_id = '60000000-0000-0000-0000-000000000001') = 1, 'expected=' || pg_temp.m8exp(v_sh));
  PERFORM pg_temp.m8as(v_owner);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.record_expense(v_store, '60000000-0000-0000-0000-000000000002', 'Fee', 50, 'x', 'KBZ Pay', now(), NULL, 'Owner');
  v_e2 := (v_r->>'expense_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('12 non-cash expense: KBZPAY credited, drawer unchanged', pg_temp.m8acct(v_e2, 'KBZPAY') = -50 AND pg_temp.m8exp(v_sh) = v_x0, 'expected=' || pg_temp.m8exp(v_sh));
  -- legacy expense (client-posted, no request id) with its own ledger rows
  INSERT INTO public.expenses (id, store_id, category, amount, paid_with, note) VALUES (v_leg, v_store, 'Rent', 700, 'ငွေသား', 'legacy');
  INSERT INTO public.ledger_entries (store_id, account, direction, amount, reference_type, reference_id, memo)
    VALUES (v_store, 'OPERATING_EXPENSE', 'DEBIT', 700, 'EXPENSE', v_leg, 'Rent'), (v_store, 'CASH', 'CREDIT', 700, 'EXPENSE', v_leg, 'Rent');
  v_err := pg_temp.m8try(format('DELETE FROM public.expenses WHERE id = %L', v_leg));
  v_rep := v_rep || pg_temp.m8chk('D legacy expense can no longer be deleted', v_err = 'expense_immutable', v_err);
  v_err := pg_temp.m8try(format('UPDATE public.expenses SET amount = 1 WHERE id = %L', v_leg));
  v_rep := v_rep || pg_temp.m8chk('D legacy expense amount can no longer be edited in place', v_err = 'expense_immutable', v_err);
  v_err := pg_temp.m8try(format('UPDATE public.expenses SET note = %L WHERE id = %L', 'fixed wording', v_leg));
  v_rep := v_rep || pg_temp.m8chk('D legacy expense wording (note) can still be corrected', v_err = 'OK', v_err);
  PERFORM pg_temp.m8as(v_cashier);
  v_err := pg_temp.m8try(format('SELECT public.void_expense(%L, %L, %L)', v_leg, 'cashier tries', '60000000-0000-0000-0000-000000000010'));
  v_rep := v_rep || pg_temp.m8chk('18 a cashier cannot void an expense', v_err = 'not_authorized', v_err);
  v_err := pg_temp.m8try(format('SELECT public.replace_expense(%L, %L, %L, %L, %L, 5, NULL, %L)', v_leg, '60000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000012', 'x', 'Rent', 'ငွေသား'));
  v_rep := v_rep || pg_temp.m8chk('18 a cashier cannot replace an expense', v_err = 'not_authorized', v_err);
  IF v_other_owner IS NOT NULL THEN
    PERFORM pg_temp.m8as(v_other_owner);
    v_err := pg_temp.m8try(format('SELECT public.void_expense(%L, %L, %L)', v_leg, 'other store', '60000000-0000-0000-0000-000000000013'));
    v_rep := v_rep || pg_temp.m8chk('17 another store''s owner cannot void this store''s expense', v_err = 'not_authorized', v_err);
    v_err := pg_temp.m8try(format('SELECT public.refund_sale(%L, %L)', v_s5, 'other store'));
    v_rep := v_rep || pg_temp.m8chk('17 another store''s owner cannot refund this store''s sale', v_err = 'not_authorized', v_err);
    v_err := pg_temp.m8try(format('SELECT public.receive_customer_payment(%L, %L, 10, %L, %L)', v_store, v_cust, 'KBZ Pay', '60000000-0000-0000-0000-000000000014'));
    v_rep := v_rep || pg_temp.m8chk('17 another store''s owner cannot take a payment for this store''s customer', v_err = 'not_authorized', v_err);
    v_err := pg_temp.m8try(format('SELECT public.pay_open_tab(%L, %s, %L, %L::jsonb)', v_tab_other, v_total, 'ငွေသား', v_cash_bd::text));
    v_rep := v_rep || pg_temp.m8chk('17 another store''s owner cannot pay this store''s tab', v_err LIKE '%ACCESS_DENIED%', v_err);
  ELSE
    v_rep := v_rep || E'\nSKIP 17 cross-store function checks | no second store with a different owner';
  END IF;
  PERFORM pg_temp.m8as(NULL);
  v_err := pg_temp.m8try(format('SELECT public.refund_sale(%L, %L)', v_s5, 'anon'));
  v_rep := v_rep || pg_temp.m8chk('18 unauthenticated refund refused', v_err = 'not_authenticated', v_err);

  PERFORM pg_temp.m8as(v_owner);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.void_expense(v_leg, 'entered twice', '60000000-0000-0000-0000-000000000020', 'Owner');
  v_rep := v_rep || pg_temp.m8chk('13 void keeps the row, marks it voided, reverses its ledger (net 0, balanced)',
    (SELECT voided_at FROM public.expenses WHERE id = v_leg) IS NOT NULL AND (SELECT void_reason FROM public.expenses WHERE id = v_leg) = 'entered twice'
    AND pg_temp.m8cnt(v_leg, 'EXPENSE') = 2 AND pg_temp.m8cnt(v_leg, 'EXPENSE_VOID') = 2
    AND pg_temp.m8acct(v_leg, 'OPERATING_EXPENSE') = 0 AND pg_temp.m8acct(v_leg, 'CASH') = 0 AND pg_temp.m8bal(v_leg) = 0,
    'rows=' || pg_temp.m8cnt(v_leg));
  v_n := pg_temp.m8cnt(v_leg);
  v_r := public.void_expense(v_leg, 'entered twice', '60000000-0000-0000-0000-000000000020', 'Owner');
  v_rep := v_rep || pg_temp.m8chk('13 voiding twice changes nothing', (v_r->>'already_voided')::boolean AND pg_temp.m8cnt(v_leg) = v_n, 'rows=' || pg_temp.m8cnt(v_leg));
  v_err := pg_temp.m8try(format('UPDATE public.expenses SET note = %L WHERE id = %L', 'edit voided', v_leg));
  v_rep := v_rep || pg_temp.m8chk('13 a voided expense is frozen', v_err = 'expense_immutable', v_err);
  -- void of a DRAWER expense puts the cash back (original shift still open)
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.void_expense(v_e1, 'wrong shop', '60000000-0000-0000-0000-000000000021', 'Owner');
  v_rep := v_rep || pg_temp.m8chk('13/11 voiding a drawer expense: EXPENSE_VOID +100 in the shift, ledger reversed',
    pg_temp.m8exp(v_sh) = v_x0 + 100 AND pg_temp.m8bal(v_e1) = 0 AND pg_temp.m8acct(v_e1, 'CASH') = 0
    AND (SELECT count(*) FROM public.cash_movements WHERE expense_id = v_e1 AND movement_type = 'EXPENSE_VOID') = 1, 'expected=' || pg_temp.m8exp(v_sh));
  -- void of a non-cash expense: ledger only
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.void_expense(v_e2, 'wrong account', '60000000-0000-0000-0000-000000000022', 'Owner');
  v_rep := v_rep || pg_temp.m8chk('13/12 voiding a non-cash expense reverses KBZPAY, drawer untouched',
    pg_temp.m8acct(v_e2, 'KBZPAY') = 0 AND pg_temp.m8exp(v_sh) = v_x0, 'expected=' || pg_temp.m8exp(v_sh));
  -- replacement in one transaction
  PERFORM pg_temp.m8as(v_cashier);
  v_r := public.record_expense(v_store, '60000000-0000-0000-0000-000000000003', 'Gas', 120, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_e3 := (v_r->>'expense_id')::uuid;
  PERFORM pg_temp.m8as(v_owner);
  v_x0 := pg_temp.m8exp(v_sh);
  v_r := public.replace_expense(v_e3, '60000000-0000-0000-0000-000000000030', '60000000-0000-0000-0000-000000000031', 'amount typo', 'Gas', 100, 'n', 'ငွေသား', now(), v_sh, 'Owner');
  v_e4 := (v_r->>'expense_id')::uuid;
  v_rep := v_rep || pg_temp.m8chk('13 correction = void + replacement: old kept & linked, new carries the right amount, drawer net -100',
    (SELECT replaced_by FROM public.expenses WHERE id = v_e3) = v_e4 AND (SELECT replaces_expense_id FROM public.expenses WHERE id = v_e4) = v_e3
    AND (SELECT voided_at FROM public.expenses WHERE id = v_e3) IS NOT NULL AND (SELECT amount FROM public.expenses WHERE id = v_e4) = 100
    AND pg_temp.m8bal(v_e3) = 0 AND pg_temp.m8acct(v_e3, 'OPERATING_EXPENSE') = 0 AND pg_temp.m8acct(v_e4, 'OPERATING_EXPENSE') = 100
    AND pg_temp.m8exp(v_sh) = v_x0 + 120 - 100, 'expected=' || pg_temp.m8exp(v_sh));
  v_n := pg_temp.m8cnt(v_e4);
  v_r := public.replace_expense(v_e3, '60000000-0000-0000-0000-000000000030', '60000000-0000-0000-0000-000000000031', 'amount typo', 'Gas', 100, 'n', 'ငွေသား', now(), v_sh, 'Owner');
  v_rep := v_rep || pg_temp.m8chk('10 retrying the correction creates nothing new', (v_r->>'duplicate')::boolean AND pg_temp.m8cnt(v_e4) = v_n
    AND (SELECT count(*) FROM public.expenses WHERE replaces_expense_id = v_e3) = 1, 'rows=' || pg_temp.m8cnt(v_e4));
  -- failing replacement leaves the original untouched
  PERFORM pg_temp.m8as(v_cashier);
  v_r := public.record_expense(v_store, '60000000-0000-0000-0000-000000000004', 'Ink', 30, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_e1 := (v_r->>'expense_id')::uuid;
  PERFORM pg_temp.m8as(v_owner);
  v_x0 := pg_temp.m8exp(v_sh); v_n := pg_temp.m8cnt(v_e1);
  v_err := pg_temp.m8try(format('SELECT public.replace_expense(%L, %L, %L, %L, %L, 0, NULL, %L)', v_e1, '60000000-0000-0000-0000-000000000040', '60000000-0000-0000-0000-000000000041', 'bad', 'Ink', 'ငွေသား'));
  v_rep := v_rep || pg_temp.m8chk('19 failing replacement rolls the void back too',
    v_err = 'invalid_amount' AND (SELECT voided_at FROM public.expenses WHERE id = v_e1) IS NULL AND pg_temp.m8cnt(v_e1) = v_n AND pg_temp.m8exp(v_sh) = v_x0, v_err);

  -- ===== consistency: independent recomputation of expected cash ====================================================================================
  SELECT COALESCE(sum(amt) FILTER (WHERE acct = 'CASH'), 0) INTO v_a FROM (
    SELECT public.payment_account(COALESCE(NULLIF(b.value->>'method', ''), s.payment_method)) AS acct, (b.value->>'amount')::numeric AS amt
      FROM public.sales s, jsonb_array_elements(s.payment_breakdown) b(value)
     WHERE s.shift_id = v_sh AND s.status IN ('COMPLETED', 'REFUNDED')) q;
  SELECT 500 + v_a
       + COALESCE(sum(amount) FILTER (WHERE movement_type IN ('CASH_IN', 'OWNER_CONTRIBUTION', 'SAFE_TO_DRAWER', 'CUSTOMER_PAYMENT', 'EXPENSE_VOID')), 0)
       - COALESCE(sum(amount) FILTER (WHERE movement_type IN ('CASH_OUT', 'OWNER_WITHDRAWAL', 'CASH_DROP', 'EXPENSE_PAID', 'REFUND_PAID')), 0)
    INTO v_b FROM public.cash_movements WHERE shift_id = v_sh;
  v_rep := v_rep || pg_temp.m8chk('9 expected cash equals an independent recomputation from sales and movements',
    pg_temp.m8exp(v_sh) = v_b, 'function=' || pg_temp.m8exp(v_sh) || ' independent=' || v_b);
  -- every ledger reference created in this run balances
  SELECT count(*) INTO v_n FROM (
    SELECT reference_id FROM public.ledger_entries WHERE id NOT IN (SELECT id FROM m8_le)
     GROUP BY reference_id HAVING sum(CASE direction WHEN 'DEBIT' THEN amount ELSE -amount END) <> 0) q;
  v_rep := v_rep || pg_temp.m8chk('ledger: every reference created in this run is balanced', v_n = 0, 'unbalanced references=' || v_n);

  -- ===== 20 history unchanged ====================================================================================================================================
  SELECT (SELECT count(*) FROM (SELECT * FROM m8_si EXCEPT SELECT id, unit_cost FROM public.sale_items) a)
       + (SELECT count(*) FROM (SELECT * FROM m8_ex EXCEPT SELECT id, amount, paid_with FROM public.expenses) b)
       + (SELECT count(*) FROM (SELECT * FROM m8_le EXCEPT SELECT id, account, direction, amount FROM public.ledger_entries) c)
       + (SELECT count(*) FROM (SELECT * FROM m8_sa EXCEPT SELECT id, total_amount, status FROM public.sales) d)
    INTO v_n;
  v_rep := v_rep || pg_temp.m8chk('20 existing sale_items / expenses / ledger / sales rows unchanged', v_n = 0, 'changed rows=' || v_n);

  RAISE EXCEPTION E'M8 CHECK REPORT (everything rolled back):%', v_rep;
END
$$;
