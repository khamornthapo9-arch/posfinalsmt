-- M6.1: atomic, delta-based stock adjustment.
--
-- NOT YET APPLIED. Review before running. Idempotent (CREATE OR REPLACE): applying it twice is
-- harmless. Creates ONE function; no table, column, policy, trigger or data change.
--
-- Why: the app used to (1) overwrite items.stock_quantity with an absolute number computed from
-- cached browser data, then (2) insert the inventory_movements row separately, logging (not
-- raising) a failure of step 2. Two devices could overwrite each other and stock could change
-- with no movement record.
--
-- Security: SECURITY DEFINER with a fixed search_path. Because it bypasses row-level security it
-- authorises the caller explicitly, using the store of the ITEM ROW read from the database (never
-- trusting the store id alone), and requires MANAGER (has_store_role also accepts the store
-- owner, matching the existing "Managers manage inventory" policy on items).
--
-- Concurrency: the item row is locked FOR UPDATE; the new stock is computed from the locked,
-- current database value (stock = stock + delta), so concurrent adjustments serialise and both apply.
--
-- Duplicates: p_request_id is stored as the movement's reference_id. A repeat of the same request
-- (double-click, retry after a lost response) finds that movement under the item lock and returns
-- the original result without changing stock again.

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_delta numeric,
  p_reason text,
  p_note text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item_store uuid;
  v_prev numeric;
  v_new numeric;
  v_stored numeric;
  v_dup_qty numeric;
  v_note text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_REQUEST_ID';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'INVALID_DELTA';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED';
  END IF;

  -- Authorise BEFORE taking a lock, using the item's real store.
  SELECT store_id INTO v_item_store FROM public.items WHERE id = p_item_id;
  IF NOT FOUND OR v_item_store IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND';
  END IF;
  IF NOT public.has_store_role(v_item_store, 'MANAGER') THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Lock the item and read the CURRENT stock from the database.
  SELECT stock_quantity INTO v_prev FROM public.items WHERE id = p_item_id FOR UPDATE;

  -- Duplicate request: already applied, return the original outcome.
  SELECT quantity INTO v_dup_qty
  FROM public.inventory_movements
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND movement_type = 'ADJUSTMENT'
    AND reference_id::text = p_request_id::text
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'item_id', p_item_id,
      'duplicate', true,
      'delta', v_dup_qty,
      'new_quantity', v_prev
    );
  END IF;

  v_new := v_prev + p_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK';
  END IF;

  UPDATE public.items SET stock_quantity = v_new WHERE id = p_item_id
  RETURNING stock_quantity INTO v_stored;
  -- Guards against silent rounding if the column is an integer type.
  IF v_stored IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'QUANTITY_NOT_REPRESENTABLE';
  END IF;

  v_note := btrim(p_reason) ||
    CASE WHEN p_note IS NOT NULL AND btrim(p_note) <> '' THEN ' - ' || btrim(p_note) ELSE '' END;

  INSERT INTO public.inventory_movements
    (store_id, item_id, movement_type, quantity, note, created_by, reference_id)
  VALUES
    (p_store_id, p_item_id, 'ADJUSTMENT', p_delta, v_note, v_uid, p_request_id);

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'duplicate', false,
    'previous_quantity', v_prev,
    'delta', p_delta,
    'new_quantity', v_new
  );
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_stock(uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, numeric, text, text, uuid) TO authenticated;
