-- M7: cashier shifts, cash movements, expense integration and manager review.
--
-- NOT YET APPLIED. Review before running. Written to be re-runnable (IF NOT EXISTS / OR REPLACE).
--
-- MODEL
--   * There is no separate register table in this app: a STORE (a branch is its own store) is the
--     register/drawer. A shift belongs to one store and is opened by one signed-in ACCOUNT
--     (auth.uid()). Cashiers who share a device through the PIN switch share that account's shift;
--     the staff name chosen on screen is stored as an audit label (opened_by_name) only, because the
--     database can only authenticate accounts.
--   * One OPEN shift per (store, account): enforced by a partial unique index.
--   * Money rules are enforced here, not in the browser. Direct writes to the new tables are not
--     possible for app users (no INSERT/UPDATE/DELETE policies); everything goes through the
--     SECURITY DEFINER functions below (empty search_path, explicit authorisation, row locks,
--     idempotency keys, one transaction each).
--
-- EXPECTED CASH  = opening cash + cash sales + cash in
--                  - cash out - cash drops - cash expenses paid from the drawer - cash refunds
--   Cash sales = the CASH part of the payment split of COMPLETED/REFUNDED sales linked to the shift.
--   KBZPAY / WAVEPAY / credit (ACCOUNTS_RECEIVABLE) parts never touch drawer cash.
--
-- LEDGER (same transaction as the movement; reference_type / reference_id set for tracing)
--   CASH_IN   Dr CASH  / Cr OWNER_EQUITY        CASH_OUT  Dr OWNER_EQUITY / Cr CASH
--   CASH_DROP no entry (the cash stays inside the CASH account; it only moves drawer -> safe)
--   EXPENSE   Dr OPERATING_EXPENSE / Cr <account of the payment method>   (as the client did before)
--   REFUND    no entry here: the existing refund flow already posts the reversal; this only records
--             the drawer effect (recorded even if it would overdraw: the cash already left).
--
-- NEGATIVE CASH RULE: cash out, cash drop and drawer expenses are refused when they exceed the
-- shift's current expected cash ('insufficient_drawer_cash').
--
-- NOT CHANGED: existing rows, sale_items.unit_cost, G2 functions, historical ledger. Existing
-- expenses keep working; expenses created by record_expense become immutable (no edit/delete)
-- because their ledger entries are written with them.

-- 0. Helpers ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_account(p_method text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_method = 'အကြွေး' THEN 'ACCOUNTS_RECEIVABLE'
    WHEN pg_catalog.lower(COALESCE(p_method, '')) LIKE '%kbz%' THEN 'KBZPAY'
    WHEN pg_catalog.lower(COALESCE(p_method, '')) LIKE '%wave%' THEN 'WAVEPAY'
    ELSE 'CASH'
  END
$$;

CREATE OR REPLACE FUNCTION public.is_store_manager(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT public.has_store_role(p_store_id, 'MANAGER') OR public.has_store_role(p_store_id, 'OWNER')
$$;

-- 1. Tables ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  opened_by uuid NOT NULL,
  opened_by_name text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_cash numeric NOT NULL CHECK (opening_cash >= 0),
  request_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closed_by uuid,
  closed_by_name text,
  closed_at timestamptz,
  counted_cash numeric CHECK (counted_cash IS NULL OR counted_cash >= 0),
  expected_cash numeric,
  cash_difference numeric,
  close_note text,
  close_snapshot jsonb,
  review_status text NOT NULL DEFAULT 'NONE' CHECK (review_status IN ('NONE', 'PENDING', 'APPROVED', 'FLAGGED')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cashier_shifts_one_open
  ON public.cashier_shifts (store_id, opened_by) WHERE status = 'OPEN';
CREATE UNIQUE INDEX IF NOT EXISTS cashier_shifts_request
  ON public.cashier_shifts (store_id, request_id);
CREATE INDEX IF NOT EXISTS cashier_shifts_store_opened ON public.cashier_shifts (store_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  shift_id uuid NOT NULL REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('CASH_IN', 'CASH_OUT', 'CASH_DROP', 'EXPENSE_PAID', 'REFUND_PAID')),
  amount numeric NOT NULL CHECK (amount > 0),
  account text NOT NULL DEFAULT 'CASH' CHECK (account = 'CASH'),
  reason text NOT NULL,
  expense_id uuid,
  reference_id uuid,
  request_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cash_movements_request ON public.cash_movements (store_id, request_id);
CREATE INDEX IF NOT EXISTS cash_movements_shift ON public.cash_movements (shift_id, created_at);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS sales_shift ON public.sales (shift_id) WHERE shift_id IS NOT NULL;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_request ON public.expenses (store_id, request_id) WHERE request_id IS NOT NULL;

-- Optional store policy: when true, completed online sales must belong to an open shift.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS require_shift boolean NOT NULL DEFAULT false;

-- 2. Row-level security: read only; all writes go through the functions below -------------------------
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_select" ON public.cashier_shifts;
CREATE POLICY "shifts_select" ON public.cashier_shifts FOR SELECT TO authenticated
  USING (opened_by = auth.uid() OR public.is_store_manager(store_id));

DROP POLICY IF EXISTS "cash_movements_select" ON public.cash_movements;
CREATE POLICY "cash_movements_select" ON public.cash_movements FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_store_manager(store_id)
         OR EXISTS (SELECT 1 FROM public.cashier_shifts s WHERE s.id = shift_id AND s.opened_by = auth.uid()));

-- 3. Integrity triggers ------------------------------------------------------------------------------
-- A sale can only be linked to a shift of its own store, only once, and (for live sales) only while
-- the shift is open. Offline-synced sales may land on a shift that has since closed: they were rung
-- up while it was open. The link of an existing sale can never be changed afterwards.
CREATE OR REPLACE FUNCTION public.sales_shift_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_shift public.cashier_shifts%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.shift_id IS NOT NULL AND NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
    RAISE EXCEPTION 'shift_immutable';
  END IF;
  IF NEW.shift_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.shift_id IS NOT DISTINCT FROM NEW.shift_id THEN
    RETURN NEW;
  END IF;
  -- Linking an existing sale is only for open tabs being paid (status OPEN before the update).
  IF TG_OP = 'UPDATE' AND OLD.status <> 'OPEN' THEN
    RAISE EXCEPTION 'shift_immutable';
  END IF;
  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = NEW.shift_id;
  IF NOT FOUND OR v_shift.store_id <> NEW.store_id THEN
    RAISE EXCEPTION 'shift_store_mismatch';
  END IF;
  IF v_shift.status <> 'OPEN' AND NOT COALESCE(NEW.is_offline_sync, false) THEN
    RAISE EXCEPTION 'shift_closed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sales_shift_guard ON public.sales;
CREATE TRIGGER trg_sales_shift_guard BEFORE INSERT OR UPDATE OF shift_id ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sales_shift_guard();

-- Expenses written by record_expense carry their own ledger entries, so they cannot be edited or
-- deleted (the entries would go stale). Older expenses (request_id IS NULL) behave as before.
CREATE OR REPLACE FUNCTION public.expenses_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.request_id IS NOT NULL THEN
    RAISE EXCEPTION 'expense_immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_expenses_immutable ON public.expenses;
CREATE TRIGGER trg_expenses_immutable BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_immutable_guard();

-- 4. Totals (internal) ---------------------------------------------------------------------------------
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
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE movement_type = 'REFUND_PAID'), 0)
    INTO v_in, v_out, v_drop, v_exp, v_ref
  FROM public.cash_movements WHERE shift_id = p_shift_id;

  RETURN pg_catalog.jsonb_build_object(
    'opening_cash', v_opening,
    'cash_sales', v_cash, 'kbzpay_sales', v_kbz, 'wavepay_sales', v_wave, 'credit_sales', v_credit,
    'sale_count', v_sales,
    'cash_in', v_in, 'cash_out', v_out, 'cash_drops', v_drop,
    'cash_expenses', v_exp, 'cash_refunds', v_ref,
    'expected_cash', v_opening + v_cash + v_in - v_out - v_drop - v_exp - v_ref
  );
END;
$$;
REVOKE ALL ON FUNCTION public.shift_totals(uuid) FROM PUBLIC, anon, authenticated;

-- 5. Authorisation helper: the opener of the shift, or a manager/owner of its store -----------------
CREATE OR REPLACE FUNCTION public.can_use_shift(p_shift public.cashier_shifts)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p_shift.opened_by = auth.uid() OR public.is_store_manager(p_shift.store_id)
$$;
REVOKE ALL ON FUNCTION public.can_use_shift(public.cashier_shifts) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_shift(public.cashier_shifts) TO authenticated;
REVOKE ALL ON FUNCTION public.is_store_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_manager(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.payment_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_account(text) TO authenticated;

-- 6. open_shift -----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_shift(
  p_store_id uuid,
  p_opening_cash numeric,
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  -- Any active member (cashier, manager) or the owner of THIS store may open a shift in it.
  IF NOT (public.is_store_member(p_store_id) OR public.owns_store(p_store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT * INTO v_shift FROM public.cashier_shifts
   WHERE store_id = p_store_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_shift.opened_by <> v_uid THEN RAISE EXCEPTION 'request_id_conflict'; END IF;
    RETURN pg_catalog.jsonb_build_object('shift_id', v_shift.id, 'duplicate', true, 'status', v_shift.status);
  END IF;

  BEGIN
    INSERT INTO public.cashier_shifts (store_id, opened_by, opened_by_name, opening_cash, request_id)
    VALUES (p_store_id, v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''), p_opening_cash, p_request_id)
    RETURNING * INTO v_shift;
  EXCEPTION WHEN unique_violation THEN
    -- Either a concurrent retry of this request, or a different shift already open for this account.
    SELECT * INTO v_shift FROM public.cashier_shifts
     WHERE store_id = p_store_id AND request_id = p_request_id AND opened_by = v_uid;
    IF FOUND THEN
      RETURN pg_catalog.jsonb_build_object('shift_id', v_shift.id, 'duplicate', true, 'status', v_shift.status);
    END IF;
    RAISE EXCEPTION 'shift_already_open';
  END;
  RETURN pg_catalog.jsonb_build_object('shift_id', v_shift.id, 'duplicate', false, 'status', 'OPEN');
END;
$$;
REVOKE ALL ON FUNCTION public.open_shift(uuid, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_shift(uuid, numeric, uuid, text) TO authenticated;

-- 7. record_cash_movement (cash in / out / drop) -----------------------------------------------------
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
  IF p_type IS NULL OR p_type NOT IN ('CASH_IN', 'CASH_OUT', 'CASH_DROP') THEN
    RAISE EXCEPTION 'invalid_movement_type';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF NOT public.can_use_shift(v_shift) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Idempotent replay (checked under the shift lock).
  SELECT * INTO v_mv FROM public.cash_movements
   WHERE store_id = v_shift.store_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_mv.shift_id <> p_shift_id THEN RAISE EXCEPTION 'request_id_conflict'; END IF;
    RETURN pg_catalog.jsonb_build_object('movement_id', v_mv.id, 'duplicate', true);
  END IF;

  IF v_shift.status <> 'OPEN' THEN RAISE EXCEPTION 'shift_closed'; END IF;

  v_expected := (public.shift_totals(p_shift_id)->>'expected_cash')::numeric;
  IF p_type IN ('CASH_OUT', 'CASH_DROP') AND p_amount > v_expected THEN
    RAISE EXCEPTION 'insufficient_drawer_cash';
  END IF;

  INSERT INTO public.cash_movements
    (store_id, shift_id, movement_type, amount, reason, request_id, created_by, created_by_name)
  VALUES
    (v_shift.store_id, p_shift_id, p_type, p_amount, v_reason, p_request_id, v_uid,
     NULLIF(pg_catalog.btrim(p_staff_name), ''))
  RETURNING * INTO v_mv;

  IF p_type = 'CASH_IN' THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_shift.store_id, 'CASH', 'DEBIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at),
      (v_shift.store_id, 'OWNER_EQUITY', 'CREDIT', p_amount, 'CASH_MOVEMENT', v_mv.id, v_reason, v_mv.created_at);
  ELSIF p_type = 'CASH_OUT' THEN
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

-- 8. record_expense ---------------------------------------------------------------------------------
-- Replaces the client-side insert + ledger post. Drawer expenses (CASH + p_shift_id) reduce expected
-- cash exactly once, through ONE cash_movements row linked to the expense. Non-cash expenses
-- (KBZPAY / WAVEPAY) are posted to their own account, never touch the drawer, and need a manager.
CREATE OR REPLACE FUNCTION public.record_expense(
  p_store_id uuid,
  p_request_id uuid,
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
  v_uid uuid := auth.uid();
  v_exp public.expenses%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE;
  v_acct text;
  v_when timestamptz := COALESCE(p_spent_at, pg_catalog.now());
  v_cat text := pg_catalog.btrim(COALESCE(p_category, ''));
  v_mv uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'missing_request_id'; END IF;
  IF NOT (public.is_store_member(p_store_id) OR public.owns_store(p_store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_cat = '' THEN RAISE EXCEPTION 'category_required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  v_acct := public.payment_account(p_paid_with);
  IF v_acct = 'ACCOUNTS_RECEIVABLE' THEN RAISE EXCEPTION 'invalid_payment_method'; END IF;
  IF p_shift_id IS NOT NULL AND v_acct <> 'CASH' THEN RAISE EXCEPTION 'drawer_requires_cash'; END IF;
  IF v_acct <> 'CASH' AND NOT public.is_store_manager(p_store_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_acct = 'CASH' AND p_shift_id IS NULL AND NOT public.is_store_manager(p_store_id) THEN
    RAISE EXCEPTION 'shift_required';
  END IF;

  -- Lock the shift first (when used) so drawer expenses serialise with other movements.
  IF p_shift_id IS NOT NULL THEN
    SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND OR v_shift.store_id <> p_store_id THEN RAISE EXCEPTION 'shift_not_found'; END IF;
    IF NOT public.can_use_shift(v_shift) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;

  SELECT * INTO v_exp FROM public.expenses WHERE store_id = p_store_id AND request_id = p_request_id;
  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object('expense_id', v_exp.id, 'duplicate', true);
  END IF;

  IF p_shift_id IS NOT NULL THEN
    IF v_shift.status <> 'OPEN' THEN RAISE EXCEPTION 'shift_closed'; END IF;
    IF p_amount > (public.shift_totals(p_shift_id)->>'expected_cash')::numeric THEN
      RAISE EXCEPTION 'insufficient_drawer_cash';
    END IF;
  END IF;

  INSERT INTO public.expenses (store_id, category, amount, note, paid_with, spent_at, shift_id, request_id)
  VALUES (p_store_id, v_cat, p_amount, NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), ''),
          COALESCE(NULLIF(p_paid_with, ''), 'ငွေသား'), v_when, p_shift_id, p_request_id)
  RETURNING * INTO v_exp;

  INSERT INTO public.ledger_entries
    (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
  VALUES
    (p_store_id, 'OPERATING_EXPENSE', 'DEBIT', p_amount, 'EXPENSE', v_exp.id, v_cat, v_when),
    (p_store_id, v_acct, 'CREDIT', p_amount, 'EXPENSE', v_exp.id, v_cat, v_when);

  IF p_shift_id IS NOT NULL THEN
    INSERT INTO public.cash_movements
      (store_id, shift_id, movement_type, amount, reason, expense_id, reference_id, request_id,
       created_by, created_by_name)
    VALUES
      (p_store_id, p_shift_id, 'EXPENSE_PAID', p_amount, v_cat, v_exp.id, v_exp.id, p_request_id,
       v_uid, NULLIF(pg_catalog.btrim(p_staff_name), ''))
    RETURNING id INTO v_mv;
  END IF;

  RETURN pg_catalog.jsonb_build_object('expense_id', v_exp.id, 'duplicate', false,
    'movement_id', v_mv, 'account', v_acct);
END;
$$;
REVOKE ALL ON FUNCTION public.record_expense(uuid, uuid, text, numeric, text, text, timestamptz, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_expense(uuid, uuid, text, numeric, text, text, timestamptz, uuid, text) TO authenticated;

-- 9. record_refund_cash -----------------------------------------------------------------------------
-- Records the DRAWER effect of an already-refunded sale: the cash part of the original payment is
-- paid back from the refunder's open shift. Amount is derived from the sale, not trusted from the
-- client. No ledger entry (the refund flow posts the reversal). Idempotent per sale.
CREATE OR REPLACE FUNCTION public.record_refund_cash(
  p_sale_id uuid,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sale public.sales%ROWTYPE;
  v_shift public.cashier_shifts%ROWTYPE;
  v_mv public.cash_movements%ROWTYPE;
  v_cash numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sale_not_found'; END IF;
  IF NOT (public.is_store_member(v_sale.store_id) OR public.owns_store(v_sale.store_id)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_sale.status <> 'REFUNDED' THEN RAISE EXCEPTION 'sale_not_refunded'; END IF;

  SELECT * INTO v_shift FROM public.cashier_shifts
   WHERE store_id = v_sale.store_id AND opened_by = v_uid AND status = 'OPEN' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'no_open_shift');
  END IF;

  SELECT * INTO v_mv FROM public.cash_movements
   WHERE store_id = v_sale.store_id AND request_id = p_sale_id;
  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object('recorded', true, 'duplicate', true, 'movement_id', v_mv.id);
  END IF;

  IF pg_catalog.jsonb_typeof(v_sale.payment_breakdown) = 'array'
     AND pg_catalog.jsonb_array_length(v_sale.payment_breakdown) > 0 THEN
    SELECT COALESCE(pg_catalog.sum((b.value->>'amount')::numeric), 0) INTO v_cash
    FROM pg_catalog.jsonb_array_elements(v_sale.payment_breakdown) AS b(value)
    WHERE public.payment_account(COALESCE(NULLIF(b.value->>'method', ''), v_sale.payment_method)) = 'CASH';
  ELSIF public.payment_account(v_sale.payment_method) = 'CASH' THEN
    v_cash := v_sale.total_amount;
  END IF;
  IF v_cash <= 0 THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'no_cash_portion');
  END IF;

  INSERT INTO public.cash_movements
    (store_id, shift_id, movement_type, amount, reason, reference_id, request_id, created_by, created_by_name)
  VALUES
    (v_sale.store_id, v_shift.id, 'REFUND_PAID', v_cash,
     COALESCE(NULLIF(v_sale.refund_reason, ''), 'Refund'), p_sale_id, p_sale_id, v_uid,
     NULLIF(pg_catalog.btrim(p_staff_name), ''))
  RETURNING * INTO v_mv;
  RETURN pg_catalog.jsonb_build_object('recorded', true, 'duplicate', false, 'movement_id', v_mv.id,
    'amount', v_cash);
END;
$$;
REVOKE ALL ON FUNCTION public.record_refund_cash(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_refund_cash(uuid, text) TO authenticated;

-- 10. close_shift -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_shift(
  p_shift_id uuid,
  p_counted_cash numeric,
  p_note text DEFAULT NULL,
  p_staff_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift public.cashier_shifts%ROWTYPE;
  v_totals jsonb;
  v_expected numeric;
  v_diff numeric;
  v_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  -- FOR UPDATE waits for any in-flight movement/sale holding the shift (post_sale takes FOR SHARE).
  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF NOT public.can_use_shift(v_shift) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Idempotent: an already closed shift is returned unchanged (the counted amount is never overwritten).
  IF v_shift.status = 'CLOSED' THEN
    RETURN pg_catalog.jsonb_build_object('shift_id', p_shift_id, 'already_closed', true,
      'expected_cash', v_shift.expected_cash, 'counted_cash', v_shift.counted_cash,
      'cash_difference', v_shift.cash_difference, 'review_status', v_shift.review_status);
  END IF;

  v_totals := public.shift_totals(p_shift_id);
  v_expected := (v_totals->>'expected_cash')::numeric;
  v_diff := p_counted_cash - v_expected;
  IF v_diff <> 0 AND v_note IS NULL THEN RAISE EXCEPTION 'note_required_for_difference'; END IF;

  UPDATE public.cashier_shifts
  SET status = 'CLOSED', closed_by = v_uid, closed_by_name = NULLIF(pg_catalog.btrim(p_staff_name), ''),
      closed_at = pg_catalog.now(), counted_cash = p_counted_cash, expected_cash = v_expected,
      cash_difference = v_diff, close_note = v_note, close_snapshot = v_totals,
      review_status = CASE WHEN v_diff = 0 THEN 'NONE' ELSE 'PENDING' END
  WHERE id = p_shift_id;

  RETURN pg_catalog.jsonb_build_object('shift_id', p_shift_id, 'already_closed', false,
    'expected_cash', v_expected, 'counted_cash', p_counted_cash, 'cash_difference', v_diff,
    'review_status', CASE WHEN v_diff = 0 THEN 'NONE' ELSE 'PENDING' END);
END;
$$;
REVOKE ALL ON FUNCTION public.close_shift(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_shift(uuid, numeric, text, text) TO authenticated;

-- 11. review_shift ----------------------------------------------------------------------------------
-- Manager/owner of the shift's store only. Never touches counted/expected/difference. A closer
-- cannot APPROVE their own non-zero discrepancy unless they own the store.
CREATE OR REPLACE FUNCTION public.review_shift(
  p_shift_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift public.cashier_shifts%ROWTYPE;
  v_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('APPROVED', 'FLAGGED') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;
  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF NOT public.is_store_manager(v_shift.store_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_shift.status <> 'CLOSED' THEN RAISE EXCEPTION 'shift_not_closed'; END IF;
  IF v_shift.review_status = 'APPROVED' THEN RAISE EXCEPTION 'already_approved'; END IF;
  IF p_decision = 'APPROVED' AND v_shift.closed_by = v_uid
     AND v_shift.cash_difference <> 0 AND NOT public.owns_store(v_shift.store_id) THEN
    RAISE EXCEPTION 'self_review_not_allowed';
  END IF;
  IF (p_decision = 'FLAGGED' OR v_shift.cash_difference <> 0) AND v_note IS NULL THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  UPDATE public.cashier_shifts
  SET review_status = p_decision, reviewed_by = v_uid, reviewed_at = pg_catalog.now(), review_note = v_note
  WHERE id = p_shift_id;
  RETURN pg_catalog.jsonb_build_object('shift_id', p_shift_id, 'review_status', p_decision);
END;
$$;
REVOKE ALL ON FUNCTION public.review_shift(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_shift(uuid, text, text) TO authenticated;

-- 12. get_shift_summary -----------------------------------------------------------------------------
-- Live figures for the screen. For a closed shift, 'late_adjustment' = live expected - the closing
-- snapshot (non-zero only if an offline sale of that shift synced after closing).
CREATE OR REPLACE FUNCTION public.get_shift_summary(p_shift_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_shift public.cashier_shifts%ROWTYPE;
  v_t jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF NOT public.can_use_shift(v_shift) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  v_t := public.shift_totals(p_shift_id);
  RETURN v_t || pg_catalog.jsonb_build_object(
    'late_adjustment',
    CASE WHEN v_shift.status = 'CLOSED'
         THEN (v_t->>'expected_cash')::numeric - v_shift.expected_cash ELSE 0 END);
END;
$$;
REVOKE ALL ON FUNCTION public.get_shift_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shift_summary(uuid) TO authenticated;

-- 13. post_sale: links the sale to a shift (replaces the previous version) ------------------------------
-- Same body as 20261125020000_post_sale_ledger.sql plus the additions marked "M7". The old
-- 11-argument function is dropped first so that no ambiguous overload remains.
DROP FUNCTION IF EXISTS public.post_sale(uuid, uuid, jsonb, numeric, text, jsonb, uuid, text, text, timestamptz, boolean);

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

  -- Header (concurrent identical request returns original result)
  BEGIN
    INSERT INTO public.sales (id, store_id, total_amount, payment_method, payment_breakdown,
                              customer_id, status, payment_status, is_offline_sync, created_at,
                              shift_id)
    VALUES (p_sale_id, p_store_id, p_total, p_payment_method, p_payment_breakdown,
            p_customer_id, COALESCE(p_status, 'COMPLETED'), COALESCE(p_payment_status, 'PAID'),
            COALESCE(p_is_offline_sync, false), COALESCE(p_created_at, now()), v_shift_id);
  EXCEPTION WHEN unique_violation THEN
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

  RETURN jsonb_build_object('sale_id', p_sale_id, 'already_posted', false, 'ledger_posted', v_ledger,
    'shift_linked', v_shift_id IS NOT NULL, 'shift_id', v_shift_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.post_sale(uuid, uuid, jsonb, numeric, text, jsonb, uuid, text, text, timestamptz, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_sale(uuid, uuid, jsonb, numeric, text, jsonb, uuid, text, text, timestamptz, boolean, uuid) TO authenticated;
