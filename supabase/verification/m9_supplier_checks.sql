-- M9 verification: supplier payments (pay_supplier), shift cash effect, ledger, idempotency,
-- permissions and the supplier guards.
--
-- SAFE ON LIVE DATA: one DO block creates its own test suppliers in an existing store and ALWAYS ends by
-- raising an exception, which rolls EVERYTHING back (temporary memberships, a temporary require_shift
-- switch, test shifts and payments included). The exception text is the report (PASS / FAIL / SKIP).
-- Run it AFTER the M7, M8 and M9 migrations, in the Supabase SQL editor.
--
-- Manager = the store owner. Cashier = an active CASHIER of that store, or (when none exists) another
-- existing user temporarily added as CASHIER. Cross-store checks need a second store with a different
-- owner; otherwise they are reported as SKIP. The SQL editor bypasses row-level security, so this
-- proves the FUNCTION rules and TRIGGERS (and, where stated, the authenticated-role behaviour), not RLS.

CREATE OR REPLACE FUNCTION pg_temp.m9as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END, true);
END $$;

-- Runs one statement in a sub-transaction; returns 'OK' or the error message (effects roll back on error).
CREATE OR REPLACE FUNCTION pg_temp.m9try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN 'OK';
EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $$;

CREATE OR REPLACE FUNCTION pg_temp.m9chk(p_name text, p_ok boolean, p_detail text) RETURNS text LANGUAGE sql AS $$
  SELECT E'\n' || CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END || ' ' || p_name || ' | ' || COALESCE(p_detail, '')
$$;

CREATE OR REPLACE FUNCTION pg_temp.m9bal(p_ref uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(sum(CASE direction WHEN 'DEBIT' THEN amount ELSE -amount END), 0)
    FROM public.ledger_entries WHERE reference_id::text = p_ref::text
$$;
CREATE OR REPLACE FUNCTION pg_temp.m9acct(p_ref uuid, p_acct text) RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(sum(CASE direction WHEN 'DEBIT' THEN amount ELSE -amount END), 0)
    FROM public.ledger_entries WHERE reference_id::text = p_ref::text AND account = p_acct
$$;
CREATE OR REPLACE FUNCTION pg_temp.m9exp(p_shift uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT (public.get_shift_summary(p_shift)->>'expected_cash')::numeric
$$;
CREATE OR REPLACE FUNCTION pg_temp.m9balance(p_sup uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT balance FROM public.suppliers WHERE id = p_sup
$$;
CREATE OR REPLACE FUNCTION pg_temp.m9npay(p_sup uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.debt_payments WHERE party_type = 'SUPPLIER' AND party_id = p_sup
$$;
CREATE OR REPLACE FUNCTION pg_temp.m9nled(p_sup uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.ledger_entries l JOIN public.debt_payments d ON d.id = l.reference_id
   WHERE d.party_id = p_sup AND l.reference_type = 'SUPPLIER_PAYMENT'
$$;

DO $$
DECLARE
  v_store uuid := NULL;                       -- NULL = auto-pick
  v_owner uuid; v_cashier uuid; v_other_owner uuid; v_other uuid;
  v_rep text := ''; v_err text; v_r jsonb; v_r2 jsonb; v_tmpmember boolean := false;
  v_sup uuid := gen_random_uuid(); v_sup2 uuid := gen_random_uuid(); v_sup3 uuid := gen_random_uuid();
  v_sh uuid; v_had_shift boolean;
  v_rq1 uuid := gen_random_uuid(); v_rq2 uuid := gen_random_uuid(); v_rq3 uuid := gen_random_uuid();
  v_rq4 uuid := gen_random_uuid(); v_rq5 uuid := gen_random_uuid(); v_rq6 uuid := gen_random_uuid();
  v_pay uuid; v_x0 numeric; v_x1 numeric; v_n bigint; v_n2 bigint; v_b numeric; v_req boolean;
  v_old_ledger bigint; v_old_pay bigint;
BEGIN
  -- ----- setup ---------------------------------------------------------------------------------
  IF v_store IS NULL THEN
    SELECT id, owner_id INTO v_store, v_owner FROM public.stores WHERE owner_id IS NOT NULL ORDER BY id LIMIT 1;
  ELSE
    SELECT owner_id INTO v_owner FROM public.stores WHERE id = v_store;
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
    RAISE EXCEPTION E'M9 CHECK REPORT (everything rolled back):%', pg_temp.m9chk('SETUP', false, 'need a second user for the cashier checks');
  END IF;
  SELECT id, owner_id INTO v_other, v_other_owner FROM public.stores s
   WHERE s.id <> v_store AND s.owner_id IS NOT NULL AND s.owner_id <> v_cashier AND s.owner_id <> v_owner
     AND NOT EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = s.id AND m.user_id = v_cashier)
   ORDER BY s.id LIMIT 1;
  v_req := COALESCE((SELECT require_shift FROM public.stores WHERE id = v_store), false);

  -- existing history snapshot (must be untouched at the end)
  SELECT count(*) INTO v_old_ledger FROM public.ledger_entries WHERE store_id = v_store;
  SELECT count(*) INTO v_old_pay FROM public.debt_payments WHERE store_id = v_store;

  INSERT INTO public.suppliers (id, store_id, name, balance) VALUES (v_sup, v_store, 'M9 supplier', 1000);
  INSERT INTO public.suppliers (id, store_id, name, balance) VALUES (v_sup2, v_store, 'M9 supplier 2', 300);
  INSERT INTO public.suppliers (id, store_id, name, balance) VALUES (v_sup3, v_store, 'M9 clean supplier', 0);

  -- ===== no-shift behaviour (only when the owner has no open shift) =======================================
  v_had_shift := EXISTS (SELECT 1 FROM public.cashier_shifts WHERE store_id = v_store AND opened_by = v_owner AND status = 'OPEN');
  PERFORM pg_temp.m9as(v_owner);
  IF NOT v_had_shift THEN
    UPDATE public.stores SET require_shift = true WHERE id = v_store;
    v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,100,%L,%L)', v_store, v_sup2, 'ငွေသား', v_rq6));
    v_rep := v_rep || pg_temp.m9chk('8a cash payment with require_shift and no open shift is refused, nothing written',
      v_err = 'shift_required' AND pg_temp.m9npay(v_sup2) = 0 AND pg_temp.m9balance(v_sup2) = 300, v_err);
    UPDATE public.stores SET require_shift = false WHERE id = v_store;
    v_r := public.pay_supplier(v_store, v_sup2, 100, 'ငွေသား', v_rq6);
    v_rep := v_rep || pg_temp.m9chk('8b cash payment without a required shift still posts, unlinked (no drawer movement)',
      (v_r->>'shift_linked')::boolean = false AND pg_temp.m9balance(v_sup2) = 200
      AND NOT EXISTS (SELECT 1 FROM public.cash_movements WHERE reference_id = (v_r->>'payment_id')::uuid),
      v_r::text);
    UPDATE public.stores SET require_shift = v_req WHERE id = v_store;
    v_sh := (public.open_shift(v_store, 500, '20000000-0000-0000-0000-0000000000b1', 'Manager')->>'shift_id')::uuid;
  ELSE
    v_rep := v_rep || E'\nSKIP 8 no-shift checks | the owner already has an open shift';
    SELECT id INTO v_sh FROM public.cashier_shifts WHERE store_id = v_store AND opened_by = v_owner AND status = 'OPEN' LIMIT 1;
  END IF;

  -- ===== 1 cash payment: balance, ledger, shift ==================================================================
  v_x0 := pg_temp.m9exp(v_sh);
  v_r := public.pay_supplier(v_store, v_sup, 400, 'ငွေသား', v_rq1, 'Manager A');
  v_pay := (v_r->>'payment_id')::uuid;
  v_x1 := pg_temp.m9exp(v_sh);
  v_rep := v_rep || pg_temp.m9chk('1 cash payment: supplier balance 1000 -> 600',
    pg_temp.m9balance(v_sup) = 600 AND (v_r->>'duplicate')::boolean = false, v_r::text);
  v_rep := v_rep || pg_temp.m9chk('1 cash payment: ledger balanced, Dr ACCOUNTS_PAYABLE 400, Cr CASH 400',
    pg_temp.m9bal(v_pay) = 0 AND pg_temp.m9acct(v_pay, 'ACCOUNTS_PAYABLE') = 400 AND pg_temp.m9acct(v_pay, 'CASH') = -400,
    'balance=' || pg_temp.m9bal(v_pay));
  v_rep := v_rep || pg_temp.m9chk('1 cash payment: SUPPLIER_PAYMENT movement on the shift, expected cash -400',
    EXISTS (SELECT 1 FROM public.cash_movements WHERE reference_id = v_pay AND movement_type = 'SUPPLIER_PAYMENT'
              AND shift_id = v_sh AND amount = 400)
    AND v_x1 = v_x0 - 400
    AND (public.get_shift_summary(v_sh)->>'supplier_payments')::numeric >= 400,
    'expected ' || v_x0 || ' -> ' || v_x1);
  v_rep := v_rep || pg_temp.m9chk('1 cash payment: debt_payments row is a positive SUPPLIER payment linked to the shift',
    EXISTS (SELECT 1 FROM public.debt_payments WHERE id = v_pay AND party_type = 'SUPPLIER' AND amount = 400
              AND shift_id = v_sh AND request_id = v_rq1), '');

  -- ===== 2 digital payment never touches the drawer ===============================================================
  v_x0 := pg_temp.m9exp(v_sh);
  v_r := public.pay_supplier(v_store, v_sup, 100, 'KBZ Pay', v_rq2);
  v_pay := (v_r->>'payment_id')::uuid;
  v_rep := v_rep || pg_temp.m9chk('2 KBZ payment: Cr KBZPAY, balance 500, no drawer movement, expected cash unchanged',
    pg_temp.m9acct(v_pay, 'KBZPAY') = -100 AND pg_temp.m9acct(v_pay, 'ACCOUNTS_PAYABLE') = 100
    AND pg_temp.m9bal(v_pay) = 0 AND pg_temp.m9balance(v_sup) = 500
    AND NOT EXISTS (SELECT 1 FROM public.cash_movements WHERE reference_id = v_pay)
    AND pg_temp.m9exp(v_sh) = v_x0, 'expected ' || pg_temp.m9exp(v_sh));
  v_r := public.pay_supplier(v_store, v_sup, 50, 'Wave Pay', v_rq3);
  v_rep := v_rep || pg_temp.m9chk('2 Wave payment: Cr WAVEPAY',
    pg_temp.m9acct((v_r->>'payment_id')::uuid, 'WAVEPAY') = -50 AND pg_temp.m9balance(v_sup) = 450, '');

  -- ===== 3 duplicate request id posts once ==========================================================================
  v_n := pg_temp.m9npay(v_sup); v_n2 := pg_temp.m9nled(v_sup); v_b := pg_temp.m9balance(v_sup); v_x0 := pg_temp.m9exp(v_sh);
  v_r2 := public.pay_supplier(v_store, v_sup, 400, 'ငွေသား', v_rq1, 'Manager A');
  v_rep := v_rep || pg_temp.m9chk('3 same request id again: reported as duplicate, no new rows, balance and drawer unchanged',
    (v_r2->>'duplicate')::boolean AND pg_temp.m9npay(v_sup) = v_n AND pg_temp.m9nled(v_sup) = v_n2
    AND pg_temp.m9balance(v_sup) = v_b AND pg_temp.m9exp(v_sh) = v_x0, v_r2::text);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,400,%L,%L)', v_store, v_sup2, 'ငွေသား', v_rq1));
  v_rep := v_rep || pg_temp.m9chk('3 request id reused for another supplier is rejected', v_err = 'request_id_conflict', v_err);

  -- ===== 4 over-payment, partial then final ===========================================================================
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,450.01,%L,%L)', v_store, v_sup, 'ငွေသား', v_rq4));
  v_rep := v_rep || pg_temp.m9chk('4a paying more than is owed is refused, nothing written',
    v_err = 'overpayment' AND pg_temp.m9balance(v_sup) = 450 AND pg_temp.m9npay(v_sup) = v_n, v_err);
  PERFORM public.pay_supplier(v_store, v_sup, 200, 'ငွေသား', v_rq4);
  v_rep := v_rep || pg_temp.m9chk('4b partial payment leaves the exact remainder', pg_temp.m9balance(v_sup) = 250, 'balance=' || pg_temp.m9balance(v_sup));
  PERFORM public.pay_supplier(v_store, v_sup, 250, 'KBZ Pay', v_rq5);
  v_rep := v_rep || pg_temp.m9chk('4c final payment clears the payable to zero', pg_temp.m9balance(v_sup) = 0, 'balance=' || pg_temp.m9balance(v_sup));
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,1,%L,%L)', v_store, v_sup, 'ငွေသား', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('4d nothing owed: any further payment is refused', v_err = 'overpayment', v_err);

  -- ===== 5 invalid input ==============================================================================================
  v_n := pg_temp.m9npay(v_sup2);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, v_sup2, 'bitcoin', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('5a unknown payment method rejected', v_err = 'invalid_payment_method', v_err);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, v_sup2, 'အကြွေး', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('5b "credit" is not a way to pay a supplier', v_err = 'invalid_payment_method', v_err);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,-5,%L,%L)', v_store, v_sup2, 'ငွေသား', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('5c negative amount rejected', v_err = 'invalid_amount', v_err);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,0,%L,%L)', v_store, v_sup2, 'ငွေသား', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('5d zero amount rejected', v_err = 'invalid_amount', v_err);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,NULL)', v_store, v_sup2, 'ငွေသား'));
  v_rep := v_rep || pg_temp.m9chk('5e missing request id rejected', v_err = 'missing_request_id', v_err);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, gen_random_uuid(), 'ငွေသား', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('5f unknown supplier rejected', v_err = 'supplier_not_found', v_err);
  v_rep := v_rep || pg_temp.m9chk('5 invalid attempts wrote nothing', pg_temp.m9npay(v_sup2) = v_n, 'payments=' || pg_temp.m9npay(v_sup2));

  -- ===== 6 permissions (function level) ================================================================================
  PERFORM pg_temp.m9as(v_cashier);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, v_sup2, 'KBZ Pay', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('6a a cashier cannot pay a supplier', v_err = 'not_authorized', v_err);
  PERFORM pg_temp.m9as(NULL);
  v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, v_sup2, 'KBZ Pay', gen_random_uuid()));
  v_rep := v_rep || pg_temp.m9chk('6b not signed in is rejected', v_err = 'not_authenticated', v_err);
  IF v_other IS NOT NULL THEN
    PERFORM pg_temp.m9as(v_other_owner);
    v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_store, v_sup2, 'KBZ Pay', gen_random_uuid()));
    v_rep := v_rep || pg_temp.m9chk('6c the owner of ANOTHER store cannot pay this store''s supplier', v_err = 'not_authorized', v_err);
    v_err := pg_temp.m9try(format('SELECT public.pay_supplier(%L,%L,10,%L,%L)', v_other, v_sup2, 'KBZ Pay', gen_random_uuid()));
    v_rep := v_rep || pg_temp.m9chk('6d a supplier id from another store cannot be paid through my own store', v_err = 'supplier_not_found', v_err);
  ELSE
    v_rep := v_rep || E'\nSKIP 6c/6d cross-store | no second store with a different owner';
  END IF;
  PERFORM pg_temp.m9as(v_owner);

  -- ===== 7 guards =======================================================================================================
  v_err := pg_temp.m9try(format('SET LOCAL ROLE authenticated; UPDATE public.suppliers SET balance = 0 WHERE id = %L', v_sup2));
  RESET ROLE;
  v_rep := v_rep || pg_temp.m9chk('7a a signed-in client cannot write suppliers.balance directly',
    v_err = 'balance_managed_by_database' AND pg_temp.m9balance(v_sup2) = 200, v_err);
  v_err := pg_temp.m9try(format('SET LOCAL ROLE authenticated; UPDATE public.suppliers SET name = %L WHERE id = %L', 'M9 renamed', v_sup2));
  RESET ROLE;
  v_rep := v_rep || pg_temp.m9chk('7b ...but can still edit the supplier name', v_err = 'OK', v_err);
  v_err := pg_temp.m9try(format('SET LOCAL ROLE authenticated; SELECT public.pay_supplier(%L,%L,20,%L,%L)', v_store, v_sup2, 'KBZ Pay', gen_random_uuid()));
  RESET ROLE;
  v_rep := v_rep || pg_temp.m9chk('7c pay_supplier called as the signed-in role works (definer may change the balance)',
    v_err = 'OK' AND pg_temp.m9balance(v_sup2) = 180, v_err || ' balance=' || pg_temp.m9balance(v_sup2));
  v_err := pg_temp.m9try(format('DELETE FROM public.suppliers WHERE id = %L', v_sup));
  v_rep := v_rep || pg_temp.m9chk('7d a supplier with payment history cannot be deleted', v_err = 'supplier_has_history', v_err);
  v_err := pg_temp.m9try(format('DELETE FROM public.suppliers WHERE id = %L', v_sup2));
  v_rep := v_rep || pg_temp.m9chk('7e a supplier with an unpaid balance cannot be deleted', v_err = 'supplier_has_history', v_err);
  v_err := pg_temp.m9try(format('DELETE FROM public.suppliers WHERE id = %L', v_sup3));
  v_rep := v_rep || pg_temp.m9chk('7f a supplier with no history can still be deleted', v_err = 'OK', v_err);

  -- ===== 8 rollback and history ==========================================================================================
  v_rep := v_rep || pg_temp.m9chk('9 every posted payment has a balanced ledger (Dr payable = Cr method account)',
    NOT EXISTS (SELECT 1 FROM public.debt_payments d
                 WHERE d.party_type = 'SUPPLIER' AND d.party_id IN (v_sup, v_sup2) AND pg_temp.m9bal(d.id) <> 0),
    '');
  v_rep := v_rep || pg_temp.m9chk('10 payments are never negative and never exceed what was owed (balances not below zero)',
    pg_temp.m9balance(v_sup) >= 0 AND pg_temp.m9balance(v_sup2) >= 0, 'balances ' || pg_temp.m9balance(v_sup) || ' / ' || pg_temp.m9balance(v_sup2));
  v_rep := v_rep || pg_temp.m9chk('11 shift summary exposes supplier_payments',
    public.get_shift_summary(v_sh) ? 'supplier_payments', '');
  v_rep := v_rep || pg_temp.m9chk('12 existing ledger and payment history of the store was not touched (only this test added rows)',
    (SELECT count(*) FROM public.ledger_entries WHERE store_id = v_store)
      - (SELECT count(*) FROM public.ledger_entries l JOIN public.debt_payments d ON d.id = l.reference_id
          WHERE d.party_id IN (v_sup, v_sup2, v_sup3) AND l.reference_type = 'SUPPLIER_PAYMENT') = v_old_ledger
    AND (SELECT count(*) FROM public.debt_payments WHERE store_id = v_store)
      - pg_temp.m9npay(v_sup) - pg_temp.m9npay(v_sup2) = v_old_pay,
    'before: ledger ' || v_old_ledger || ' payments ' || v_old_pay);

  IF v_tmpmember THEN RAISE NOTICE 'temporary cashier membership will be rolled back'; END IF;
  RAISE EXCEPTION E'M9 CHECK REPORT (everything rolled back):%', v_rep;
END $$;
