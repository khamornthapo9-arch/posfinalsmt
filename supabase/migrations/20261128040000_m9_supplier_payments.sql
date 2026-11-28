-- =====================================================================================================
-- M9 — Supplier payables & payments
--
-- Problem: paying a supplier was three separate client calls (debt_payments insert, ledger insert,
-- suppliers.balance update). A failure between them left the payable, the ledger and the supplier
-- balance disagreeing, a retry paid twice, over-payment was silently floored, cash paid from the drawer
-- never reached the shift, and any signed-in user could change suppliers.balance directly.
--
-- This migration:
--   1. pay_supplier(): one transaction, manager/owner only, idempotent (request id), over-payment
--      refused, ledger Dr ACCOUNTS_PAYABLE / Cr <method account>, cash linked to the paying user's open
--      shift as a SUPPLIER_PAYMENT movement (reduces expected drawer cash), digital methods never touch
--      the drawer.
--   2. shift_totals(): adds supplier_payments (and subtracts them from expected cash).
--   3. cash_movements CHECK widened with SUPPLIER_PAYMENT.
--   4. Guards: suppliers.balance can only be changed by database functions (not by a signed-in client);
--      a supplier with purchases, payments or a non-zero balance cannot be deleted.
--
-- Nothing here deletes or rewrites existing rows. Safe to re-run. Rollback:
-- supabase/rollback/20261128040000_m9_supplier_payments_ROLLBACK.sql
-- Depends on: M7 (cashier_shifts, cash_movements, is_store_manager), M8 (m8_internal,
-- payment_method_valid, debt_payments.request_id/shift_id).
-- =====================================================================================================

-- 1. Movement type ----------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.cash_movements'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%movement_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.cash_movements DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.cash_movements ADD CONSTRAINT cash_movements_movement_type_check
    CHECK (movement_type IN ('CASH_IN', 'CASH_OUT', 'CASH_DROP', 'EXPENSE_PAID', 'REFUND_PAID',
                             'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'SAFE_TO_DRAWER',
                             'CUSTOMER_PAYMENT', 'EXPENSE_VOID', 'SUPPLIER_PAYMENT'));
END $$;

-- 2. shift_totals with supplier payments ------------------------------------------------------------
-- expected = opening + cash sales + cash_in(+owner contribution +safe->drawer) + customer payments
--            + expense voids - cash_out(+owner withdrawal) - drops - expenses - refunds - supplier payments
CREATE OR REPLACE FUNCTION public.shift_totals(p_shift_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_opening numeric;
  v_cash numeric := 0; v_kbz numeric := 0; v_wave numeric := 0; v_credit numeric := 0;
  v_sales integer := 0;
  v_in numeric; v_out numeric; v_drop numeric; v_exp numeric; v_ref numeric;
  v_own_in numeric; v_own_out numeric; v_safe numeric; v_cust numeric; v_void numeric;
  v_supp numeric;
BEGIN
  SELECT opening_cash INTO v_opening FROM public.cashier_shifts WHERE id = p_shift_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;

  WITH s AS (
    SELECT id, total_amount, payment_method, payment_breakdown
    FROM public.sales WHERE shift_id = p_shift_id AND status IN ('COMPLETED', 'REFUNDED')
  ), parts AS (
    SELECT public.payment_account(COALESCE(NULLIF(b.value->>'method', ''), s.payment_method)) AS acct,
           COALESCE((b.value->>'amount')::numeric, 0) AS amt
    FROM s, LATERAL pg_catalog.jsonb_array_elements(s.payment_breakdown) AS b(value)
    WHERE pg_catalog.jsonb_typeof(s.payment_breakdown) = 'array'
      AND pg_catalog.jsonb_array_length(s.payment_breakdown) > 0
    UNION ALL
    SELECT public.payment_account(s.payment_method), s.total_amount
    FROM s
    WHERE NOT (pg_catalog.jsonb_typeof(s.payment_breakdown) = 'array'
               AND pg_catalog.jsonb_array_length(s.payment_breakdown) > 0)
  )
  SELECT COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'CASH'), 0),
         COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'KBZPAY'), 0),
         COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'WAVEPAY'), 0),
         COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'ACCOUNTS_RECEIVABLE'), 0)
    INTO v_cash, v_kbz, v_wave, v_credit
  FROM parts;
  SELECT pg_catalog.count(*) INTO v_sales FROM public.sales
    WHERE shift_id = p_shift_id AND status IN ('COMPLETED', 'REFUNDED');

  SELECT COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'CASH_IN'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'CASH_OUT'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'CASH_DROP'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'EXPENSE_PAID'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'REFUND_PAID'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'OWNER_CONTRIBUTION'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'OWNER_WITHDRAWAL'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'SAFE_TO_DRAWER'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'CUSTOMER_PAYMENT'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'EXPENSE_VOID'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'SUPPLIER_PAYMENT'), 0)
    INTO v_in, v_out, v_drop, v_exp, v_ref, v_own_in, v_own_out, v_safe, v_cust, v_void, v_supp
  FROM public.cash_movements WHERE shift_id = p_shift_id;

  RETURN pg_catalog.jsonb_build_object(
    'opening_cash', v_opening,
    'cash_sales', v_cash, 'kbzpay_sales', v_kbz, 'wavepay_sales', v_wave, 'credit_sales', v_credit,
    'sale_count', v_sales,
    'cash_in', v_in + v_own_in + v_safe,
    'cash_out', v_out + v_own_out,
    'cash_drops', v_drop, 'cash_expenses', v_exp, 'cash_refunds', v_ref,
    'owner_contributions', v_own_in, 'owner_withdrawals', v_own_out, 'safe_to_drawer', v_safe,
    'customer_payments', v_cust, 'expense_voids', v_void, 'supplier_payments', v_supp,
    'expected_cash', v_opening + v_cash + v_in + v_own_in + v_safe + v_cust + v_void
                     - v_out - v_own_out - v_drop - v_exp - v_ref - v_supp
  );
END;
$$;
REVOKE ALL ON FUNCTION public.shift_totals(uuid) FROM PUBLIC, anon, authenticated;

-- 3. pay_supplier -----------------------------------------------------------------------------------
-- Manager/owner only (it moves store money out). One transaction. A repeat of the same request id
-- returns the first payment and changes nothing.
CREATE OR REPLACE FUNCTION public.pay_supplier(
  p_store_id uuid,
  p_supplier_id uuid,
  p_amount numeric,
  p_method text,
  p_request_id uuid,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sup public.suppliers%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE; v_have_shift boolean := false;
  v_pay public.debt_payments%ROWTYPE;
  v_acct text;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  IF NOT (public.owns_store(p_store_id) OR public.is_store_manager(p_store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF NOT public.payment_method_valid(p_method) OR p_method = 'အကြွေး' THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;
  v_acct := public.payment_account(p_method);

  SELECT * INTO v_sup FROM public.suppliers
   WHERE id = p_supplier_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier_not_found'; END IF;

  -- Idempotent replay (under the supplier lock, so two concurrent retries cannot both post).
  SELECT * INTO v_pay FROM public.debt_payments
   WHERE store_id = p_store_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_pay.party_id <> p_supplier_id OR v_pay.party_type <> 'SUPPLIER' THEN
      RAISE EXCEPTION 'request_id_conflict';
    END IF;
    RETURN pg_catalog.jsonb_build_object('payment_id', v_pay.id, 'duplicate', true);
  END IF;

  IF p_amount > COALESCE(v_sup.balance, 0) THEN RAISE EXCEPTION 'overpayment'; END IF;

  IF v_acct = 'CASH' THEN
    SELECT * INTO v_shift FROM public.cashier_shifts
     WHERE store_id = p_store_id AND opened_by = v_uid AND status = 'OPEN' FOR UPDATE;
    v_have_shift := FOUND;
    IF NOT v_have_shift
       AND COALESCE((SELECT require_shift FROM public.stores WHERE id = p_store_id), false) THEN
      RAISE EXCEPTION 'shift_required';
    END IF;
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);
  INSERT INTO public.debt_payments
    (store_id, party_type, party_id, amount, method, note, created_at, request_id, shift_id)
  VALUES
    (p_store_id, 'SUPPLIER', p_supplier_id, p_amount, p_method, NULL, v_now, p_request_id,
     CASE WHEN v_have_shift THEN v_shift.id END)
  RETURNING * INTO v_pay;

  UPDATE public.suppliers SET balance = COALESCE(balance, 0) - p_amount WHERE id = p_supplier_id;

  INSERT INTO public.ledger_entries
    (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
  VALUES
    (p_store_id, 'ACCOUNTS_PAYABLE', 'DEBIT', p_amount, 'SUPPLIER_PAYMENT', v_pay.id, v_sup.name, v_now),
    (p_store_id, v_acct, 'CREDIT', p_amount, 'SUPPLIER_PAYMENT', v_pay.id, v_sup.name, v_now);

  IF v_have_shift THEN
    INSERT INTO public.cash_movements
      (store_id, shift_id, movement_type, amount, reason, reference_id, request_id, created_by, created_by_name)
    VALUES
      (p_store_id, v_shift.id, 'SUPPLIER_PAYMENT', p_amount, COALESCE(v_sup.name, 'Supplier payment'),
       v_pay.id, p_request_id, v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''));
  END IF;
  PERFORM pg_catalog.set_config('app.m8_internal', '', true);

  RETURN pg_catalog.jsonb_build_object('payment_id', v_pay.id, 'duplicate', false,
    'balance', COALESCE(v_sup.balance, 0) - p_amount, 'account', v_acct,
    'shift_linked', v_have_shift, 'shift_id', CASE WHEN v_have_shift THEN v_shift.id END);
END;
$$;
REVOKE ALL ON FUNCTION public.pay_supplier(uuid, uuid, numeric, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_supplier(uuid, uuid, numeric, text, uuid, text) TO authenticated;

-- 4. Guards -----------------------------------------------------------------------------------------
-- suppliers.balance is owned by the database (receive_purchase, pay_supplier). A signed-in client
-- (role authenticated/anon) can no longer write it; SECURITY DEFINER functions and the SQL editor can.
CREATE OR REPLACE FUNCTION public.suppliers_balance_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance
     AND current_user IN ('authenticated', 'anon')
     AND NOT public.m8_internal() THEN
    RAISE EXCEPTION 'balance_managed_by_database';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_suppliers_balance_guard ON public.suppliers;
CREATE TRIGGER trg_suppliers_balance_guard BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.suppliers_balance_guard();

-- A supplier that has purchases, payments or an unpaid balance is financial history: it cannot be
-- deleted (the foreign key would otherwise silently detach its purchases).
CREATE OR REPLACE FUNCTION public.suppliers_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(OLD.balance, 0) <> 0
     OR EXISTS (SELECT 1 FROM public.purchases WHERE supplier_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.debt_payments
                 WHERE party_type = 'SUPPLIER' AND party_id = OLD.id) THEN
    RAISE EXCEPTION 'supplier_has_history';
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_suppliers_delete_guard ON public.suppliers;
CREATE TRIGGER trg_suppliers_delete_guard BEFORE DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.suppliers_delete_guard();
