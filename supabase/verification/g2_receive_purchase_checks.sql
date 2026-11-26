-- G2 verification: receive_purchase and update_draft_purchase.
--
-- SAFE ON LIVE DATA: everything runs inside ONE DO block that creates its own test supplier, items
-- and purchases in an existing store, and ALWAYS finishes by raising an exception, which rolls the
-- whole block back. The exception text IS the report ("PASS ..." / "FAIL ..." / "SKIP ..."). Nothing
-- is kept. Run it AFTER the G2 migration has been applied, in the Supabase SQL editor.
--
-- By default it uses the first store that has an owner. To pick a store, set v_store below.
-- The manager is the store's owner; the cashier is an active CASHIER member of that store (if the
-- store has none the cashier check is reported as SKIP).
DO $$
DECLARE
  v_store uuid := NULL;                   -- NULL = auto-pick
  v_owner uuid; v_cashier uuid;
  v_sup uuid := gen_random_uuid();
  v_i1 uuid := gen_random_uuid(); v_i2 uuid := gen_random_uuid(); v_i3 uuid := gen_random_uuid();
  v_i4 uuid := gen_random_uuid(); v_i5 uuid := gen_random_uuid();
  v_lo uuid; v_hi uuid;
  v_p uuid; v_r jsonb; v_err text; v_rep text := '';
  v_n1 bigint; v_n2 bigint; v_n3 bigint; v_n4 bigint; v_a numeric; v_b numeric; v_c numeric;
  v_h1 text; v_h2 text; v_stock int; v_status text; v_bal0 numeric;
BEGIN
  IF v_store IS NULL THEN
    SELECT id, owner_id INTO v_store, v_owner FROM public.stores WHERE owner_id IS NOT NULL ORDER BY id LIMIT 1;
  ELSE
    SELECT owner_id INTO v_owner FROM public.stores WHERE id = v_store;
  END IF;
  IF v_store IS NULL OR v_owner IS NULL THEN
    RAISE EXCEPTION 'SETUP: no store with an owner found';
  END IF;
  SELECT user_id INTO v_cashier FROM public.store_members
   WHERE store_id = v_store AND role::text = 'CASHIER' AND is_active LIMIT 1;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  INSERT INTO public.suppliers (id, store_id, name) VALUES (v_sup, v_store, 'G2 TEST SUPPLIER');
  SELECT COALESCE(balance, 0) INTO v_bal0 FROM public.suppliers WHERE id = v_sup;
  INSERT INTO public.items (id, store_id, sku, name, price, stock_quantity, cost_price) VALUES
    (v_i1, v_store, 'G2T-1-' || v_i1, 'G2 base item', 0, 5, 7),
    (v_i2, v_store, 'G2T-2-' || v_i2, 'G2 carton item', 0, 0, 0),
    (v_i3, v_store, 'G2T-3-' || v_i3, 'G2 exact cost item', 0, 0, 0),
    (v_i4, v_store, 'G2T-4-' || v_i4, 'G2 zero cost item', 0, 10, 50),
    (v_i5, v_store, 'G2T-5-' || v_i5, 'G2 archived item', 0, 1, 1);
  UPDATE public.items SET archived_at = now() WHERE id = v_i5;

  SELECT pg_catalog.count(*)::text || ':' || COALESCE(pg_catalog.sum(unit_cost), 0)::text ||
         ':' || COALESCE(pg_catalog.md5(pg_catalog.string_agg(id::text || COALESCE(unit_cost, 0)::text, ',' ORDER BY id)), '')
    INTO v_h1 FROM public.sale_items;

  -- T1 base-unit receive, unpaid, with supplier -------------------------------------------------
  INSERT INTO public.purchases (store_id, supplier_id, status, total_amount, amount_paid)
    VALUES (v_store, v_sup, 'ORDERED', 200, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, unit_name, conversion, received_quantity)
    VALUES (v_p, v_i1, 10, 20, NULL, 1, 0);
  v_r := public.receive_purchase(v_p, NULL);
  SELECT stock_quantity, cost_price INTO v_stock, v_a FROM public.items WHERE id = v_i1;
  v_rep := v_rep || E'\n' || CASE WHEN v_stock = 15 AND v_a = 20 AND (v_r->>'already_received')::boolean = false
    THEN 'PASS' ELSE 'FAIL' END || ' base-unit receive | stock 5+10=' || v_stock || ' cost=' || v_a;
  SELECT pg_catalog.count(*), COALESCE(pg_catalog.sum(quantity), 0) INTO v_n1, v_a FROM public.inventory_movements
    WHERE reference_id = v_p AND movement_type = 'PURCHASE' AND item_id = v_i1 AND created_by = v_owner;
  v_rep := v_rep || E'\n' || CASE WHEN v_n1 = 1 AND v_a = 10 THEN 'PASS' ELSE 'FAIL' END ||
    ' movement history | PURCHASE rows=' || v_n1 || ' qty=' || v_a;
  SELECT COALESCE(pg_catalog.sum(amount) FILTER (WHERE direction = 'DEBIT'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE direction = 'CREDIT'), 0)
    INTO v_a, v_b FROM public.ledger_entries WHERE reference_type = 'PURCHASE' AND reference_id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 200 AND v_b = 200 THEN 'PASS' ELSE 'FAIL' END ||
    ' balanced ledger | debit=' || v_a || ' credit=' || v_b;
  SELECT balance INTO v_a FROM public.suppliers WHERE id = v_sup;
  v_rep := v_rep || E'\n' || CASE WHEN v_a - v_bal0 = 200 THEN 'PASS' ELSE 'FAIL' END ||
    ' supplier balance | +' || (v_a - v_bal0);
  SELECT status INTO v_status FROM public.purchases WHERE id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_status = 'ရရှိပြီး' THEN 'PASS' ELSE 'FAIL' END || ' status | ' || v_status;

  -- T4 duplicate receive (idempotency) ----------------------------------------------------------
  SELECT pg_catalog.count(*) INTO v_n1 FROM public.inventory_movements WHERE reference_id = v_p;
  SELECT pg_catalog.count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_id = v_p;
  SELECT balance INTO v_a FROM public.suppliers WHERE id = v_sup;
  v_r := public.receive_purchase(v_p, NULL);
  SELECT pg_catalog.count(*) INTO v_n3 FROM public.inventory_movements WHERE reference_id = v_p;
  SELECT pg_catalog.count(*) INTO v_n4 FROM public.ledger_entries WHERE reference_id = v_p;
  SELECT balance INTO v_b FROM public.suppliers WHERE id = v_sup;
  SELECT stock_quantity INTO v_stock FROM public.items WHERE id = v_i1;
  v_rep := v_rep || E'\n' || CASE WHEN (v_r->>'already_received')::boolean AND v_n1 = v_n3 AND v_n2 = v_n4
      AND v_a = v_b AND v_stock = 15 THEN 'PASS' ELSE 'FAIL' END ||
    ' duplicate receive | already_received=' || (v_r->>'already_received') || ' stock=' || v_stock;

  -- T2 carton receive + KBZPAY prepayment + full-precision last cost ----------------------------
  INSERT INTO public.purchases (store_id, supplier_id, status, total_amount, amount_paid, payment_method)
    VALUES (v_store, v_sup, 'ORDERED', 2000, 500, 'KBZPAY') RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, unit_name, conversion, received_quantity)
    VALUES (v_p, v_i2, 2, 1000, 'carton', 12, 0);
  SELECT balance INTO v_a FROM public.suppliers WHERE id = v_sup;
  v_r := public.receive_purchase(v_p, NULL);
  SELECT stock_quantity, cost_price INTO v_stock, v_b FROM public.items WHERE id = v_i2;
  v_rep := v_rep || E'\n' || CASE WHEN v_stock = 24 THEN 'PASS' ELSE 'FAIL' END ||
    ' carton receive | 2 cartons x 12 = ' || v_stock || ' base units';
  v_rep := v_rep || E'\n' || CASE WHEN v_b = 1000::numeric / 12 AND v_b::text LIKE '%.____%' THEN 'PASS' ELSE 'FAIL' END ||
    ' last-cost full precision | 1000/12 -> ' || v_b;
  SELECT COALESCE(pg_catalog.sum(amount) FILTER (WHERE account = 'KBZPAY' AND direction = 'CREDIT'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE account = 'CASH'), 0),
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE account = 'ACCOUNTS_PAYABLE' AND direction = 'CREDIT'), 0)
    INTO v_a, v_b, v_c FROM public.ledger_entries WHERE reference_type = 'PURCHASE' AND reference_id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 500 AND v_b = 0 AND v_c = 1500 THEN 'PASS' ELSE 'FAIL' END ||
    ' correct payment account | KBZPAY credit=' || v_a || ' CASH=' || v_b || ' AP=' || v_c;
  SELECT COALESCE(pg_catalog.sum(amount) FILTER (WHERE direction = 'DEBIT'), 0) -
         COALESCE(pg_catalog.sum(amount) FILTER (WHERE direction = 'CREDIT'), 0)
    INTO v_a FROM public.ledger_entries WHERE reference_type = 'PURCHASE' AND reference_id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 0 THEN 'PASS' ELSE 'FAIL' END || ' balanced ledger (paid+unpaid) | debit-credit=' || v_a;
  SELECT balance INTO v_b FROM public.suppliers WHERE id = v_sup;
  SELECT quantity INTO v_stock FROM public.inventory_movements WHERE reference_id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_stock = 24 THEN 'PASS' ELSE 'FAIL' END || ' carton movement | qty=' || v_stock;

  -- T3 exact last-cost conversion: 1200 per carton of 12 -> 100 per base unit -------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'ORDERED', 1200, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, unit_name, conversion, received_quantity)
    VALUES (v_p, v_i3, 1, 1200, 'carton', 12, 0);
  PERFORM public.receive_purchase(v_p, NULL);
  SELECT stock_quantity, cost_price INTO v_stock, v_a FROM public.items WHERE id = v_i3;
  v_rep := v_rep || E'\n' || CASE WHEN v_stock = 12 AND v_a = 100 THEN 'PASS' ELSE 'FAIL' END ||
    ' last-cost conversion | 1 carton(12) -> stock ' || v_stock || ', cost/base unit ' || v_a;

  -- T5 payment method missing / invalid / supplied at receive ----------------------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'ORDERED', 300, 100) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity)
    VALUES (v_p, v_i1, 3, 100, 1, 0);
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT stock_quantity INTO v_stock FROM public.items WHERE id = v_i1;
  SELECT status INTO v_status FROM public.purchases WHERE id = v_p;
  SELECT pg_catalog.count(*) INTO v_n1 FROM public.ledger_entries WHERE reference_id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'payment_method_required' AND v_stock = 15 AND v_status = 'ORDERED' AND v_n1 = 0
    THEN 'PASS' ELSE 'FAIL' END || ' missing payment method refused, nothing changed | ' || COALESCE(v_err, 'no error');
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, 'BITCOIN'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'invalid_payment_method' THEN 'PASS' ELSE 'FAIL' END || ' invalid payment method | ' || COALESCE(v_err, 'no error');
  PERFORM public.receive_purchase(v_p, 'WAVEPAY');
  SELECT COALESCE(pg_catalog.sum(amount), 0) INTO v_a FROM public.ledger_entries
    WHERE reference_id = v_p AND account = 'WAVEPAY' AND direction = 'CREDIT';
  SELECT payment_method INTO v_err FROM public.purchases WHERE id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 100 AND v_err = 'WAVEPAY' THEN 'PASS' ELSE 'FAIL' END ||
    ' method supplied at receive | WAVEPAY credit=' || v_a || ' stored=' || COALESCE(v_err, 'null');

  -- T6 authorization ----------------------------------------------------------------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'ORDERED', 50, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity)
    VALUES (v_p, v_i4, 5, 10, 1, 0);
  IF v_cashier IS NULL THEN
    v_rep := v_rep || E'\n' || 'SKIP cashier authorization | this store has no active CASHIER member';
  ELSE
    PERFORM set_config('request.jwt.claim.sub', v_cashier::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cashier, 'role', 'authenticated')::text, true);
    v_err := NULL;
    BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    SELECT stock_quantity INTO v_stock FROM public.items WHERE id = v_i4;
    SELECT status INTO v_status FROM public.purchases WHERE id = v_p;
    v_rep := v_rep || E'\n' || CASE WHEN v_err = 'not_authorized' AND v_stock = 10 AND v_status = 'ORDERED' THEN 'PASS' ELSE 'FAIL' END ||
      ' cashier authorization | ' || COALESCE(v_err, 'no error');
    PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'not_authenticated' THEN 'PASS' ELSE 'FAIL' END || ' unauthenticated refused | ' || COALESCE(v_err, 'no error');
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  -- T10 zero-cost line keeps cost; T11 archived item can be received and stays archived ---------
  PERFORM public.receive_purchase(v_p, NULL);          -- v_p: 5 x unit_cost 10 on v_i4 (cost 50)
  SELECT cost_price INTO v_a FROM public.items WHERE id = v_i4;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 10 THEN 'PASS' ELSE 'FAIL' END || ' last cost overwrites with newest cost | ' || v_a;
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'ORDERED', 0, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity)
    VALUES (v_p, v_i4, 3, 0, 1, 0), (v_p, v_i5, 4, 0, 1, 0);
  PERFORM public.receive_purchase(v_p, NULL);
  SELECT cost_price, stock_quantity INTO v_a, v_stock FROM public.items WHERE id = v_i4;
  v_rep := v_rep || E'\n' || CASE WHEN v_a = 10 AND v_stock = 18 THEN 'PASS' ELSE 'FAIL' END || ' zero-cost line keeps previous cost | cost=' || v_a || ' stock=' || v_stock;
  SELECT stock_quantity, (archived_at IS NOT NULL)::int INTO v_stock, v_n1 FROM public.items WHERE id = v_i5;
  v_rep := v_rep || E'\n' || CASE WHEN v_stock = 5 AND v_n1 = 1 THEN 'PASS' ELSE 'FAIL' END || ' archived item still receives and stays archived | stock=' || v_stock;

  -- T7 failure rollback: 2nd line overflows integer stock AFTER the 1st line was already applied -
  v_lo := LEAST(v_i1, v_i2); v_hi := GREATEST(v_i1, v_i2);
  UPDATE public.items SET stock_quantity = 2147483000 WHERE id = v_hi;
  SELECT stock_quantity INTO v_stock FROM public.items WHERE id = v_lo;
  INSERT INTO public.purchases (store_id, supplier_id, status, total_amount, amount_paid) VALUES (v_store, v_sup, 'ORDERED', 2000, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity)
    VALUES (v_p, v_lo, 1, 1000, 1, 0), (v_p, v_hi, 1000, 1, 1, 0);
  SELECT balance INTO v_a FROM public.suppliers WHERE id = v_sup;
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT pg_catalog.count(*) INTO v_n1 FROM public.inventory_movements WHERE reference_id = v_p;
  SELECT pg_catalog.count(*) INTO v_n2 FROM public.ledger_entries WHERE reference_id = v_p;
  SELECT status INTO v_status FROM public.purchases WHERE id = v_p;
  SELECT stock_quantity INTO v_n3 FROM public.items WHERE id = v_lo;
  SELECT balance INTO v_b FROM public.suppliers WHERE id = v_sup;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'quantity_too_large' AND v_n1 = 0 AND v_n2 = 0 AND v_status = 'ORDERED'
      AND v_n3 = v_stock AND v_a = v_b THEN 'PASS' ELSE 'FAIL' END ||
    ' failure rollback | error=' || COALESCE(v_err, 'none') || ' movements=' || v_n1 || ' ledger=' || v_n2 || ' status=' || v_status;

  -- T8 total mismatch ---------------------------------------------------------------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'ORDERED', 999, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity) VALUES (v_p, v_i3, 2, 100, 1, 0);
  SELECT stock_quantity INTO v_stock FROM public.items WHERE id = v_i3;
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT stock_quantity INTO v_n1 FROM public.items WHERE id = v_i3;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'total_mismatch' AND v_n1 = v_stock THEN 'PASS' ELSE 'FAIL' END || ' total mismatch rejected | ' || COALESCE(v_err, 'no error');

  -- Not receivable states -----------------------------------------------------------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'DRAFT', 20, 0) RETURNING id INTO v_p;
  INSERT INTO public.purchase_items (purchase_id, item_id, quantity, unit_cost, conversion, received_quantity) VALUES (v_p, v_i3, 1, 20, 1, 0);
  v_err := NULL;
  BEGIN PERFORM public.receive_purchase(v_p, NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'purchase_not_receivable' THEN 'PASS' ELSE 'FAIL' END || ' DRAFT cannot be received | ' || COALESCE(v_err, 'no error');

  -- update_draft_purchase with payment method ---------------------------------------------------
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'DRAFT', 0, 0) RETURNING id INTO v_p;
  v_err := NULL;
  BEGIN PERFORM public.update_draft_purchase(v_p, v_sup, 50, 'n',
      jsonb_build_array(jsonb_build_object('item_id', v_i1, 'quantity', 2, 'unit_cost', 100, 'conversion', 1)), false, 'BITCOIN');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'invalid_payment_method' THEN 'PASS' ELSE 'FAIL' END || ' draft: invalid method rejected | ' || COALESCE(v_err, 'no error');
  PERFORM public.update_draft_purchase(v_p, v_sup, 50, 'n',
      jsonb_build_array(jsonb_build_object('item_id', v_i1, 'quantity', 2, 'unit_cost', 100, 'conversion', 1)), true, 'KBZPAY');
  SELECT payment_method, status INTO v_err, v_status FROM public.purchases WHERE id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_err = 'KBZPAY' AND v_status = 'ORDERED' THEN 'PASS' ELSE 'FAIL' END || ' draft: method stored on confirm | ' || COALESCE(v_err, 'null') || '/' || v_status;
  INSERT INTO public.purchases (store_id, status, total_amount, amount_paid) VALUES (v_store, 'DRAFT', 0, 0) RETURNING id INTO v_p;
  PERFORM public.update_draft_purchase(v_p, v_sup, 0, '',
      jsonb_build_array(jsonb_build_object('item_id', v_i1, 'quantity', 2, 'unit_cost', 100, 'conversion', 1)), false, 'CASH');
  SELECT payment_method INTO v_err FROM public.purchases WHERE id = v_p;
  v_rep := v_rep || E'\n' || CASE WHEN v_err IS NULL THEN 'PASS' ELSE 'FAIL' END || ' draft: method cleared when nothing paid | ' || COALESCE(v_err, 'null');

  -- Historical cost snapshots untouched ---------------------------------------------------------
  SELECT pg_catalog.count(*)::text || ':' || COALESCE(pg_catalog.sum(unit_cost), 0)::text ||
         ':' || COALESCE(pg_catalog.md5(pg_catalog.string_agg(id::text || COALESCE(unit_cost, 0)::text, ',' ORDER BY id)), '')
    INTO v_h2 FROM public.sale_items;
  v_rep := v_rep || E'\n' || CASE WHEN v_h1 = v_h2 THEN 'PASS' ELSE 'FAIL' END || ' sale_items.unit_cost history unchanged | ' || v_h1;

  -- Always roll everything back; the message is the report.
  RAISE EXCEPTION E'G2 CHECK REPORT (everything rolled back):%', v_rep;
END
$$;
