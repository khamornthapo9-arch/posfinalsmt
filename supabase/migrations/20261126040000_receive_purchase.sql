-- G2: atomic purchase receiving with last-cost costing and a recorded payment method.
--
-- NOT YET APPLIED. Review before running. Idempotent: applying it twice is harmless.
--
-- What this migration does
--   1. purchases.payment_method (nullable text, CHECK CASH | KBZPAY | WAVEPAY). The method the
--      prepayment (amount_paid) was made with. Existing rows keep NULL.
--   2. Replaces update_draft_purchase with a version that also accepts an optional
--      p_payment_method (appended last, DEFAULT NULL). The old 6-argument function is dropped so no
--      ambiguous overload remains; callers that omit the new argument keep working.
--   3. receive_purchase(p_purchase_id, p_payment_method): receives a WHOLE purchase in ONE
--      transaction: stock, last cost, inventory movements, supplier balance, balanced ledger
--      entries and the purchase status commit together or not at all.
--
-- It does not touch: sale_items (historical unit_cost snapshots stay as they are), existing
-- purchases, items other than the ones on the received purchase, or any other table.
--
-- Security (receive_purchase): SECURITY DEFINER with an EMPTY search_path (every object is
-- schema-qualified). It bypasses row-level security, so it authorises explicitly: the caller must be
-- authenticated and must be MANAGER (has_store_role also accepts the store owner) of the store of
-- the PURCHASE ROW read from the database. The check runs before locking and again after the lock.
--
-- Concurrency: the purchase header is locked FOR UPDATE, then each item row FOR UPDATE in
-- (item_id, line id) order (a stable order, so two receives cannot deadlock). Stock is changed as
-- stock = stock + delta on the locked row.
--
-- Idempotency: a purchase that is already received returns {already_received: true} and changes
-- nothing (no stock, movement, ledger, supplier or status change).
--
-- Costing: LAST COST. items.cost_price := unit_cost / conversion (cost per BASE unit), at full
-- numeric precision (the column is unconstrained numeric). A line with unit_cost = 0 does not
-- overwrite the cost (a free/unpriced line must not zero the item's cost).
--
-- Payment: when amount_paid > 0 the credit goes to the account of the recorded payment method
-- (CASH / KBZPAY / WAVEPAY). The method is taken from purchases.payment_method, or from
-- p_payment_method when the purchase has none (older orders); if neither is present the receive is
-- refused ('payment_method_required'). It never defaults to CASH.

-- 1. Column ---------------------------------------------------------------------------------------
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_method text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'purchases_payment_method_check'
      AND conrelid = 'public.purchases'::regclass
  ) THEN
    ALTER TABLE public.purchases
      ADD CONSTRAINT purchases_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'KBZPAY', 'WAVEPAY'));
  END IF;
END
$$;

-- 2. update_draft_purchase (adds optional payment method) -----------------------------------------
DROP FUNCTION IF EXISTS public.update_draft_purchase(uuid, uuid, numeric, text, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.update_draft_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_amount_paid numeric,
  p_notes text,
  p_lines jsonb,
  p_confirm boolean DEFAULT false,
  p_payment_method text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_line jsonb;
  v_total numeric := 0;
  v_qty numeric;
  v_cost numeric;
  v_conv integer;
BEGIN
  -- Lock the header so two edits/confirms of the same draft cannot interleave.
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;
  IF v_purchase.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only_draft_editable';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'invalid_lines';
  END IF;
  IF p_confirm AND jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'empty_purchase';
  END IF;
  IF p_amount_paid IS NULL OR p_amount_paid < 0 THEN
    RAISE EXCEPTION 'invalid_amount_paid';
  END IF;
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('CASH', 'KBZPAY', 'WAVEPAY') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;
  IF p_supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND store_id = v_purchase.store_id
  ) THEN
    RAISE EXCEPTION 'supplier_not_in_store';
  END IF;

  -- Validate every line before changing anything.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::numeric;
    v_cost := (v_line->>'unit_cost')::numeric;
    v_conv := COALESCE((v_line->>'conversion')::integer, 1);
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    -- purchase_items.quantity is an INTEGER column (verified live): reject fractions instead of
    -- letting PostgreSQL round them silently (0.4 would otherwise be stored as 0).
    IF v_qty <> trunc(v_qty) THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    IF v_cost IS NULL OR v_cost < 0 THEN RAISE EXCEPTION 'invalid_cost'; END IF;
    IF v_conv < 1 THEN RAISE EXCEPTION 'invalid_conversion'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = (v_line->>'item_id')::uuid AND store_id = v_purchase.store_id
    ) THEN
      RAISE EXCEPTION 'item_not_in_store';
    END IF;
    v_total := v_total + v_qty * v_cost;
  END LOOP;

  IF p_amount_paid > v_total THEN
    RAISE EXCEPTION 'amount_paid_exceeds_total';
  END IF;

  -- Replace the lines. Any error from here on rolls back the whole function, restoring the
  -- original header and lines.
  DELETE FROM public.purchase_items WHERE purchase_id = p_purchase_id;
  INSERT INTO public.purchase_items
    (purchase_id, item_id, quantity, unit_cost, unit_name, conversion, received_quantity)
  SELECT
    p_purchase_id,
    (l->>'item_id')::uuid,
    (l->>'quantity')::numeric,
    (l->>'unit_cost')::numeric,
    NULLIF(l->>'unit_name', ''),
    COALESCE((l->>'conversion')::integer, 1),
    0
  FROM jsonb_array_elements(p_lines) AS l;

  UPDATE public.purchases
  SET supplier_id = p_supplier_id,
      total_amount = v_total,
      amount_paid = p_amount_paid,
      -- A method only means something when money was paid.
      payment_method = CASE WHEN p_amount_paid > 0 THEN p_payment_method ELSE NULL END,
      notes = NULLIF(p_notes, ''),
      status = CASE WHEN p_confirm THEN 'ORDERED' ELSE status END,
      updated_at = now()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'id', p_purchase_id,
    'status', CASE WHEN p_confirm THEN 'ORDERED' ELSE 'DRAFT' END,
    'total_amount', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_draft_purchase(uuid, uuid, numeric, text, jsonb, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_draft_purchase(uuid, uuid, numeric, text, jsonb, boolean, text) TO authenticated;

-- 3. receive_purchase -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase(
  p_purchase_id uuid,
  p_payment_method text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_store uuid;
  v_purchase public.purchases%ROWTYPE;
  v_line public.purchase_items%ROWTYPE;
  v_item public.items%ROWTYPE;
  v_conv integer;
  v_base bigint;
  v_new_stock bigint;
  v_lines integer := 0;
  v_total numeric := 0;
  v_paid numeric;
  v_unpaid numeric;
  v_method text;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Authorise against the store of the purchase row itself, before taking any lock.
  SELECT store_id INTO v_store FROM public.purchases WHERE id = p_purchase_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;
  IF NOT public.has_store_role(v_store, 'MANAGER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Lock the header, then authorise again against the locked row.
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;
  IF NOT public.has_store_role(v_purchase.store_id, 'MANAGER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Idempotent: already received -> nothing changes.
  -- 'ရရှိပြီး' is the status string the app has always written for a received purchase.
  IF v_purchase.status IN ('ရရှိပြီး', 'RECEIVED') THEN
    RETURN pg_catalog.jsonb_build_object(
      'id', p_purchase_id, 'status', v_purchase.status, 'already_received', true);
  END IF;
  IF v_purchase.status NOT IN ('ORDERED', 'စောင့်ဆိုင်းဆဲ') THEN
    RAISE EXCEPTION 'purchase_not_receivable';
  END IF;

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('CASH', 'KBZPAY', 'WAVEPAY') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  -- Validate the whole purchase before changing anything.
  SELECT pg_catalog.count(*),
         COALESCE(pg_catalog.sum(quantity * unit_cost), 0)
    INTO v_lines, v_total
  FROM public.purchase_items WHERE purchase_id = p_purchase_id;

  IF v_lines = 0 THEN
    RAISE EXCEPTION 'empty_purchase';
  END IF;
  -- Whole-purchase receive only: a line that already has received quantity means partial history.
  IF EXISTS (
    SELECT 1 FROM public.purchase_items
    WHERE purchase_id = p_purchase_id AND COALESCE(received_quantity, 0) <> 0
  ) THEN
    RAISE EXCEPTION 'partially_received';
  END IF;
  IF pg_catalog.abs(v_total - v_purchase.total_amount) > 0.005 THEN
    RAISE EXCEPTION 'total_mismatch';
  END IF;

  v_paid := pg_catalog.round(COALESCE(v_purchase.amount_paid, 0), 4);
  v_total := pg_catalog.round(v_total, 4);
  IF v_paid < 0 OR v_paid > v_total THEN
    RAISE EXCEPTION 'invalid_amount_paid';
  END IF;
  v_unpaid := v_total - v_paid;

  IF v_paid > 0 THEN
    v_method := COALESCE(v_purchase.payment_method, p_payment_method);
    IF v_method IS NULL THEN
      RAISE EXCEPTION 'payment_method_required';
    END IF;
  END IF;

  -- Items: stock, last cost, movement, received quantity.
  FOR v_line IN
    SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id ORDER BY item_id, id
  LOOP
    SELECT * INTO v_item FROM public.items
    WHERE id = v_line.item_id AND store_id = v_purchase.store_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_found';
    END IF;

    v_conv := COALESCE(v_line.conversion, 1);
    IF v_conv < 1 THEN
      RAISE EXCEPTION 'invalid_conversion';
    END IF;
    IF v_line.quantity IS NULL OR v_line.quantity <= 0 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;

    v_base := v_line.quantity::bigint * v_conv;          -- base units received
    v_new_stock := v_item.stock_quantity::bigint + v_base;
    IF v_new_stock > 2147483647 THEN
      RAISE EXCEPTION 'quantity_too_large';
    END IF;

    UPDATE public.items
    SET stock_quantity = v_new_stock::integer,
        -- Last cost per BASE unit, full precision. A zero-cost line leaves the cost as it was.
        cost_price = CASE WHEN v_line.unit_cost > 0 THEN v_line.unit_cost / v_conv
                          ELSE cost_price END
    WHERE id = v_item.id;

    INSERT INTO public.inventory_movements
      (store_id, item_id, movement_type, quantity, note, created_by, reference_id)
    VALUES
      (v_purchase.store_id, v_item.id, 'PURCHASE', v_base::integer,
       pg_catalog.format('Purchase received: %s x %s (%s per unit)',
                         v_line.quantity, COALESCE(v_line.unit_name, 'unit'), v_conv),
       v_uid, p_purchase_id);

    UPDATE public.purchase_items SET received_quantity = quantity WHERE id = v_line.id;
  END LOOP;

  -- Ledger: Dr INVENTORY = total; Cr ACCOUNTS_PAYABLE = unpaid; Cr <method account> = paid.
  IF v_total > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_purchase.store_id, 'INVENTORY', 'DEBIT', v_total, 'PURCHASE', p_purchase_id,
       'Purchase received', v_now);
  END IF;
  IF v_unpaid > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_purchase.store_id, 'ACCOUNTS_PAYABLE', 'CREDIT', v_unpaid, 'PURCHASE', p_purchase_id,
       'Purchase received', v_now);
  END IF;
  IF v_paid > 0 THEN
    INSERT INTO public.ledger_entries
      (store_id, account, direction, amount, reference_type, reference_id, memo, entry_date)
    VALUES
      (v_purchase.store_id, v_method, 'CREDIT', v_paid, 'PURCHASE', p_purchase_id,
       'Purchase received', v_now);
  END IF;

  -- Supplier balance: atomic increment inside the same transaction.
  IF v_purchase.supplier_id IS NOT NULL AND v_unpaid > 0 THEN
    UPDATE public.suppliers
    SET balance = COALESCE(balance, 0) + v_unpaid
    WHERE id = v_purchase.supplier_id AND store_id = v_purchase.store_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier_not_found';
    END IF;
  END IF;

  UPDATE public.purchases
  SET status = 'ရရှိပြီး',
      received_at = v_now,
      payment_method = CASE WHEN v_paid > 0 THEN v_method ELSE payment_method END,
      updated_at = v_now
  WHERE id = p_purchase_id;

  RETURN pg_catalog.jsonb_build_object(
    'id', p_purchase_id,
    'status', 'ရရှိပြီး',
    'already_received', false,
    'lines', v_lines,
    'total', v_total,
    'paid', v_paid,
    'unpaid', v_unpaid,
    'payment_method', v_method
  );
END;
$$;

REVOKE ALL ON FUNCTION public.receive_purchase(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase(uuid, text) TO authenticated;
