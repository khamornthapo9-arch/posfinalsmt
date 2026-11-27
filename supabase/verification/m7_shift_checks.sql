-- M7 verification: cashier shifts, cash movements, expenses, review, sale linking.
--
-- SAFE ON LIVE DATA: one DO block creates its own test items/shifts/sales/expenses in an existing
-- store and ALWAYS ends by raising an exception, which rolls EVERYTHING back (including temporary
-- store memberships and a temporary require_shift switch). The exception text is the report:
-- PASS / FAIL / SKIP lines. Run it AFTER the M7 migration, in the Supabase SQL editor.
--
-- It uses the first store that has an owner (set v_store to choose one). Manager = the store owner.
-- Cashier = an active CASHIER member of that store, or, when there is none, another existing user of
-- your project temporarily added as CASHIER (rolled back). Needs at least 2 users and 2 stores for
-- the cross-store checks; otherwise those lines are reported as SKIP.
-- Note: the SQL editor bypasses row-level security, so these checks prove the FUNCTION rules and
-- triggers; the read-only RLS policies are covered by the manual matrix.

CREATE OR REPLACE FUNCTION pg_temp.m7as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END, true);
END $$;

-- Runs one statement; returns 'OK' or the error message.
CREATE OR REPLACE FUNCTION pg_temp.m7try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN 'OK';
EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $$;

CREATE OR REPLACE FUNCTION pg_temp.m7chk(p_name text, p_ok boolean, p_detail text) RETURNS text LANGUAGE sql AS $$
  SELECT E'\n' || CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END || ' ' || p_name || ' | ' || COALESCE(p_detail, '')
$$;

DO $$
DECLARE
  v_store uuid := NULL;                      -- NULL = auto-pick
  v_owner uuid; v_cashier uuid; v_other uuid; v_other_owner uuid;
  v_rate numeric := 0; v_total numeric;
  v_item uuid := gen_random_uuid();
  v_rep text := ''; v_err text; v_r jsonb; v_s jsonb;
  v_sh uuid; v_sh2 uuid; v_sh_other uuid; v_sale uuid; v_sale2 uuid; v_sale3 uuid; v_exp uuid;
  v_n bigint; v_n2 bigint; v_a numeric; v_b numeric; v_exp0 numeric; v_t0 timestamptz;
  v_tmpmember boolean := false; v_old_role public.app_role;
  v_lines jsonb; v_status text; v_rev text; v_cl uuid; v_c numeric; v_d numeric; v_e numeric; v_sh3 uuid;
  v_sale4 uuid := gen_random_uuid(); v_sale5 uuid := gen_random_uuid(); v_sale6 uuid := gen_random_uuid();
BEGIN
  -- ----- setup -----------------------------------------------------------------------------------
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
  -- another store the cashier does NOT belong to
  SELECT id, owner_id INTO v_other, v_other_owner FROM public.stores s
   WHERE s.id <> v_store AND s.owner_id IS NOT NULL AND s.owner_id <> COALESCE(v_cashier, v_owner)
     AND NOT EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = s.id AND m.user_id = v_cashier)
   ORDER BY s.id LIMIT 1;

  -- snapshots for the "history unchanged" check
  CREATE TEMP TABLE m7_si ON COMMIT DROP AS SELECT id, unit_cost FROM public.sale_items;
  CREATE TEMP TABLE m7_ex ON COMMIT DROP AS SELECT id, amount, paid_with FROM public.expenses;
  CREATE TEMP TABLE m7_le ON COMMIT DROP AS SELECT id, account, direction, amount FROM public.ledger_entries;
  CREATE TEMP TABLE m7_sa ON COMMIT DROP AS SELECT id, total_amount, status FROM public.sales;

  INSERT INTO public.items (id, store_id, sku, name, price, stock_quantity, cost_price)
    VALUES (v_item, v_store, 'M7T-' || v_item, 'M7 test item', 1000, 1000, 400);
  v_total := round(1000 * (1 + v_rate / 100.0), 2);
  v_lines := jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 1, 'unit_price', 1000, 'conversion', 1));

  IF v_cashier IS NULL THEN
    v_rep := v_rep || pg_temp.m7chk('SETUP', false, 'need a second user for the cashier checks');
    RAISE EXCEPTION E'M7 CHECK REPORT (everything rolled back):%', v_rep;
  END IF;

  -- ----- 1/2 open shift; authorization -----------------------------------------------------------
  PERFORM pg_temp.m7as(v_cashier);
  v_r := public.open_shift(v_store, 1000, '10000000-0000-0000-0000-000000000001', 'Cashier A');
  v_sh := (v_r->>'shift_id')::uuid;
  SELECT opening_cash, opened_by, status INTO v_a, v_exp, v_err FROM public.cashier_shifts WHERE id = v_sh;
  v_rep := v_rep || pg_temp.m7chk('1 cashier opens shift with opening cash',
    v_a = 1000 AND v_exp = v_cashier AND v_err = 'OPEN' AND (v_r->>'duplicate')::boolean = false,
    'opening=' || v_a || ' status=' || v_err);
  v_r := public.open_shift(v_store, 1000, '10000000-0000-0000-0000-000000000001', 'Cashier A');
  SELECT count(*) INTO v_n FROM public.cashier_shifts WHERE store_id = v_store AND opened_by = v_cashier;
  v_rep := v_rep || pg_temp.m7chk('13 duplicate open request does not create a second shift',
    (v_r->>'duplicate')::boolean AND (v_r->>'shift_id')::uuid = v_sh AND v_n = 1, 'rows=' || v_n);
  v_err := pg_temp.m7try(format('SELECT public.open_shift(%L, 500, %L)', v_store, '10000000-0000-0000-0000-000000000002'));
  v_rep := v_rep || pg_temp.m7chk('one open shift per account/store', v_err = 'shift_already_open', v_err);
  IF v_other IS NOT NULL THEN
    v_err := pg_temp.m7try(format('SELECT public.open_shift(%L, 500, %L)', v_other, '10000000-0000-0000-0000-000000000003'));
    v_rep := v_rep || pg_temp.m7chk('2/16 cashier cannot open a shift in another store', v_err = 'not_authorized', v_err);
  ELSE
    v_rep := v_rep || E'\nSKIP 2/16 cross-store open | no second store available';
  END IF;
  PERFORM pg_temp.m7as(NULL);
  v_err := pg_temp.m7try(format('SELECT public.open_shift(%L, 5, %L)', v_store, '10000000-0000-0000-0000-000000000004'));
  v_rep := v_rep || pg_temp.m7chk('unauthenticated cannot open', v_err = 'not_authenticated', v_err);

  -- ----- 3/4/5 sales linked; cash vs non-cash ------------------------------------------------------
  PERFORM pg_temp.m7as(v_cashier);
  v_sale := gen_random_uuid(); v_sale2 := gen_random_uuid(); v_sale3 := gen_random_uuid();
  v_r := public.post_sale(v_sale, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  SELECT shift_id INTO v_sh2 FROM public.sales WHERE id = v_sale;
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('3 completed sale is linked to the active shift',
    v_sh2 = v_sh AND (v_r->>'shift_linked')::boolean, 'shift_linked=' || (v_r->>'shift_linked'));
  v_rep := v_rep || pg_temp.m7chk('4 cash sale increases expected drawer cash',
    (v_s->>'cash_sales')::numeric = v_total AND (v_s->>'expected_cash')::numeric = 1000 + v_total,
    'cash_sales=' || (v_s->>'cash_sales') || ' expected=' || (v_s->>'expected_cash'));
  v_exp0 := (v_s->>'expected_cash')::numeric;
  PERFORM public.post_sale(v_sale2, v_store, v_lines, v_total, 'KBZ Pay',
          jsonb_build_array(jsonb_build_object('method', 'KBZ Pay', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('5 non-cash sale does not increase drawer cash',
    (v_s->>'expected_cash')::numeric = v_exp0 AND (v_s->>'kbzpay_sales')::numeric = v_total,
    'expected=' || (v_s->>'expected_cash') || ' kbz=' || (v_s->>'kbzpay_sales'));
  PERFORM public.post_sale(v_sale3, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', round(v_total / 2, 2)),
                            jsonb_build_object('method', 'Wave Pay', 'amount', v_total - round(v_total / 2, 2))),
          NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('split payment counts only its cash part',
    (v_s->>'expected_cash')::numeric = v_exp0 + round(v_total / 2, 2) AND (v_s->>'wavepay_sales')::numeric = v_total - round(v_total / 2, 2),
    'expected=' || (v_s->>'expected_cash'));
  v_exp0 := (v_s->>'expected_cash')::numeric;
  v_r := public.post_sale(v_sale, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now(), false, v_sh);
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('13 duplicate sale request is not counted twice',
    (v_r->>'already_posted')::boolean AND (v_s->>'expected_cash')::numeric = v_exp0, 'expected=' || (v_s->>'expected_cash'));

  -- ----- 6/7 expenses ----------------------------------------------------------------------------------
  v_r := public.record_expense(v_store, '20000000-0000-0000-0000-000000000001', 'Tea', 100, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_exp := (v_r->>'expense_id')::uuid;
  v_s := public.get_shift_summary(v_sh);
  SELECT count(*) INTO v_n FROM public.cash_movements WHERE shift_id = v_sh AND movement_type = 'EXPENSE_PAID' AND expense_id = v_exp;
  SELECT COALESCE(sum(amount) FILTER (WHERE direction = 'DEBIT'), 0), COALESCE(sum(amount) FILTER (WHERE direction = 'CREDIT'), 0)
    INTO v_a, v_b FROM public.ledger_entries WHERE reference_type = 'EXPENSE' AND reference_id = v_exp;
  v_rep := v_rep || pg_temp.m7chk('6 cash expense reduces expected cash exactly once',
    (v_s->>'expected_cash')::numeric = v_exp0 - 100 AND v_n = 1 AND v_a = 100 AND v_b = 100,
    'expected=' || (v_s->>'expected_cash') || ' movements=' || v_n || ' ledger=' || v_a || '/' || v_b);
  v_r := public.record_expense(v_store, '20000000-0000-0000-0000-000000000001', 'Tea', 100, 'n', 'ငွေသား', now(), v_sh, 'Cashier A');
  v_s := public.get_shift_summary(v_sh);
  SELECT count(*) INTO v_n FROM public.expenses WHERE request_id = '20000000-0000-0000-0000-000000000001' AND store_id = v_store;
  SELECT count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_type = 'EXPENSE' AND reference_id = v_exp;
  v_rep := v_rep || pg_temp.m7chk('13 duplicate expense request: one expense, one movement, 2 ledger rows',
    (v_r->>'duplicate')::boolean AND v_n = 1 AND v_n2 = 2 AND (v_s->>'expected_cash')::numeric = v_exp0 - 100,
    'expenses=' || v_n || ' ledger=' || v_n2);
  v_exp0 := v_exp0 - 100;
  v_err := pg_temp.m7try(format('SELECT public.record_expense(%L, %L, %L, 50, %L, %L, now(), NULL, NULL)',
    v_store, '20000000-0000-0000-0000-000000000002', 'Fee', 'x', 'KBZ Pay'));
  v_rep := v_rep || pg_temp.m7chk('7 non-cash expense needs a manager (cashier refused)', v_err = 'not_authorized', v_err);
  v_err := pg_temp.m7try(format('SELECT public.record_expense(%L, %L, %L, 50, %L, %L, now(), %L, NULL)',
    v_store, '20000000-0000-0000-0000-000000000003', 'Fee', 'x', 'KBZ Pay', v_sh));
  v_rep := v_rep || pg_temp.m7chk('7 non-cash expense cannot be taken from the drawer', v_err = 'drawer_requires_cash', v_err);
  PERFORM pg_temp.m7as(v_owner);
  v_r := public.record_expense(v_store, '20000000-0000-0000-0000-000000000004', 'Fee', 50, 'x', 'KBZ Pay', now(), NULL, 'Owner');
  v_exp := (v_r->>'expense_id')::uuid;
  v_s := public.get_shift_summary(v_sh);
  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE reference_type = 'EXPENSE' AND reference_id = v_exp AND account = 'KBZPAY' AND direction = 'CREDIT';
  SELECT count(*) INTO v_n2 FROM public.cash_movements WHERE expense_id = v_exp;
  v_rep := v_rep || pg_temp.m7chk('7 non-cash expense: KBZPAY credited, drawer untouched',
    v_n = 1 AND v_n2 = 0 AND (v_s->>'expected_cash')::numeric = v_exp0, 'kbz_rows=' || v_n || ' movements=' || v_n2);
  v_err := pg_temp.m7try(format('UPDATE public.expenses SET amount = 1 WHERE id = %L', v_exp));
  v_rep := v_rep || pg_temp.m7chk('expense created by the function is immutable', v_err = 'expense_immutable', v_err);
  PERFORM pg_temp.m7as(v_cashier);

  -- ----- 8 cash in / out / drop with audit trail -----------------------------------------------------
  v_r := public.record_cash_movement(v_sh, 'CASH_IN', 200, 'float top-up', '30000000-0000-0000-0000-000000000001', 'Cashier A');
  v_r := public.record_cash_movement(v_sh, 'CASH_OUT', 50, 'bank run', '30000000-0000-0000-0000-000000000002', 'Cashier A');
  v_r := public.record_cash_movement(v_sh, 'CASH_DROP', 100, 'safe drop', '30000000-0000-0000-0000-000000000003', 'Cashier A');
  SELECT count(*) INTO v_n FROM public.cash_movements
   WHERE shift_id = v_sh AND created_by = v_cashier AND store_id = v_store AND reason <> '' AND created_at IS NOT NULL
     AND movement_type IN ('CASH_IN', 'CASH_OUT', 'CASH_DROP');
  SELECT count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_type = 'CASH_MOVEMENT'
   AND reference_id IN (SELECT id FROM public.cash_movements WHERE shift_id = v_sh);
  v_rep := v_rep || pg_temp.m7chk('8 cash in/out/drop recorded with reason, user, store, shift, time',
    v_n = 3, 'rows=' || v_n);
  v_rep := v_rep || pg_temp.m7chk('8 ledger: in/out post 2 rows each, drop posts none', v_n2 = 4, 'ledger rows=' || v_n2);
  SELECT COALESCE(sum(amount) FILTER (WHERE direction = 'DEBIT'), 0) - COALESCE(sum(amount) FILTER (WHERE direction = 'CREDIT'), 0)
    INTO v_a FROM public.ledger_entries WHERE reference_type = 'CASH_MOVEMENT' AND reference_id IN (SELECT id FROM public.cash_movements WHERE shift_id = v_sh);
  v_rep := v_rep || pg_temp.m7chk('balanced ledger for cash movements', v_a = 0, 'debit-credit=' || v_a);
  v_r := public.record_cash_movement(v_sh, 'CASH_IN', 200, 'float top-up', '30000000-0000-0000-0000-000000000001', 'Cashier A');
  SELECT count(*) INTO v_n FROM public.cash_movements WHERE shift_id = v_sh AND movement_type = 'CASH_IN';
  v_rep := v_rep || pg_temp.m7chk('13 duplicate cash movement request ignored', (v_r->>'duplicate')::boolean AND v_n = 1, 'cash_in rows=' || v_n);
  v_err := pg_temp.m7try(format('SELECT public.record_cash_movement(%L, %L, 999999, %L, %L)', v_sh, 'CASH_OUT', 'too much', '30000000-0000-0000-0000-000000000009'));
  v_rep := v_rep || pg_temp.m7chk('no negative drawer: cash out above expected refused', v_err = 'insufficient_drawer_cash', v_err);
  v_err := pg_temp.m7try(format('SELECT public.record_cash_movement(%L, %L, 5, %L, %L)', v_sh, 'CASH_OUT', '  ', '30000000-0000-0000-0000-00000000000a'));
  v_rep := v_rep || pg_temp.m7chk('reason is required', v_err = 'reason_required', v_err);

  -- ----- 14 failure rolls back related changes ---------------------------------------------------------
  v_s := public.get_shift_summary(v_sh); v_exp0 := (v_s->>'expected_cash')::numeric;
  BEGIN
    PERFORM public.record_expense(v_store, '20000000-0000-0000-0000-0000000000f1', 'Rollback', 10, 'x', 'ငွေသား', now(), v_sh, NULL);
    RAISE EXCEPTION 'forced failure after the function returned';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT count(*) INTO v_n FROM public.expenses WHERE request_id = '20000000-0000-0000-0000-0000000000f1';
  SELECT count(*) INTO v_n2 FROM public.cash_movements WHERE request_id = '20000000-0000-0000-0000-0000000000f1';
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('14 failure midway rolls back expense + movement + ledger together',
    v_n = 0 AND v_n2 = 0 AND (v_s->>'expected_cash')::numeric = v_exp0, 'expenses=' || v_n || ' movements=' || v_n2);
  v_err := pg_temp.m7try(format('SELECT public.record_expense(%L, %L, %L, 999999, NULL, %L, now(), %L, NULL)',
    v_store, '20000000-0000-0000-0000-0000000000f2', 'Big', 'ငွေသား', v_sh));
  SELECT count(*) INTO v_n FROM public.expenses WHERE request_id = '20000000-0000-0000-0000-0000000000f2';
  v_rep := v_rep || pg_temp.m7chk('drawer expense above expected cash refused, nothing written', v_err = 'insufficient_drawer_cash' AND v_n = 0, v_err);

  -- ----- 9 expected cash formula (independent recomputation) ---------------------------------------------
  v_s := public.get_shift_summary(v_sh);
  SELECT 1000
    + COALESCE((SELECT sum(c) FROM (SELECT (b.value->>'amount')::numeric AS c FROM public.sales s, jsonb_array_elements(s.payment_breakdown) b
         WHERE s.shift_id = v_sh AND s.status IN ('COMPLETED','REFUNDED') AND public.payment_account(b.value->>'method') = 'CASH') q), 0)
    + COALESCE((SELECT sum(amount) FROM public.cash_movements WHERE shift_id = v_sh AND movement_type = 'CASH_IN'), 0)
    - COALESCE((SELECT sum(amount) FROM public.cash_movements WHERE shift_id = v_sh AND movement_type IN ('CASH_OUT','CASH_DROP','EXPENSE_PAID','REFUND_PAID')), 0)
    INTO v_a;
  v_rep := v_rep || pg_temp.m7chk('9 expected cash = opening + cash sales + in - out - drops - expenses - refunds',
    (v_s->>'expected_cash')::numeric = v_a, 'function=' || (v_s->>'expected_cash') || ' independent=' || v_a);

  -- ----- refunds: drawer effect --------------------------------------------------------------------------
  UPDATE public.sales SET status = 'REFUNDED', payment_status = 'REFUNDED', refund_reason = 'test refund' WHERE id = v_sale;
  v_exp0 := (v_s->>'expected_cash')::numeric;
  v_r := public.record_refund_cash(v_sale, 'Cashier A');
  v_r := public.record_refund_cash(v_sale, 'Cashier A');
  v_s := public.get_shift_summary(v_sh);
  SELECT count(*) INTO v_n FROM public.cash_movements WHERE movement_type = 'REFUND_PAID' AND reference_id = v_sale;
  v_rep := v_rep || pg_temp.m7chk('refund of a cash sale reduces drawer once (idempotent)',
    v_n = 1 AND (v_s->>'expected_cash')::numeric = v_exp0 - v_total, 'movements=' || v_n || ' expected=' || (v_s->>'expected_cash'));

  -- ----- direct-write guards ------------------------------------------------------------------------------
  v_err := pg_temp.m7try(format('UPDATE public.sales SET shift_id = NULL WHERE id = %L', v_sale));
  v_rep := v_rep || pg_temp.m7chk('sale shift link cannot be removed/changed', v_err = 'shift_immutable', v_err);
  IF v_other IS NOT NULL THEN
    PERFORM pg_temp.m7as(v_other_owner);
    v_sh_other := (public.open_shift(v_other, 10, '10000000-0000-0000-0000-0000000000a1', 'Other')->>'shift_id')::uuid;
    PERFORM pg_temp.m7as(v_cashier);
    v_err := pg_temp.m7try(format('INSERT INTO public.sales (store_id, total_amount, shift_id) VALUES (%L, 1, %L)', v_store, v_sh_other));
    v_rep := v_rep || pg_temp.m7chk('16 a sale cannot be linked to another store''s shift (trigger)', v_err = 'shift_store_mismatch', v_err);
    v_err := pg_temp.m7try(format('SELECT public.post_sale(%L, %L, %L::jsonb, %s, %L, %L::jsonb, NULL, %L, %L, now(), false, %L)',
      gen_random_uuid(), v_store, v_lines::text, v_total, 'ငွေသား',
      jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total))::text, 'COMPLETED', 'PAID', v_sh_other));
    v_rep := v_rep || pg_temp.m7chk('16 post_sale refuses another store''s shift', v_err = 'SHIFT_NOT_FOUND', v_err);
    v_err := pg_temp.m7try(format('SELECT public.record_cash_movement(%L, %L, 1, %L, %L)', v_sh_other, 'CASH_IN', 'x', '30000000-0000-0000-0000-0000000000b1'));
    v_rep := v_rep || pg_temp.m7chk('16 cashier cannot move cash in another store''s shift', v_err = 'not_authorized', v_err);
    v_err := pg_temp.m7try(format('SELECT public.get_shift_summary(%L)', v_sh_other));
    v_rep := v_rep || pg_temp.m7chk('16 cashier cannot read another store''s shift summary', v_err = 'not_authorized', v_err);
  ELSE
    v_rep := v_rep || E'\nSKIP 16 cross-store checks | no second store available';
  END IF;

  -- ----- 10 closing ------------------------------------------------------------------------------------------
  v_s := public.get_shift_summary(v_sh); v_exp0 := (v_s->>'expected_cash')::numeric;
  v_err := pg_temp.m7try(format('SELECT public.close_shift(%L, %s, NULL)', v_sh, v_exp0 - 30));
  v_rep := v_rep || pg_temp.m7chk('a difference needs a note', v_err = 'note_required_for_difference', v_err);
  v_t0 := clock_timestamp();
  v_r := public.close_shift(v_sh, v_exp0 - 30, 'short 30', 'Cashier A');
  SELECT expected_cash, counted_cash, cash_difference, status, review_status, closed_by
    INTO v_e, v_c, v_d, v_status, v_rev, v_cl FROM public.cashier_shifts WHERE id = v_sh;
  v_rep := v_rep || pg_temp.m7chk('10 closing stores expected, counted, difference, closer, time',
    v_status = 'CLOSED' AND v_e = v_exp0 AND v_c = v_exp0 - 30 AND v_d = -30 AND v_cl = v_cashier
    AND v_rev = 'PENDING' AND EXISTS (SELECT 1 FROM public.cashier_shifts WHERE id = v_sh AND closed_at IS NOT NULL),
    'expected=' || v_e || ' counted=' || v_c || ' diff=' || v_d || ' review=' || v_rev);
  v_r := public.close_shift(v_sh, 1, 'again', 'Cashier A');
  SELECT counted_cash INTO v_a FROM public.cashier_shifts WHERE id = v_sh;
  v_rep := v_rep || pg_temp.m7chk('13 closing twice keeps the original counted amount',
    (v_r->>'already_closed')::boolean AND v_a = v_exp0 - 30, 'counted=' || v_a);

  -- ----- 11 closed shift accepts nothing new --------------------------------------------------------------------
  v_err := pg_temp.m7try(format('SELECT public.record_cash_movement(%L, %L, 1, %L, %L)', v_sh, 'CASH_IN', 'x', '30000000-0000-0000-0000-0000000000c1'));
  v_rep := v_rep || pg_temp.m7chk('11 closed shift refuses cash movements', v_err = 'shift_closed', v_err);
  v_err := pg_temp.m7try(format('SELECT public.record_expense(%L, %L, %L, 1, NULL, %L, now(), %L, NULL)', v_store, '20000000-0000-0000-0000-0000000000c2', 'x', 'ငွေသား', v_sh));
  v_rep := v_rep || pg_temp.m7chk('11 closed shift refuses drawer expenses', v_err = 'shift_closed', v_err);
  v_err := pg_temp.m7try(format('SELECT public.post_sale(%L, %L, %L::jsonb, %s, %L, %L::jsonb, NULL, %L, %L, now(), false, %L)',
    gen_random_uuid(), v_store, v_lines::text, v_total, 'ငွေသား',
    jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total))::text, 'COMPLETED', 'PAID', v_sh));
  v_rep := v_rep || pg_temp.m7chk('11 closed shift refuses new live sales', v_err = 'SHIFT_CLOSED', v_err);
  v_err := pg_temp.m7try(format('INSERT INTO public.sales (store_id, total_amount, shift_id) VALUES (%L, 1, %L)', v_store, v_sh));
  v_rep := v_rep || pg_temp.m7chk('11 closed shift refuses a direct sale insert (trigger)', v_err = 'shift_closed', v_err);

  -- ----- 17 offline sync ---------------------------------------------------------------------------------------------
  v_r := public.post_sale(v_sale4, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now(), true, v_sh);
  v_s := public.get_shift_summary(v_sh);
  v_rep := v_rep || pg_temp.m7chk('17 offline sale made while the shift was open syncs onto that shift after close',
    (v_r->>'shift_linked')::boolean AND (v_s->>'late_adjustment')::numeric = v_total,
    'late_adjustment=' || (v_s->>'late_adjustment'));
  v_r := public.post_sale(v_sale5, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now() - interval '2 days', true, v_sh);
  SELECT count(*), COALESCE(bool_and(shift_id IS NULL), false) INTO v_n, v_status FROM public.sales WHERE id = v_sale5;
  v_rep := v_rep || pg_temp.m7chk('17 offline sale from before the shift is saved but NOT assigned to it',
    v_n = 1 AND NOT (v_r->>'shift_linked')::boolean, 'saved=' || v_n || ' linked=' || (v_r->>'shift_linked'));
  v_a := (public.get_shift_summary(v_sh)->>'cash_sales')::numeric;
  v_rep := v_rep || pg_temp.m7chk('17 closing snapshot itself is unchanged by late sales',
    (SELECT expected_cash FROM public.cashier_shifts WHERE id = v_sh) = v_e, 'snapshot expected=' || v_e);

  -- ----- require_shift policy -----------------------------------------------------------------------------------------
  UPDATE public.stores SET require_shift = true WHERE id = v_store;
  v_err := pg_temp.m7try(format('SELECT public.post_sale(%L, %L, %L::jsonb, %s, %L, %L::jsonb, NULL, %L, %L, now(), false, NULL)',
    gen_random_uuid(), v_store, v_lines::text, v_total, 'ငွေသား',
    jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total))::text, 'COMPLETED', 'PAID'));
  v_rep := v_rep || pg_temp.m7chk('require_shift: live sale without a shift refused', v_err = 'SHIFT_REQUIRED', v_err);
  v_r := public.post_sale(v_sale6, v_store, v_lines, v_total, 'ငွေသား',
          jsonb_build_array(jsonb_build_object('method', 'ငွေသား', 'amount', v_total)),
          NULL, 'COMPLETED', 'PAID', now(), true, NULL);
  v_rep := v_rep || pg_temp.m7chk('require_shift: offline sale is never lost', NOT (v_r->>'already_posted')::boolean, 'saved');
  UPDATE public.stores SET require_shift = false WHERE id = v_store;

  -- ----- 12 manager review ---------------------------------------------------------------------------------------------
  v_err := pg_temp.m7try(format('SELECT public.review_shift(%L, %L, %L)', v_sh, 'APPROVED', 'ok'));
  v_rep := v_rep || pg_temp.m7chk('12 cashier cannot review a shift', v_err = 'not_authorized', v_err);
  PERFORM pg_temp.m7as(v_owner);
  v_err := pg_temp.m7try(format('SELECT public.review_shift(%L, %L, NULL)', v_sh, 'APPROVED'));
  v_rep := v_rep || pg_temp.m7chk('12 reviewing a discrepancy needs a note', v_err = 'note_required', v_err);
  v_r := public.review_shift(v_sh, 'APPROVED', 'counted twice, accepted');
  SELECT expected_cash, counted_cash, cash_difference, review_status, reviewed_by INTO v_e, v_c, v_d, v_rev, v_cl FROM public.cashier_shifts WHERE id = v_sh;
  v_rep := v_rep || pg_temp.m7chk('12 owner approves; original figures untouched; reviewer recorded',
    v_rev = 'APPROVED' AND v_cl = v_owner AND v_c = v_exp0 - 30 AND v_d = -30 AND v_e = v_exp0,
    'review=' || v_rev || ' counted=' || v_c || ' diff=' || v_d);
  v_err := pg_temp.m7try(format('SELECT public.review_shift(%L, %L, %L)', v_sh, 'FLAGGED', 'x'));
  v_rep := v_rep || pg_temp.m7chk('12 an approved closing is final', v_err = 'already_approved', v_err);
  -- manager who closes their own shift
  UPDATE public.store_members SET role = 'MANAGER' WHERE store_id = v_store AND user_id = v_cashier;
  PERFORM pg_temp.m7as(v_cashier);
  v_sh3 := (public.open_shift(v_store, 500, '10000000-0000-0000-0000-0000000000d1', 'Mgr')->>'shift_id')::uuid;
  PERFORM public.close_shift(v_sh3, 400, 'short 100', 'Mgr');
  v_err := pg_temp.m7try(format('SELECT public.review_shift(%L, %L, %L)', v_sh3, 'APPROVED', 'self'));
  v_rep := v_rep || pg_temp.m7chk('12 closer cannot approve their own discrepancy (non-owner manager)', v_err = 'self_review_not_allowed', v_err);
  v_r := public.review_shift(v_sh3, 'FLAGGED', 'looks wrong');
  PERFORM pg_temp.m7as(v_owner);
  v_r := public.review_shift(v_sh3, 'APPROVED', 'owner accepted');
  SELECT review_status INTO v_rev FROM public.cashier_shifts WHERE id = v_sh3;
  v_rep := v_rep || pg_temp.m7chk('12 flagged closing can be approved by the owner', v_rev = 'APPROVED', v_rev);
  PERFORM pg_temp.m7as(v_cashier);
  v_sh3 := (public.open_shift(v_store, 300, '10000000-0000-0000-0000-0000000000d2', 'Mgr')->>'shift_id')::uuid;
  v_r := public.close_shift(v_sh3, 300, NULL, 'Mgr');
  SELECT review_status INTO v_rev FROM public.cashier_shifts WHERE id = v_sh3;
  v_rep := v_rep || pg_temp.m7chk('10 exact count closes without needing review', v_rev = 'NONE' AND (v_r->>'cash_difference')::numeric = 0, v_rev);

  -- ----- 15 history unchanged ---------------------------------------------------------------------------------------------
  SELECT (SELECT count(*) FROM (SELECT * FROM m7_si EXCEPT SELECT id, unit_cost FROM public.sale_items) a)
       + (SELECT count(*) FROM (SELECT * FROM m7_ex EXCEPT SELECT id, amount, paid_with FROM public.expenses) b)
       + (SELECT count(*) FROM (SELECT * FROM m7_le EXCEPT SELECT id, account, direction, amount FROM public.ledger_entries) c)
       + (SELECT count(*) FROM (SELECT * FROM m7_sa EXCEPT SELECT id, total_amount, status FROM public.sales) d)
    INTO v_n;
  v_rep := v_rep || pg_temp.m7chk('15 existing sale_items / expenses / ledger / sales rows unchanged', v_n = 0, 'changed rows=' || v_n);

  RAISE EXCEPTION E'M7 CHECK REPORT (everything rolled back):%', v_rep;
END
$$;
