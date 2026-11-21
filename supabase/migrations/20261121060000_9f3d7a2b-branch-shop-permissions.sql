-- ============================================
-- Branch shop permissions
-- A branch store is a stores row with parent_store_id set. Its single
-- CASHIER-role login should be able to sell, view stock, collect credit,
-- record its own expenses and edit its own receipt/voucher — but never add
-- or remove items, customers, suppliers, or touch another shop's data.
-- ============================================

CREATE OR REPLACE FUNCTION public.is_branch_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.parent_store_id IS NOT NULL
  )
$$;

-- ---------- customers: branch staff view and collect debt, never add or remove ----------
DROP POLICY IF EXISTS "Managers and cashiers manage customers" ON public.customers;

CREATE POLICY "Managers and cashiers view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.is_store_member(store_id));

CREATE POLICY "Managers and cashiers update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.is_store_member(store_id))
WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "Managers and cashiers add customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.is_store_member(store_id) AND NOT public.is_branch_store(store_id));

CREATE POLICY "Managers and cashiers delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (public.is_store_member(store_id) AND NOT public.is_branch_store(store_id));

-- ---------- expenses: branch staff may record their own branch's expenses ----------
CREATE POLICY "Branch staff manage their branch expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'CASHIER') AND public.is_branch_store(store_id))
WITH CHECK (public.has_store_role(store_id, 'CASHIER') AND public.is_branch_store(store_id));

-- ---------- stores: branch staff may edit their own branch's profile/receipt fields ----------
-- (is_pro stays admin-only via trg_guard_store_pro_flag regardless of this policy.)
CREATE POLICY "Branch staff update their branch store"
ON public.stores
FOR UPDATE
TO authenticated
USING (public.is_branch_store(id) AND public.is_store_member(id))
WITH CHECK (public.is_branch_store(id) AND public.is_store_member(id));

-- ---------- shifts: simple clock-in / clock-out log per store ----------
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opened_by text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members manage their shifts"
ON public.shifts
FOR ALL
TO authenticated
USING (public.is_store_member(store_id))
WITH CHECK (public.is_store_member(store_id));
