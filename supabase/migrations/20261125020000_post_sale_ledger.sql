-- M6.4: post the sale's ledger entries INSIDE post_sale (same transaction as the sale).
--
-- NOT YET APPLIED. This replaces the live public.post_sale(...) with CREATE OR REPLACE. The signature,
-- SECURITY DEFINER and `SET search_path TO 'public'` are IDENTICAL to the live function, so existing
-- grants and callers are unaffected. The body below is the live definition (captured from
-- pg_get_functiondef on 2026-11-25) with ONLY these additions, marked in the code:
--   1. extra DECLAREs (v_cogs, v_tax, v_revenue, v_method, v_acct, v_ledger)
--   2. v_cogs accumulated per sale line from the same cost snapshot stored in sale_items.unit_cost
--   3. a ledger block before the final RETURN (only when status is COMPLETED)
--   4. both 'already_posted' returns and the final return now include 'ledger_posted' (boolean)
--
-- 'ledger_posted' lets the client skip its own ledger call only when the database already wrote the
-- entries, so deploy order is safe: old function -> client keeps posting as today; new function ->
-- client skips. An already_posted replay reports whether SALE entries already exist for that sale.
--
-- Entries per COMPLETED sale (reference_type 'SALE', reference_id = sale id, entry_date = sale time):
--   DEBIT  one asset account per payment split: CASH / KBZPAY / WAVEPAY / ACCOUNTS_RECEIVABLE
--   CREDIT SALES_REVENUE (= sum of splits - tax)   CREDIT TAX_PAYABLE (= round(subtotal * rate, 4))
--   DEBIT  COGS / CREDIT INVENTORY (= sum of qty * unit_cost)   [only when cost > 0]
-- Debits always equal credits. Zero amounts are skipped. NOT backfilled for existing sales.

CREATE OR REPLACE FUNCTION public.post_sale(p_sale_id uuid, p_store_id uuid, p_lines jsonb, p_total numeric, p_payment_method text, p_payment_breakdown jsonb, p_customer_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'COMPLETED'::text, p_payment_status text DEFAULT 'PAID'::text, p_created_at timestamp with time zone DEFAULT now(), p_is_offline_sync boolean DEFAULT false)
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
                              customer_id, status, payment_status, is_offline_sync, created_at)
    VALUES (p_sale_id, p_store_id, p_total, p_payment_method, p_payment_breakdown,
            p_customer_id, COALESCE(p_status, 'COMPLETED'), COALESCE(p_payment_status, 'PAID'),
            COALESCE(p_is_offline_sync, false), COALESCE(p_created_at, now()));
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

  RETURN jsonb_build_object('sale_id', p_sale_id, 'already_posted', false, 'ledger_posted', v_ledger);
END;
$function$;
