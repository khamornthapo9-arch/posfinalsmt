-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('OWNER', 'CASHIER');

CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'CASHIER',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.store_id = _store_id AND m.user_id = auth.uid() AND m.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.store_id = _store_id AND m.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id AND s.owner_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid) FROM PUBLIC, anon;

CREATE POLICY "Members can view store roles" ON public.store_members
  FOR SELECT TO authenticated USING (public.is_store_member(store_id));
CREATE POLICY "Owners manage store roles" ON public.store_members
  FOR ALL TO authenticated
  USING (public.owns_store(store_id))
  WITH CHECK (public.owns_store(store_id));

CREATE TRIGGER update_store_members_updated_at
  BEFORE UPDATE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- backfill existing owners
INSERT INTO public.store_members (store_id, user_id, role)
SELECT s.id, s.owner_id, 'OWNER' FROM public.stores s
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'OWNER')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.add_owner_membership() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_add_owner_membership
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();

-- 2. Items: category + image
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'အထွေထွေ',
  ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Sales: split payment + refunds
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 4. Held orders
CREATE TABLE public.held_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cart_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.held_orders TO authenticated;
GRANT ALL ON public.held_orders TO service_role;
ALTER TABLE public.held_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members manage held orders" ON public.held_orders
  FOR ALL TO authenticated
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));

CREATE TRIGGER update_held_orders_updated_at
  BEFORE UPDATE ON public.held_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Inventory movements
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reference_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members manage inventory movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));

CREATE INDEX idx_inventory_movements_store ON public.inventory_movements (store_id, created_at DESC);
CREATE INDEX idx_held_orders_store ON public.held_orders (store_id, created_at DESC);