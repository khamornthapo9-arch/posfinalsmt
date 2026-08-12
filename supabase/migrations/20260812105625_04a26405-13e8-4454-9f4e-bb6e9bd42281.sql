ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MANAGER';

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.item_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  conversion integer NOT NULL CHECK (conversion > 0),
  price numeric NOT NULL CHECK (price >= 0),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_units TO authenticated;
GRANT ALL ON public.item_units TO service_role;

ALTER TABLE public.item_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members can read item units" ON public.item_units;
CREATE POLICY "Store members can read item units"
  ON public.item_units
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.items i
    WHERE i.id = item_units.item_id
      AND public.is_store_member(i.store_id)
  ));

DROP POLICY IF EXISTS "Owners can manage item units" ON public.item_units;
CREATE POLICY "Owners can manage item units"
  ON public.item_units
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.items i
    WHERE i.id = item_units.item_id
      AND public.owns_store(i.store_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.items i
    WHERE i.id = item_units.item_id
      AND public.owns_store(i.store_id)
  ));

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS unit_name text,
  ADD COLUMN IF NOT EXISTS conversion integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_item_units_updated_at ON public.item_units;
CREATE TRIGGER update_item_units_updated_at
  BEFORE UPDATE ON public.item_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
