-- M8: accounting & transaction integrity.
--
-- NOT YET APPLIED. Review before running. Re-runnable (IF NOT EXISTS / OR REPLACE / guarded DO blocks).
-- Requires the M7 migration (20261126080000_cashier_shifts.sql). Rollback guidance:
-- supabase/rollback/20261127040000_m8_accounting_integrity_ROLLBACK.sql
--
-- WHAT THIS MIGRATION DOES
--   A. refund_sale(): ONE transaction for a refund. The sale row (status, reason, time), returned
--      stock + RETURN movements, ledger reversal, customer-debt reversal, drawer movement and an
--      audit row (sale_refunds) commit together or not at all. One refund per sale (retry-safe).
--      The ledger reversal MIRRORS the sale's own ledger entries (same accounts, opposite sides), so
--      a KBZPAY sale is reversed against KBZPAY (not CASH), tax and COGS/INVENTORY are reversed too,
--      and a sale that never had ledger entries gets no phantom reversal.
--   B. pay_open_tab(): completing an open tab (restaurant tab) in one transaction: server-side total
--      check, payment split validation, cost snapshot for lines that have none, status change, shift
--      link (require_shift honoured), customer debt for a credit part, and the SAME ledger entries
--      post_sale writes for a normal sale.
--   C. receive_customer_payment(): a customer paying back credit. Atomic, idempotent by request id,
--      ledger Dr <method account> / Cr ACCOUNTS_RECEIVABLE, balance reduced under a row lock,
--      over-payment refused, cash received lands in the receiver's open shift (drawer).
--   D. Expenses: void_expense() and replace_expense() (void + replacement in ONE transaction). The
--      original row is kept and marked voided; its ledger entries are reversed by new rows. Expenses
--      can no longer be deleted, and the money fields of an expense can no longer be edited in place.
--   E. Cash movement classification (record_cash_movement): new types OWNER_CONTRIBUTION,
--      OWNER_WITHDRAWAL, SAFE_TO_DRAWER, CASH_DROP. Only owner contribution / withdrawal touch
--      OWNER_EQUITY. Drops and safe->drawer transfers are internal (single CASH account): no ledger
--      rows, so they never create revenue or equity. The old generic CASH_IN / CASH_OUT types are no
--      longer accepted for NEW rows (existing rows keep their meaning and totals).
--   F. Payment methods: post_sale / pay_open_tab / receive_customer_payment reject unknown methods
--      (previously anything unknown was silently treated as CASH and counted as drawer cash).
--   G. Database-level protection: direct client writes that used to bypass the functions are refused
--      (sales status/payment/refund fields, creating non-OPEN sales, customer balances, expense money
--      fields and deletes). The functions set a transaction-local flag that these triggers honour.
--
-- DEPLOY ORDER: apply this migration, then deploy the new client right away. Between the two, the OLD
-- client's refund / tab payment / customer payment / expense edit will be refused by the guards (they
-- fail loudly; nothing is half-written).
--
-- NOT CHANGED: sale_items.unit_cost of existing sales, existing ledger rows, existing sales/expenses,
-- the M7 shift tables (a CHECK is widened), record_expense, open_shift, close_shift, review_shift.

-- 0. Helpers ---------------------------------------------------------------------------------------

-- True only inside the money functions below (transaction-local setting).
CREATE OR REPLACE FUNCTION public.m8_internal()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(pg_catalog.current_setting('app.m8_internal', true), '') = '1'
$$;

-- A payment method the system can account for: cash, credit, or a KBZ / Wave pay method.
CREATE OR REPLACE FUNCTION public.payment_method_valid(p_method text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_method IS NOT NULL AND pg_catalog.btrim(p_method) <> '' AND (
    p_method = 'ငွေသား'
    OR p_method = 'အကြွေး'
    OR pg_catalog.lower(p_method) = 'cash'
    OR pg_catalog.lower(p_method) LIKE '%kbz%'
    OR pg_catalog.lower(p_method) LIKE '%wave%'
  )
$$;
REVOKE ALL ON FUNCTION public.m8_internal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.m8_internal() TO authenticated;
REVOKE ALL ON FUNCTION public.payment_method_valid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_method_valid(text) TO authenticated;

-- 1. Schema ----------------------------------------------------------------------------------------

-- One row per refunded sale: the audit trail of the refund (the sale itself is never rewritten
-- beyond its status / refund fields; its items, costs and payment breakdown stay as they were).
CREATE TABLE IF NOT EXISTS public.sale_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL UNIQUE,
  refunded_by uuid NOT NULL,
  refunded_by_name text,
  approved_by_name text,
  reason text NOT NULL,
  note text,
  total_amount numeric NOT NULL,
  cash_amount numeric NOT NULL DEFAULT 0,
  digital_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  shift_id uuid REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT,
  ledger_rows integer NOT NULL DEFAULT 0,
  stock_lines integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sale_refunds_store ON public.sale_refunds (store_id, created_at DESC);
ALTER TABLE public.sale_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sale_refunds_select" ON public.sale_refunds;
CREATE POLICY "sale_refunds_select" ON public.sale_refunds FOR SELECT TO authenticated
  USING (public.is_store_member(store_id) OR public.owns_store(store_id));

-- Customer payments: idempotency key + the shift that received the cash.
ALTER TABLE public.debt_payments ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.debt_payments ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS debt_payments_request
  ON public.debt_payments (store_id, request_id) WHERE request_id IS NOT NULL;

-- Expense corrections: void (kept, never deleted) and the replacement link.
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS voided_by uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS replaced_by uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS replaces_expense_id uuid;

-- Widen the movement type list (the constraint name is generated, so find it by definition).
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
                             'CUSTOMER_PAYMENT', 'EXPENSE_VOID'));
END $$;

-- 2. Shift totals with the new movement types -------------------------------------------------------
-- expected = opening + cash sales + cash_in(+owner contribution +safe->drawer) + customer payments
--            + expense voids - cash_out(+owner withdrawal) - drops - drawer expenses - cash refunds
-- Keys of the previous version are kept; the new keys are additive.
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
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'EXPENSE_VOID'), 0)
    INTO v_in, v_out, v_drop, v_exp, v_ref, v_own_in, v_own_out, v_safe, v_cust, v_void
  FROM public.cash_movements WHERE shift_id = p_shift_id;

  RETURN pg_catalog.jsonb_build_object(
    'opening_cash', v_opening,
    'cash_sales', v_cash, 'kbzpay_sales', v_kbz, 'wavepay_sales', v_wave, 'credit_sales', v_credit,
    'sale_count', v_sales,
    -- grouped for the existing screens: everything that adds / removes drawer cash outside sales
    'cash_in', v_in + v_own_in + v_safe,
    'cash_out', v_out + v_own_out,
    'cash_drops', v_drop, 'cash_expenses', v_exp, 'cash_refunds', v_ref,
    -- detail
    'owner_contributions', v_own_in, 'owner_withdrawals', v_own_out, 'safe_to_drawer', v_safe,
    'customer_payments', v_cust, 'expense_voids', v_void,
    'expected_cash', v_opening + v_cash + v_in + v_own_in + v_safe + v_cust + v_void
                     - v_out - v_own_out - v_drop - v_exp - v_ref
  );
END;
$$;
REVOKE ALL ON FUNCTION public.shift_totals(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Cash movements: correct ledger classification -------------------------------------------------
--   OWNER_CONTRIBUTION  Dr CASH / Cr OWNER_EQUITY   (owner puts money in; manager/owner only)
--   OWNER_WITHDRAWAL    Dr OWNER_EQUITY / Cr CASH   (owner takes money out; manager/owner only)
--   SAFE_TO_DRAWER      no ledger (cash moves from the store's safe into the drawer; total cash same)
--   CASH_DROP           no ledger (drawer -> safe; total cash same)
-- All cash is ONE ledger account (CASH); the shift only tracks what is physically in the drawer.
CREATE OR REPLACE FUNCTION public.record_cash_movement(
  p_shift_id uuid,
  p_type text,
  p_amount numeric,
  p_reason text,
  p_request_id uuid,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift public.cashier_shifts%ROWTYPE;
  v_mv public.cash_movements%ROWTYPE;
  v_expected numeric;
  v_reason text := pg_catalog.btrim(COALESCE(p_reason, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  IF p_type IN ('CASH_IN', 'CASH_OUT') THEN RAISE EXCEPTION 'use_specific_movement_type'; END IF;
  IF p_type IS NULL OR p_type NOT IN ('CASH_DROP', 'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'SAFE_TO_DRAWER') THEN
    RAISE EXCEPTION 'invalid_movement_type';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF NOT public.can_use_shift(v_shift) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_type IN ('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL') AND NOT public.is_store_manager(v_shift.store_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Idempotent replay (checked under the shift lock).
  SELECT * INTO v_mv FROM public.cash_movements
   WHERE store_id = v_shift.store_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_mv.shift_id <> p_shift_id THEN RAISE EXCEPTION 'request_id_conflict'; END IF;
    RETURN pg_catalog.jsonb_build_object('movement_id', v_mv.id, 'duplicate', true);
  END IF;

  IF v_shift.status <> 'OPEN' THEN RAISE EXCEPTION 'shift_closed'; END IF;

  v_expected := (public.shift_totals(p_shift_id)->>'expected_cash')::numeric;
  IF p_type IN ('CASH_DROP', 'OWNER_WITHDRAWAL') AND p_amount > v_expected THEN
    RAISE EXCEPTION 'insufficient_drawer_cash';
  END IF;

  INSERT INTO public.cash_movements
    (store_id, shift_id, movement_type, amount, reason, request_id, created_by, created_by_name)
  VALUES
    (v_shift.store_id, p_shift_id, p_type, p_amount, v_reason, p_request_id, v_uid,
     NULLIF(pg_catalog.btrim(p_staff_name), ''))
  RETURNING * INTO v_mv;

  IF p_type = 'OWNER_CONTRIBUTION' THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_shift.store_id, 'CASH', 'DEBIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at),
      (v_shift.store_id, 'OWNER_EQUITY', 'CREDIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at);
  ELSIF p_type = 'OWNER_WITHDRAWAL' THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_shift.store_id, 'OWNER_EQUITY', 'DEBIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at),
      (v_shift.store_id, 'CASH', 'CREDIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at);
  END IF;

  RETURN pg_catalog.jsonb_build_object('movement_id', v_mv.id, 'duplicate', false,
    'expected_cash', public.shift_totals(p_shift_id)->>'expected_cash');
END;
$$;
REVOKE ALL ON FUNCTION public.record_cash_movement(uuid, text, numeric, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_cash_movement(uuid, text, numeric, text, uuid, text) TO authenticated;

-- 4. refund_sale -----------------------------------------------------------------------------------
-- Policy kept from today: any member of the sale's store may refund (the screen asks for a manager PIN
-- in Pro mode; the database can only see the signed-in ACCOUNT, so the PIN approver is stored as a
-- label). A refund of another store's sale is refused. The "today only" rule stays in the screen.
CREATE OR REPLACE FUNCTION public.refund_sale(
  p_sale_id uuid,
  p_reason text,
  p_note text DEFAULT NULL,
  p_staff_name text DEFAULT NULL,
  p_approved_by_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sale public.sales%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE;
  v_have_shift boolean := false;
  v_reason text := pg_catalog.btrim(COALESCE(p_reason, ''));
  v_cash numeric := 0; v_credit numeric := 0; v_digital numeric := 0;
  v_line record;
  v_stock_lines integer := 0; v_ledger integer := 0;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'sale_not_found'; END IF;
  IF NOT (public.is_store_member(v_sale.store_id) OR public.owns_store(v_sale.store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_sale.status = 'REFUNDED' THEN
    RETURN pg_catalog.jsonb_build_object('sale_id', p_sale_id, 'already_refunded', true);
  END IF;
  IF v_sale.status <> 'COMPLETED' THEN RAISE EXCEPTION 'sale_not_refundable'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  -- Split of the original payment by account.
  WITH parts AS (
    SELECT public.payment_account(COALESCE(NULLIF(b.value->>'method', ''), v_sale.payment_method)) AS acct,
           COALESCE((b.value->>'amount')::numeric, 0) AS amt
    FROM pg_catalog.jsonb_array_elements(v_sale.payment_breakdown) AS b(value)
    WHERE pg_catalog.jsonb_typeof(v_sale.payment_breakdown) = 'array'
      AND pg_catalog.jsonb_array_length(v_sale.payment_breakdown) > 0
    UNION ALL
    SELECT public.payment_account(v_sale.payment_method), v_sale.total_amount
    WHERE NOT (pg_catalog.jsonb_typeof(v_sale.payment_breakdown) = 'array'
               AND pg_catalog.jsonb_array_length(v_sale.payment_breakdown) > 0)
  )
  SELECT COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'CASH'), 0),
         COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct = 'ACCOUNTS_RECEIVABLE'), 0),
         COALESCE(pg_catalog.sum(amt) FILTER (WHERE acct IN ('KBZPAY', 'WAVEPAY')), 0)
    INTO v_cash, v_credit, v_digital
  FROM parts;

  -- The cash leaves the refunder's open shift (same rule as M7).
  SELECT * INTO v_shift FROM public.cashier_shifts
   WHERE store_id = v_sale.store_id AND opened_by = v_uid AND status = 'OPEN' FOR UPDATE;
  v_have_shift := FOUND;
  IF v_cash > 0 AND NOT v_have_shift
     AND COALESCE((SELECT require_shift FROM public.stores WHERE id = v_sale.store_id), false) THEN
    RAISE EXCEPTION 'shift_required';
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);

  -- 1. The sale: status and refund fields only. Items, costs and the payment breakdown stay.
  UPDATE public.sales
     SET status = 'REFUNDED', payment_status = 'REFUNDED', refund_reason = v_reason,
         refund_note = NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), ''), refunded_at = v_now
   WHERE id = p_sale_id;

  -- 2. Stock back, with RETURN movements (base units = quantity x conversion).
  FOR v_line IN
    SELECT item_id, pg_catalog.sum(quantity * COALESCE(conversion, 1))::integer AS qty
    FROM public.sale_items WHERE sale_id = p_sale_id AND item_id IS NOT NULL
    GROUP BY item_id ORDER BY item_id
  LOOP
    UPDATE public.items SET stock_quantity = stock_quantity + v_line.qty
     WHERE id = v_line.item_id AND store_id = v_sale.store_id;
    IF FOUND THEN
      INSERT INTO public.inventory_movements (store_id, item_id, movement_type, quantity, reference_id, created_by, created_at)
      VALUES (v_sale.store_id, v_line.item_id, 'RETURN', v_line.qty, p_sale_id, v_uid, v_now);
      v_stock_lines := v_stock_lines + 1;
    END IF;
  END LOOP;

  -- 3. Ledger: mirror the sale's own entries with the sides swapped.
  INSERT INTO public.ledger_entries
    (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
  SELECT le.store_id, le.account,
         CASE le.direction WHEN 'DEBIT' THEN 'CREDIT' ELSE 'DEBIT' END,
         le.amount, 'REFUND', p_sale_id, v_reason, v_now
  FROM public.ledger_entries le
  WHERE le.store_id = v_sale.store_id AND le.reference_type = 'SALE'
    AND le.reference_id::text = p_sale_id::text;
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  -- 4. Credit part: the customer no longer owes it.
  IF v_credit > 0 AND v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers SET balance = balance - v_credit, updated_at = v_now
     WHERE id = v_sale.customer_id AND store_id = v_sale.store_id;
    INSERT INTO public.debt_payments (store_id, party_type, party_id, amount, method, note, created_at)
    VALUES (v_sale.store_id, 'CUSTOMER', v_sale.customer_id, v_credit, 'REFUND',
            'ပြန်အမ်းငွေ · ' || v_reason, v_now);
  END IF;

  -- 5. Drawer: the cash part is paid back from the open shift (recorded even if it overdraws).
  IF v_cash > 0 AND v_have_shift THEN
    INSERT INTO public.cash_movements
      (store_id, shift_id, movement_type, amount, reason, reference_id, request_id, created_by, created_by_name)
    VALUES
      (v_sale.store_id, v_shift.id, 'REFUND_PAID', v_cash, v_reason, p_sale_id, p_sale_id, v_uid,
       NULLIF(pg_catalog.btrim(p_staff_name), ''));
  END IF;

  -- 6. Audit row (UNIQUE on sale_id: a second refund of the same sale cannot exist).
  INSERT INTO public.sale_refunds
    (store_id, sale_id, refunded_by, refunded_by_name, approved_by_name, reason, note, total_amount,
     cash_amount, digital_amount, credit_amount, shift_id, ledger_rows, stock_lines)
  VALUES
    (v_sale.store_id, p_sale_id, v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''),
     NULLIF(pg_catalog.btrim(p_approved_by_name), ''), v_reason,
     NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), ''), v_sale.total_amount, v_cash, v_digital,
     v_credit, CASE WHEN v_have_shift THEN v_shift.id END, v_ledger, v_stock_lines);

  PERFORM pg_catalog.set_config('app.m8_internal', '', true);

  RETURN pg_catalog.jsonb_build_object('sale_id', p_sale_id, 'already_refunded', false,
    'cash', v_cash, 'digital', v_digital, 'credit', v_credit, 'ledger_rows', v_ledger,
    'stock_lines', v_stock_lines, 'drawer_recorded', v_cash > 0 AND v_have_shift,
    'shift_id', CASE WHEN v_have_shift THEN v_shift.id END);
END;
$$;
REVOKE ALL ON FUNCTION public.refund_sale(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_sale(uuid, text, text, text, text) TO authenticated;

-- 5. pay_open_tab ----------------------------------------------------------------------------------
-- Completes an OPEN tab. Stock was already taken when the lines were added, so none moves here.
-- Error codes are upper case like post_sale's so the register shows the same messages.
CREATE OR REPLACE FUNCTION public.pay_open_tab(
  p_sale_id uuid,
  p_total numeric,
  p_payment_method text,
  p_payment_breakdown jsonb,
  p_customer_id uuid DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sale public.sales%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE; v_shift_id uuid := NULL;
  v_rate numeric := 0; v_require boolean := false;
  v_subtotal numeric := 0; v_tax numeric; v_revenue numeric; v_cogs numeric := 0;
  v_split jsonb; v_amt numeric; v_split_sum numeric := 0; v_credit numeric := 0;
  v_method text; v_acct text;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SALE_NOT_FOUND'; END IF;
  IF NOT (public.is_store_member(v_sale.store_id) OR public.owns_store(v_sale.store_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;
  IF v_sale.status = 'COMPLETED' THEN
    RETURN pg_catalog.jsonb_build_object('sale_id', p_sale_id, 'already_paid', true);
  END IF;
  IF v_sale.status <> 'OPEN' THEN RAISE EXCEPTION 'SALE_NOT_OPEN'; END IF;

  SELECT COALESCE(tax_rate, 0) / 100.0, COALESCE(require_shift, false) INTO v_rate, v_require
    FROM public.stores WHERE id = v_sale.store_id;
  SELECT COALESCE(pg_catalog.sum(quantity * unit_price), 0) INTO v_subtotal
    FROM public.sale_items WHERE sale_id = p_sale_id;
  IF NOT EXISTS (SELECT 1 FROM public.sale_items WHERE sale_id = p_sale_id) THEN
    RAISE EXCEPTION 'EMPTY_SALE';
  END IF;
  IF p_total IS NULL OR pg_catalog.abs(p_total - (v_subtotal * (1 + v_rate))) > 0.01 THEN
    RAISE EXCEPTION 'TOTAL_MISMATCH';
  END IF;

  IF p_payment_breakdown IS NULL OR pg_catalog.jsonb_typeof(p_payment_breakdown) <> 'array'
     OR pg_catalog.jsonb_array_length(p_payment_breakdown) = 0 THEN
    RAISE EXCEPTION 'PAYMENT_REQUIRED';
  END IF;
  FOR v_split IN SELECT value FROM pg_catalog.jsonb_array_elements(p_payment_breakdown) LOOP
    IF NOT public.payment_method_valid(v_split->>'method') THEN RAISE EXCEPTION 'INVALID_PAYMENT_METHOD'; END IF;
    v_amt := COALESCE((v_split->>'amount')::numeric, 0);
    IF v_amt < 0 THEN RAISE EXCEPTION 'NEGATIVE_PAYMENT'; END IF;
    v_split_sum := v_split_sum + v_amt;
    IF (v_split->>'method') = 'အကြွေး' THEN v_credit := v_credit + v_amt; END IF;
  END LOOP;
  IF pg_catalog.abs(v_split_sum - p_total) > 0.005 THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;

  IF v_credit > 0 AND p_customer_id IS NULL THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED'; END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id AND store_id = v_sale.store_id
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_IN_STORE';
  END IF;

  -- Shift: the tab is paid now, so it belongs to a shift that is open now.
  IF p_shift_id IS NOT NULL THEN
    SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR SHARE;
    IF NOT FOUND OR v_shift.store_id <> v_sale.store_id THEN RAISE EXCEPTION 'SHIFT_NOT_FOUND'; END IF;
    IF NOT (v_shift.opened_by = v_uid OR public.is_store_manager(v_sale.store_id)) THEN
      RAISE EXCEPTION 'SHIFT_ACCESS_DENIED';
    END IF;
    IF v_shift.status <> 'OPEN' THEN RAISE EXCEPTION 'SHIFT_CLOSED'; END IF;
    v_shift_id := p_shift_id;
  ELSIF v_require THEN
    RAISE EXCEPTION 'SHIFT_REQUIRED';
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);

  -- Cost snapshot only for lines that have none; an existing cost is never overwritten.
  UPDATE public.sale_items si
     SET unit_cost = COALESCE(i.cost_price, 0) * COALESCE(si.conversion, 1)
    FROM public.items i
   WHERE si.sale_id = p_sale_id AND i.id = si.item_id AND COALESCE(si.unit_cost, 0) = 0;
  SELECT COALESCE(pg_catalog.sum(quantity * COALESCE(unit_cost, 0)), 0) INTO v_cogs
    FROM public.sale_items WHERE sale_id = p_sale_id;

  UPDATE public.sales
     SET status = 'COMPLETED', payment_status = 'PAID', payment_method = p_payment_method,
         payment_breakdown = p_payment_breakdown, total_amount = p_total,
         customer_id = COALESCE(p_customer_id, customer_id), shift_id = v_shift_id
   WHERE id = p_sale_id;

  IF v_credit > 0 THEN
    UPDATE public.customers SET balance = balance + v_credit, updated_at = v_now WHERE id = p_customer_id;
    INSERT INTO public.debt_payments (store_id, party_type, party_id, amount, method, note, created_at)
    VALUES (v_sale.store_id, 'CUSTOMER', p_customer_id, -v_credit, 'အကြွေး',
            'အကြွေးရောင်းချမှု · ' || p_sale_id::text, v_now);
  END IF;

  -- Ledger: exactly what post_sale writes for a normal sale.
  v_tax := pg_catalog.round(v_subtotal * v_rate, 4);
  v_revenue := v_split_sum - v_tax;
  FOR v_split IN SELECT value FROM pg_catalog.jsonb_array_elements(p_payment_breakdown) LOOP
    v_amt := COALESCE((v_split->>'amount')::numeric, 0);
    v_method := v_split->>'method';
    CONTINUE WHEN v_amt <= 0;
    v_acct := public.payment_account(v_method);
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES (v_sale.store_id, v_acct, 'DEBIT', pg_catalog.round(v_amt, 4), 'SALE', p_sale_id, v_method, v_now);
  END LOOP;
  IF v_revenue > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES (v_sale.store_id, 'SALES_REVENUE', 'CREDIT', pg_catalog.round(v_revenue, 4), 'SALE', p_sale_id, p_payment_method, v_now);
  END IF;
  IF v_tax > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES (v_sale.store_id, 'TAX_PAYABLE', 'CREDIT', v_tax, 'SALE', p_sale_id, p_payment_method, v_now);
  END IF;
  IF v_cogs > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_sale.store_id, 'COGS', 'DEBIT', pg_catalog.round(v_cogs, 4), 'SALE', p_sale_id, p_payment_method, v_now),
      (v_sale.store_id, 'INVENTORY', 'CREDIT', pg_catalog.round(v_cogs, 4), 'SALE', p_sale_id, p_payment_method, v_now);
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '', true);
  RETURN pg_catalog.jsonb_build_object('sale_id', p_sale_id, 'already_paid', false,
    'shift_linked', v_shift_id IS NOT NULL, 'shift_id', v_shift_id, 'ledger_posted', true);
END;
$$;
REVOKE ALL ON FUNCTION public.pay_open_tab(uuid, numeric, text, jsonb, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_open_tab(uuid, numeric, text, jsonb, uuid, uuid, text) TO authenticated;

-- 6. receive_customer_payment ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_customer_payment(
  p_store_id uuid,
  p_customer_id uuid,
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
  v_cust public.customers%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE; v_have_shift boolean := false;
  v_pay public.debt_payments%ROWTYPE;
  v_acct text;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  IF NOT (public.is_store_member(p_store_id) OR public.owns_store(p_store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF NOT public.payment_method_valid(p_method) OR p_method = 'အကြွေး' THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;
  v_acct := public.payment_account(p_method);

  SELECT * INTO v_cust FROM public.customers
   WHERE id = p_customer_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;

  -- Idempotent replay (under the customer lock).
  SELECT * INTO v_pay FROM public.debt_payments WHERE store_id = p_store_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_pay.party_id <> p_customer_id THEN RAISE EXCEPTION 'request_id_conflict'; END IF;
    RETURN pg_catalog.jsonb_build_object('payment_id', v_pay.id, 'duplicate', true);
  END IF;

  IF p_amount > v_cust.balance THEN RAISE EXCEPTION 'overpayment'; END IF;

  IF v_acct = 'CASH' THEN
    SELECT * INTO v_shift FROM public.cashier_shifts
     WHERE store_id = p_store_id AND opened_by = v_uid AND status = 'OPEN' FOR UPDATE;
    v_have_shift := FOUND;
    IF NOT v_have_shift AND COALESCE((SELECT require_shift FROM public.stores WHERE id = p_store_id), false) THEN
      RAISE EXCEPTION 'shift_required';
    END IF;
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);
  INSERT INTO public.debt_payments
    (store_id, party_type, party_id, amount, method, note, created_at, request_id, shift_id)
  VALUES
    (p_store_id, 'CUSTOMER', p_customer_id, p_amount, p_method, NULL, v_now, p_request_id,
     CASE WHEN v_have_shift THEN v_shift.id END)
  RETURNING * INTO v_pay;

  UPDATE public.customers SET balance = balance - p_amount, updated_at = v_now WHERE id = p_customer_id;

  INSERT INTO public.ledger_entries
    (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
  VALUES
    (p_store_id, v_acct, 'DEBIT', p_amount, 'CUSTOMER_PAYMENT', v_pay.id, v_cust.name, v_now),
    (p_store_id, 'ACCOUNTS_RECEIVABLE', 'CREDIT', p_amount, 'CUSTOMER_PAYMENT', v_pay.id, v_cust.name, v_now);

  IF v_have_shift THEN
    INSERT INTO public.cash_movements
      (store_id, shift_id, movement_type, amount, reason, reference_id, request_id, created_by, created_by_name)
    VALUES
      (p_store_id, v_shift.id, 'CUSTOMER_PAYMENT', p_amount, COALESCE(v_cust.name, 'Customer payment'),
       v_pay.id, p_request_id, v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''));
  END IF;
  PERFORM pg_catalog.set_config('app.m8_internal', '', true);

  RETURN pg_catalog.jsonb_build_object('payment_id', v_pay.id, 'duplicate', false,
    'balance', v_cust.balance - p_amount, 'account', v_acct,
    'shift_linked', v_have_shift, 'shift_id', CASE WHEN v_have_shift THEN v_shift.id END);
END;
$$;
REVOKE ALL ON FUNCTION public.receive_customer_payment(uuid, uuid, numeric, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_customer_payment(uuid, uuid, numeric, text, uuid, text) TO authenticated;

-- 7. Expenses: guard, void, replace ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expenses_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'expense_immutable';   -- financial history is voided, never deleted
  END IF;
  IF public.m8_internal() THEN RETURN NEW; END IF;
  IF OLD.voided_at IS NOT NULL THEN RAISE EXCEPTION 'expense_immutable'; END IF;
  IF OLD.request_id IS NOT NULL THEN RAISE EXCEPTION 'expense_immutable'; END IF;
  -- Older (client-posted) expenses: wording may be fixed, money fields may not (ledger would go stale).
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.paid_with IS DISTINCT FROM OLD.paid_with
     OR NEW.spent_at IS DISTINCT FROM OLD.spent_at OR NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.shift_id IS DISTINCT FROM OLD.shift_id OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.voided_at IS DISTINCT FROM OLD.voided_at OR NEW.replaced_by IS DISTINCT FROM OLD.replaced_by
     OR NEW.replaces_expense_id IS DISTINCT FROM OLD.replaces_expense_id THEN
    RAISE EXCEPTION 'expense_immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_expenses_immutable ON public.expenses;
CREATE TRIGGER trg_expenses_immutable BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_immutable_guard();

-- Manager/owner only. Reverses the expense's ledger entries and, for a drawer expense, puts the cash
-- back through an EXPENSE_VOID movement (original shift if still open, otherwise the voider's open shift).
CREATE OR REPLACE FUNCTION public.void_expense(
  p_expense_id uuid,
  p_reason text,
  p_request_id uuid,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp public.expenses%ROWTYPE;
  v_reason text := pg_catalog.btrim(COALESCE(p_reason, ''));
  v_orig public.cash_movements%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE;
  v_ledger integer := 0; v_mv uuid;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  SELECT * INTO v_exp FROM public.expenses WHERE id = p_expense_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'expense_not_found'; END IF;
  IF NOT public.is_store_manager(v_exp.store_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_exp.voided_at IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object('expense_id', p_expense_id, 'already_voided', true);
  END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  -- Drawer side first (it takes the shift lock).
  SELECT * INTO v_orig FROM public.cash_movements
   WHERE store_id = v_exp.store_id AND expense_id = p_expense_id AND movement_type = 'EXPENSE_PAID';
  IF FOUND THEN
    SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = v_orig.shift_id FOR UPDATE;
    IF v_shift.status <> 'OPEN' THEN
      SELECT * INTO v_shift FROM public.cashier_shifts
       WHERE store_id = v_exp.store_id AND opened_by = v_uid AND status = 'OPEN' FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'open_shift_required_for_cash_void'; END IF;
    END IF;
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);

  INSERT INTO public.ledger_entries
    (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
  SELECT le.store_id, le.account,
         CASE le.direction WHEN 'DEBIT' THEN 'CREDIT' ELSE 'DEBIT' END,
         le.amount, 'EXPENSE_VOID', p_expense_id, v_reason, v_now
  FROM public.ledger_entries le
  WHERE le.store_id = v_exp.store_id AND le.reference_type = 'EXPENSE'
    AND le.reference_id::text = p_expense_id::text;
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  IF v_orig.id IS NOT NULL THEN
    INSERT INTO public.cash_movements
      (store_id, shift_id, movement_type, amount, reason, expense_id, reference_id, request_id, created_by, created_by_name)
    VALUES
      (v_exp.store_id, v_shift.id, 'EXPENSE_VOID', v_orig.amount, v_reason, p_expense_id, p_expense_id,
       p_request_id, v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''))
    RETURNING id INTO v_mv;
  END IF;

  UPDATE public.expenses SET voided_at = v_now, voided_by = v_uid, void_reason = v_reason
   WHERE id = p_expense_id;
  PERFORM pg_catalog.set_config('app.m8_internal', '', true);

  RETURN pg_catalog.jsonb_build_object('expense_id', p_expense_id, 'already_voided', false,
    'ledger_rows', v_ledger, 'movement_id', v_mv);
END;
$$;
REVOKE ALL ON FUNCTION public.void_expense(uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_expense(uuid, text, uuid, text) TO authenticated;

-- Correction = void + replacement in ONE transaction. The old row is kept and linked to the new one.
CREATE OR REPLACE FUNCTION public.replace_expense(
  p_expense_id uuid,
  p_void_request_id uuid,
  p_new_request_id uuid,
  p_reason text,
  p_category text,
  p_amount numeric,
  p_note text,
  p_paid_with text,
  p_spent_at timestamptz DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exp public.expenses%ROWTYPE;
  v_void jsonb; v_new jsonb; v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_exp FROM public.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'expense_not_found'; END IF;
  IF NOT public.is_store_manager(v_exp.store_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_exp.replaced_by IS NOT NULL THEN
    -- Retry of a correction that already went through.
    IF EXISTS (SELECT 1 FROM public.expenses WHERE id = v_exp.replaced_by AND request_id = p_new_request_id) THEN
      RETURN pg_catalog.jsonb_build_object('expense_id', v_exp.replaced_by, 'duplicate', true);
    END IF;
    RAISE EXCEPTION 'already_replaced';
  END IF;

  v_void := public.void_expense(p_expense_id, p_reason, p_void_request_id, p_staff_name);
  v_new := public.record_expense(v_exp.store_id, p_new_request_id, p_category, p_amount, p_note,
                                 p_paid_with, p_spent_at, p_shift_id, p_staff_name);
  v_new_id := (v_new->>'expense_id')::uuid;

  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);
  UPDATE public.expenses SET replaced_by = v_new_id WHERE id = p_expense_id;
  UPDATE public.expenses SET replaces_expense_id = p_expense_id WHERE id = v_new_id;
  PERFORM pg_catalog.set_config('app.m8_internal', '', true);

  RETURN pg_catalog.jsonb_build_object('voided_expense_id', p_expense_id, 'expense_id', v_new_id,
    'duplicate', false, 'void', v_void, 'new', v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.replace_expense(uuid, uuid, uuid, text, text, numeric, text, text, timestamptz, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_expense(uuid, uuid, uuid, text, text, numeric, text, text, timestamptz, uuid, text) TO authenticated;

-- 8. Guards on sales and customer balances ------------------------------------------------------------
-- Sales: the only way to create a COMPLETED/REFUNDED sale or change its money fields is a function above
-- or post_sale. Open tabs (status OPEN) stay editable by the register (items, total, notes, table).
CREATE OR REPLACE FUNCTION public.sales_financial_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.m8_internal() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'OPEN' THEN RAISE EXCEPTION 'direct_sale_insert_not_allowed'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.payment_breakdown IS DISTINCT FROM OLD.payment_breakdown
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.refund_reason IS DISTINCT FROM OLD.refund_reason
     OR NEW.refund_note IS DISTINCT FROM OLD.refund_note
     OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.is_offline_sync IS DISTINCT FROM OLD.is_offline_sync
     OR (OLD.status <> 'OPEN' AND NEW.total_amount IS DISTINCT FROM OLD.total_amount) THEN
    RAISE EXCEPTION 'sale_financial_fields_locked';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sales_financial_guard ON public.sales;
CREATE TRIGGER trg_sales_financial_guard BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sales_financial_guard();

CREATE OR REPLACE FUNCTION public.customers_balance_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance AND NOT public.m8_internal() THEN
    RAISE EXCEPTION 'balance_managed_by_database';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_customers_balance_guard ON public.customers;
CREATE TRIGGER trg_customers_balance_guard BEFORE UPDATE OF balance ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_balance_guard();

-- 9. post_sale: payment method validation + guard flag (generated from the M7 version) ------------------
-- Same body as the M7 version plus the lines marked M8 (payment method validation, guard flag).
CREATE OR REPLACE FUNCTION public.post_sale(p_sale_id uuid, p_store_id uuid, p_lines jsonb, p_total numeric, p_payment_method text, p_payment_breakdown jsonb, p_customer_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'COMPLETED'::text, p_payment_status text DEFAULT 'PAID'::text, p_created_at timestamp with time zone DEFAULT now(), p_is_offline_sync boolean DEFAULT false, p_shift_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_existing_store uuid;
  v_line jsonb;
  v_item uuid; v_qty integer; v_price numeric; v_unit text; v_conv integer;
  v_cost numeric; v_name text; v_stock integer; v_need integer;
  v_subtotal numeric := 0;
  v_tax_rate numeric;
  v_credit numeric := 0; v_split jsonb; v_split_sum numeric := 0; v_amt numeric;
  v_distinct integer; v_found integer;
  v_cogs numeric := 0; v_tax numeric; v_revenue numeric;
  v_method text; v_acct text; v_ledger boolean;
  -- M7
  v_shift public.cashier_shifts%ROWTYPE; v_shift_id uuid := NULL; v_when timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- SECURITY DEFINER bypasses RLS, so membership checks are mandatory.
  IF NOT (public.is_store_member(p_store_id) OR public.owns_store(p_store_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  -- Idempotency
  SELECT store_id INTO v_existing_store FROM public.sales WHERE id = p_sale_id;
  IF FOUND THEN
    IF v_existing_store = p_store_id THEN
      RETURN jsonb_build_object('sale_id', p_sale_id, 'already_posted', true,
        'ledger_posted', EXISTS (SELECT 1 FROM public.ledger_entries
                                 WHERE store_id = p_store_id AND reference_type = 'SALE'
                                   AND reference_id::text = p_sale_id::text));
    END IF;
    RAISE EXCEPTION 'SALE_ID_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  -- Lines: shape, positive numbers, unit/conversion must match item_units
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'EMPTY_SALE' USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_item := (v_line->>'item_id')::uuid;
    v_qty := (v_line->>'quantity')::integer;
    v_price := (v_line->>'unit_price')::numeric;
    v_unit := NULLIF(v_line->>'unit_name', '');
    v_conv := COALESCE((v_line->>'conversion')::integer, 1);
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'P0001'; END IF;
    IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE' USING ERRCODE = 'P0001'; END IF;
    IF v_conv <= 0 THEN RAISE EXCEPTION 'INVALID_CONVERSION' USING ERRCODE = 'P0001'; END IF;
    IF v_unit IS NOT NULL OR v_conv <> 1 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.item_units
        WHERE item_id = v_item AND unit_name = v_unit AND conversion = v_conv
      ) THEN
        RAISE EXCEPTION 'INVALID_UNIT' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  -- Total must equal subtotal + tax (stores.tax_rate is a percent e.g. 5.0)
  SELECT COALESCE(tax_rate, 0) / 100.0 INTO v_tax_rate FROM public.stores WHERE id = p_store_id;
  IF abs(p_total - (v_subtotal * (1 + v_tax_rate))) > 0.01 THEN
    RAISE EXCEPTION 'TOTAL_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  -- Payment breakdown must be non-negative and equal the total
  IF p_payment_breakdown IS NULL OR jsonb_array_length(p_payment_breakdown) = 0 THEN
    RAISE EXCEPTION 'PAYMENT_REQUIRED' USING ERRCODE = 'P0001';
  END IF;
  FOR v_split IN SELECT value FROM jsonb_array_elements(p_payment_breakdown) LOOP
    v_amt := COALESCE((v_split->>'amount')::numeric, 0);
    IF NOT public.payment_method_valid(v_split->>'method') THEN
      RAISE EXCEPTION 'INVALID_PAYMENT_METHOD' USING ERRCODE = 'P0001';
    END IF;
    IF v_amt < 0 THEN RAISE EXCEPTION 'NEGATIVE_PAYMENT' USING ERRCODE = 'P0001'; END IF;
    v_split_sum := v_split_sum + v_amt;
    IF (v_split->>'method') = 'အကြွေး' THEN v_credit := v_credit + v_amt; END IF;
  END LOOP;
  IF abs(v_split_sum - p_total) > 0.005 THEN
    RAISE EXCEPTION 'PAYMENT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  -- Credit needs a customer of THIS store
  IF v_credit > 0 THEN
    IF p_customer_id IS NULL THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED' USING ERRCODE = 'P0001'; END IF;
  END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_IN_STORE' USING ERRCODE = 'P0001';
  END IF;

  -- M7: shift link. FOR SHARE keeps close_shift (FOR UPDATE) from slipping in between this check
  -- and the insert. A live sale on a missing/foreign/closed shift is refused; an OFFLINE sale is never
  -- refused for shift reasons (the sale must not be lost): it is linked only when the shift is this
  -- store's, usable by the caller, and was open at the time the sale was rung up, else left unlinked.
  v_when := COALESCE(p_created_at, now());
  IF p_shift_id IS NOT NULL THEN
    SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR SHARE;
    IF NOT FOUND OR v_shift.store_id <> p_store_id THEN
      IF NOT COALESCE(p_is_offline_sync, false) THEN
        RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = 'P0001';
      END IF;
    ELSIF NOT (v_shift.opened_by = v_user OR public.is_store_manager(p_store_id)) THEN
      IF NOT COALESCE(p_is_offline_sync, false) THEN
        RAISE EXCEPTION 'SHIFT_ACCESS_DENIED' USING ERRCODE = '42501';
      END IF;
    ELSIF COALESCE(p_is_offline_sync, false) THEN
      IF v_when >= v_shift.opened_at AND (v_shift.closed_at IS NULL OR v_when <= v_shift.closed_at) THEN
        v_shift_id := p_shift_id;
      END IF;
    ELSE
      IF v_shift.status <> 'OPEN' THEN
        RAISE EXCEPTION 'SHIFT_CLOSED' USING ERRCODE = 'P0001';
      END IF;
      v_shift_id := p_shift_id;
    END IF;
  END IF;
  IF v_shift_id IS NULL AND NOT COALESCE(p_is_offline_sync, false)
     AND COALESCE(p_status, 'COMPLETED') = 'COMPLETED'
     AND COALESCE((SELECT require_shift FROM public.stores WHERE id = p_store_id), false) THEN
    RAISE EXCEPTION 'SHIFT_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  -- Every item must exist in THIS store; lock them and check stock per item
  SELECT count(DISTINCT (l->>'item_id')::uuid) INTO v_distinct FROM jsonb_array_elements(p_lines) l;
  v_found := 0;
  FOR v_item, v_need, v_name, v_stock IN
    WITH req AS (
      SELECT (l->>'item_id')::uuid AS item_id,
             SUM((l->>'quantity')::integer * COALESCE((l->>'conversion')::integer, 1))::integer AS need
      FROM jsonb_array_elements(p_lines) l GROUP BY 1
    )
    SELECT i.id, r.need, i.name, i.stock_quantity
    FROM req r JOIN public.items i ON i.id = r.item_id AND i.store_id = p_store_id
    ORDER BY i.id
    FOR UPDATE OF i
  LOOP
    v_found := v_found + 1;
    IF v_stock < v_need THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: % has % in stock, % required', v_name, v_stock, v_need
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  IF v_found <> v_distinct THEN
    RAISE EXCEPTION 'ITEM_NOT_IN_STORE' USING ERRCODE = 'P0001';
  END IF;

  -- M8: transaction-local flag so the sales / customers guard triggers accept this function's writes.
  PERFORM pg_catalog.set_config('app.m8_internal', '1', true);

  -- Header (concurrent identical request returns original result)
  BEGIN
    INSERT INTO public.sales (id, store_id, total_amount, payment_method, payment_breakdown,
                              customer_id, status, payment_status, is_offline_sync, created_at,
                              shift_id)
    VALUES (p_sale_id, p_store_id, p_total, p_payment_method, p_payment_breakdown,
            p_customer_id, COALESCE(p_status, 'COMPLETED'), COALESCE(p_payment_status, 'PAID'),
            COALESCE(p_is_offline_sync, false), COALESCE(p_created_at, now()), v_shift_id);
  EXCEPTION WHEN unique_violation THEN
    PERFORM pg_catalog.set_config('app.m8_internal', '', true);
    RETURN jsonb_build_object('sale_id', p_sale_id, 'already_posted', true,
      'ledger_posted', EXISTS (SELECT 1 FROM public.ledger_entries
                               WHERE store_id = p_store_id AND reference_type = 'SALE'
                                 AND reference_id::text = p_sale_id::text));
  END;

  -- Lines + Movements (trg_decrement_stock lowers stock on each sale_items insert)
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_item := (v_line->>'item_id')::uuid;
    v_qty := (v_line->>'quantity')::integer;
    v_price := (v_line->>'unit_price')::numeric;
    v_unit := NULLIF(v_line->>'unit_name', '');
    v_conv := COALESCE((v_line->>'conversion')::integer, 1);
    SELECT COALESCE(cost_price, 0) INTO v_cost FROM public.items WHERE id = v_item AND store_id = p_store_id;
    INSERT INTO public.sale_items (sale_id, item_id, quantity, unit_price, unit_name, conversion, unit_cost)
    VALUES (p_sale_id, v_item, v_qty, v_price, v_unit, v_conv, v_cost * v_conv);
    v_cogs := v_cogs + (v_qty * v_cost * v_conv);
    INSERT INTO public.inventory_movements (store_id, item_id, movement_type, quantity, reference_id, created_by, created_at)
    VALUES (p_store_id, v_item, 'SALE', -(v_qty * v_conv), p_sale_id, v_user, COALESCE(p_created_at, now()));
  END LOOP;

  -- Credit: atomic balance increase + debt record
  IF v_credit > 0 THEN
    UPDATE public.customers SET balance = balance + v_credit, updated_at = now() WHERE id = p_customer_id;
    INSERT INTO public.debt_payments (store_id, party_type, party_id, amount, method, note, created_at)
    VALUES (p_store_id, 'CUSTOMER', p_customer_id, -v_credit, 'အကြွေး',
            'အကြွေးရောင်းချမှု · ' || p_sale_id::text, COALESCE(p_created_at, now()));
  END IF;

  -- Ledger (M6.4): same transaction as the sale, so a sale can never exist without its entries.
  -- Amounts are derived here, not trusted from the client: tax from stores.tax_rate, COGS from the
  -- cost snapshot just written to sale_items. Open tabs / non-COMPLETED sales post nothing yet.
  v_ledger := false;
  IF COALESCE(p_status, 'COMPLETED') = 'COMPLETED' THEN
    v_tax := round(v_subtotal * v_tax_rate, 4);
    v_revenue := v_split_sum - v_tax;  -- debits (sum of splits) always equal credits

    FOR v_split IN SELECT value FROM jsonb_array_elements(p_payment_breakdown) LOOP
      v_amt := COALESCE((v_split->>'amount')::numeric, 0);
      v_method := COALESCE(NULLIF(v_split->>'method', ''), p_payment_method);
      CONTINUE WHEN v_amt <= 0;
      v_acct := CASE
        WHEN v_method = 'အကြွေး' THEN 'ACCOUNTS_RECEIVABLE'
        WHEN lower(v_method) LIKE '%kbz%' THEN 'KBZPAY'
        WHEN lower(v_method) LIKE '%wave%' THEN 'WAVEPAY'
        ELSE 'CASH'
      END;
      INSERT INTO public.ledger_entries
        (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
      VALUES
        (p_store_id, v_acct, 'DEBIT', round(v_amt, 4), 'SALE', p_sale_id, v_method,
         COALESCE(p_created_at, now()));
    END LOOP;

    IF v_revenue > 0 THEN
      INSERT INTO public.ledger_entries
        (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
      VALUES (p_store_id, 'SALES_REVENUE', 'CREDIT', round(v_revenue, 4), 'SALE', p_sale_id,
              p_payment_method, COALESCE(p_created_at, now()));
    END IF;
    IF v_tax > 0 THEN
      INSERT INTO public.ledger_entries
        (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
      VALUES (p_store_id, 'TAX_PAYABLE', 'CREDIT', v_tax, 'SALE', p_sale_id,
              p_payment_method, COALESCE(p_created_at, now()));
    END IF;
    IF v_cogs > 0 THEN
      INSERT INTO public.ledger_entries
        (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
      VALUES
        (p_store_id, 'COGS', 'DEBIT', round(v_cogs, 4), 'SALE', p_sale_id, p_payment_method,
         COALESCE(p_created_at, now())),
        (p_store_id, 'INVENTORY', 'CREDIT', round(v_cogs, 4), 'SALE', p_sale_id, p_payment_method,
         COALESCE(p_created_at, now()));
    END IF;
    v_ledger := true;
  END IF;

  PERFORM pg_catalog.set_config('app.m8_internal', '', true);
  RETURN jsonb_build_object('sale_id', p_sale_id, 'already_posted', false, 'ledger_posted', v_ledger,
    'shift_linked', v_shift_id IS NOT NULL, 'shift_id', v_shift_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.post_sale(uuid, uuid, jsonb, numeric, text, jsonb, uuid, text, text, timestamptz, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_sale(uuid, uuid, jsonb, numeric, text, jsonb, uuid, text, text, timestamptz, boolean, uuid) TO authenticated;

