CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_owner ON public.stores(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their stores" ON public.stores FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can create stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their stores" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their stores" ON public.stores FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.owns_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id AND s.owner_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.owns_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_store(uuid) TO authenticated, service_role;

DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.items;

ALTER TABLE public.items ADD COLUMN store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX idx_items_store ON public.items(store_id);
CREATE INDEX idx_sales_store ON public.sales(store_id);

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_sku_key;
CREATE UNIQUE INDEX items_store_sku_key ON public.items(store_id, sku);

DROP POLICY IF EXISTS "Public can manage items" ON public.items;
DROP POLICY IF EXISTS "Public can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Public can manage sale_items" ON public.sale_items;

REVOKE ALL ON public.items FROM anon;
REVOKE ALL ON public.sales FROM anon;
REVOKE ALL ON public.sale_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.items TO service_role;
GRANT ALL ON public.sales TO service_role;
GRANT ALL ON public.sale_items TO service_role;

CREATE POLICY "Owners manage their items" ON public.items FOR ALL TO authenticated USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE POLICY "Owners manage their sales" ON public.sales FOR ALL TO authenticated USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE POLICY "Owners manage their sale_items" ON public.sale_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.owns_store(s.store_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.owns_store(s.store_id)));