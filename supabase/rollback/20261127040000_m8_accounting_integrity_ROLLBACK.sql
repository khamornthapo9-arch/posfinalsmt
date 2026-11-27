-- ROLLBACK GUIDANCE for 20261127040000_m8_accounting_integrity.sql (NOT applied; review first).
--
-- Restores the M7 behaviour of the changed functions and removes the M8 guards. Data written by M8 is
-- KEPT on purpose (sale_refunds rows, voided expenses, ledger rows with reference_type REFUND /
-- EXPENSE_VOID / CUSTOMER_PAYMENT, cash_movements of the new types): financial history is never deleted.
-- Because of that the cash_movements CHECK is only narrowed when no new-type rows exist (step 4).
-- Apply the previous client build BEFORE or together with this rollback.

-- 1. Remove the guards first (they would block the old client's direct writes otherwise).
DROP TRIGGER IF EXISTS trg_sales_financial_guard ON public.sales;
DROP TRIGGER IF EXISTS trg_customers_balance_guard ON public.customers;
DROP FUNCTION IF EXISTS public.sales_financial_guard();
DROP FUNCTION IF EXISTS public.customers_balance_guard();

-- 2. New functions (money already moved by them stays in the tables).
DROP FUNCTION IF EXISTS public.refund_sale(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.pay_open_tab(uuid, numeric, text, jsonb, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.receive_customer_payment(uuid, uuid, numeric, text, uuid, text);
DROP FUNCTION IF EXISTS public.void_expense(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.replace_expense(uuid, uuid, uuid, text, text, numeric, text, text, timestamptz, uuid, text);

-- 3. M7 versions of the changed functions.
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

-- 4. Narrow the movement type list back (ONLY if no row uses a new type; otherwise leave it widened).
-- SELECT count(*) FROM public.cash_movements WHERE movement_type IN
--   ('OWNER_CONTRIBUTION','OWNER_WITHDRAWAL','SAFE_TO_DRAWER','CUSTOMER_PAYMENT','EXPENSE_VOID');
-- If 0:
-- ALTER TABLE public.cash_movements DROP CONSTRAINT cash_movements_movement_type_check;
-- ALTER TABLE public.cash_movements ADD CONSTRAINT cash_movements_movement_type_check
--   CHECK (movement_type IN ('CASH_IN','CASH_OUT','CASH_DROP','EXPENSE_PAID','REFUND_PAID'));

-- 5. Helpers m8_internal() / payment_method_valid() and the new tables/columns are harmless and kept.
