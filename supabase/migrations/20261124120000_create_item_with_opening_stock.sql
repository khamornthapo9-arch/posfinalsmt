-- M6.3: creating an item with opening stock also records an OPENING inventory movement,
-- in the same transaction.
--
-- NOT YET APPLIED. Review before running. Idempotent (CREATE OR REPLACE). Creates ONE function;
-- no table, column, policy, trigger or data change. Existing items are NOT backfilled.
--
-- Why: items were inserted with a non-zero stock_quantity and no movement, so the movement
-- history could never explain the starting stock.
--
-- Security: SECURITY DEFINER with an empty search_path (everything schema-qualified). It
-- authorises explicitly: MANAGER on p_store_id (the store owner also satisfies has_store_role),
-- matching the existing items write policy.
--
-- Duplicates: the client generates the item id (p_item_id). A repeat of the same request hits
-- ON CONFLICT (id) and returns the existing item with duplicate = true, creating nothing twice.
-- An id that already exists in ANOTHER store is rejected (ITEM_ID_CONFLICT).
--
-- Atomicity: item, its units and the OPENING movement are written in one function call; any
-- failure rolls everything back.
--
-- ASSUMPTION to verify live: inventory_movements.movement_type accepts the value 'OPENING'
-- (the app already writes SALE, RETURN and ADJUSTMENT). If a CHECK constraint restricts it,
-- this function will fail cleanly and roll back.

CREATE OR REPLACE FUNCTION public.create_item_with_opening_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_sku text,
  p_name text,
  p_price numeric,
  p_cost_price numeric,
  p_opening_stock numeric,
  p_min_stock_threshold numeric,
  p_category text,
  p_barcode text,
  p_qr_value text,
  p_image_url text,
  p_units jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inserted uuid;
  v_existing_store uuid;
  v_existing_stock numeric;
  v_stored numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_store_id IS NULL OR p_item_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  IF p_sku IS NULL OR pg_catalog.btrim(p_sku) = ''
     OR p_name IS NULL OR pg_catalog.btrim(p_name) = ''
     OR p_price IS NULL OR p_price < 0
     OR p_cost_price IS NULL OR p_cost_price < 0
     OR p_min_stock_threshold IS NULL OR p_min_stock_threshold < 0 THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  IF p_opening_stock IS NULL OR p_opening_stock < 0 THEN
    RAISE EXCEPTION 'INVALID_OPENING_STOCK';
  END IF;
  -- items.stock_quantity and items.min_stock_threshold are INTEGER columns (verified live):
  -- reject fractions instead of letting PostgreSQL round them silently.
  IF p_opening_stock <> pg_catalog.trunc(p_opening_stock)
     OR p_min_stock_threshold <> pg_catalog.trunc(p_min_stock_threshold) THEN
    RAISE EXCEPTION 'QUANTITY_NOT_REPRESENTABLE';
  END IF;
  IF p_units IS NOT NULL AND pg_catalog.jsonb_typeof(p_units) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  IF NOT public.has_store_role(p_store_id, 'MANAGER') THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  BEGIN
    INSERT INTO public.items
      (id, store_id, sku, name, price, cost_price, stock_quantity, min_stock_threshold,
       category, barcode, qr_value, image_url)
    VALUES
      (p_item_id, p_store_id, pg_catalog.btrim(p_sku), pg_catalog.btrim(p_name), p_price,
       p_cost_price, p_opening_stock, p_min_stock_threshold,
       COALESCE(NULLIF(pg_catalog.btrim(p_category), ''), 'အထွေထွေ'),
       NULLIF(pg_catalog.btrim(p_barcode), ''), NULLIF(pg_catalog.btrim(p_qr_value), ''),
       p_image_url)
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_inserted;
  EXCEPTION WHEN unique_violation THEN
    -- A different unique key (e.g. SKU) collided.
    RAISE EXCEPTION 'SKU_EXISTS';
  END;

  IF v_inserted IS NULL THEN
    -- Same item id already exists: a repeat of this request, or an id from another store.
    SELECT store_id, stock_quantity INTO v_existing_store, v_existing_stock
    FROM public.items WHERE id = p_item_id;
    IF v_existing_store IS DISTINCT FROM p_store_id THEN
      RAISE EXCEPTION 'ITEM_ID_CONFLICT';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'item_id', p_item_id, 'duplicate', true, 'stock_quantity', v_existing_stock);
  END IF;

  -- Guards against silent rounding if the stock column is an integer type.
  SELECT stock_quantity INTO v_stored FROM public.items WHERE id = p_item_id;
  IF v_stored IS DISTINCT FROM p_opening_stock THEN
    RAISE EXCEPTION 'QUANTITY_NOT_REPRESENTABLE';
  END IF;

  IF p_units IS NOT NULL THEN
    INSERT INTO public.item_units (item_id, unit_name, conversion, price, is_default)
    SELECT p_item_id, pg_catalog.btrim(u.unit_name), pg_catalog.trunc(u.conversion)::int,
           u.price, COALESCE(u.is_default, false)
    FROM pg_catalog.jsonb_to_recordset(p_units)
      AS u(unit_name text, conversion numeric, price numeric, is_default boolean)
    WHERE u.unit_name IS NOT NULL AND pg_catalog.btrim(u.unit_name) <> ''
      AND u.conversion IS NOT NULL AND u.conversion >= 1
      AND u.price IS NOT NULL AND u.price >= 0;
  END IF;

  IF p_opening_stock > 0 THEN
    INSERT INTO public.inventory_movements
      (store_id, item_id, movement_type, quantity, note, created_by, reference_id)
    VALUES
      (p_store_id, p_item_id, 'OPENING', p_opening_stock, 'Opening stock', v_uid, p_item_id);
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'item_id', p_item_id, 'duplicate', false, 'stock_quantity', p_opening_stock);
END;
$$;

REVOKE ALL ON FUNCTION public.create_item_with_opening_stock(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, text, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_item_with_opening_stock(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, text, text, text, text, jsonb
) TO authenticated;
