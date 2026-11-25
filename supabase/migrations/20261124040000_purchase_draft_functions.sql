-- G1 purchase safety: transactional draft edit and confirm.
--
-- NOT YET APPLIED. Review before running. Idempotent (CREATE OR REPLACE), so applying it twice
-- is harmless. It creates two functions only: no table, column, policy or data change.
--
-- Both functions run as the CALLER (SECURITY INVOKER, the default), so the existing row-level
-- security on public.purchases / public.purchase_items (owner and manager of the store) applies
-- exactly as it does for direct table access. A purchase the caller cannot see is "not found".
-- Neither function touches items, suppliers, ledger_entries or inventory_movements.

CREATE OR REPLACE FUNCTION public.update_draft_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_amount_paid numeric,
  p_notes text,
  p_lines jsonb,
  p_confirm boolean DEFAULT false
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

CREATE OR REPLACE FUNCTION public.confirm_purchase(p_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;
  IF v_purchase.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only_draft_confirmable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.purchase_items WHERE purchase_id = p_purchase_id) THEN
    RAISE EXCEPTION 'empty_purchase';
  END IF;
  UPDATE public.purchases SET status = 'ORDERED', updated_at = now() WHERE id = p_purchase_id;
  RETURN jsonb_build_object('id', p_purchase_id, 'status', 'ORDERED');
END;
$$;

REVOKE ALL ON FUNCTION public.update_draft_purchase(uuid, uuid, numeric, text, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_draft_purchase(uuid, uuid, numeric, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_purchase(uuid) TO authenticated;
