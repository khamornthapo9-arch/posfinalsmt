-- ============================================
-- RBAC policy update for OWNER / MANAGER / CASHIER
-- ============================================

-- ---------- store_members ----------
DROP POLICY IF EXISTS "Members can view store roles" ON public.store_members;

CREATE POLICY "Managers can view staff"
ON public.store_members
FOR SELECT
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'));

CREATE POLICY "Cashiers can view own record"
ON public.store_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ---------- items ----------
DROP POLICY IF EXISTS "Owners manage their items" ON public.items;

CREATE POLICY "Owners manage their items"
ON public.items
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers manage inventory"
ON public.items
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'))
WITH CHECK (public.has_store_role(store_id, 'MANAGER'));

CREATE POLICY "Cashiers can view items"
ON public.items
FOR SELECT
TO authenticated
USING (public.has_store_role(store_id, 'CASHIER'));

-- ---------- sales ----------
DROP POLICY IF EXISTS "Owners manage their sales" ON public.sales;

CREATE POLICY "Owners manage their sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'))
WITH CHECK (public.has_store_role(store_id, 'MANAGER'));

CREATE POLICY "Cashiers can manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'CASHIER'))
WITH CHECK (public.has_store_role(store_id, 'CASHIER'));

-- ---------- sale_items ----------
DROP POLICY IF EXISTS "Owners manage their sale_items" ON public.sale_items;

CREATE POLICY "Owners manage their sale_items"
ON public.sale_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.owns_store(s.store_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.owns_store(s.store_id)
));

CREATE POLICY "Managers manage sale_items"
ON public.sale_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.has_store_role(s.store_id, 'MANAGER')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.has_store_role(s.store_id, 'MANAGER')
));

CREATE POLICY "Cashiers can manage sale_items"
ON public.sale_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.has_store_role(s.store_id, 'CASHIER')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales s
  WHERE s.id = sale_items.sale_id AND public.has_store_role(s.store_id, 'CASHIER')
));

-- ---------- customers ----------
DROP POLICY IF EXISTS "Owners manage their customers" ON public.customers;

CREATE POLICY "Owners manage their customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers and cashiers manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.is_store_member(store_id))
WITH CHECK (public.is_store_member(store_id));

-- ---------- suppliers ----------
DROP POLICY IF EXISTS "Owners manage their suppliers" ON public.suppliers;

CREATE POLICY "Owners manage their suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers manage suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'))
WITH CHECK (public.has_store_role(store_id, 'MANAGER'));

-- ---------- purchases ----------
DROP POLICY IF EXISTS "Owners manage their purchases" ON public.purchases;

CREATE POLICY "Owners manage their purchases"
ON public.purchases
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers manage purchases"
ON public.purchases
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'))
WITH CHECK (public.has_store_role(store_id, 'MANAGER'));

-- ---------- purchase_items ----------
DROP POLICY IF EXISTS "Owners manage their purchase items" ON public.purchase_items;

CREATE POLICY "Owners manage their purchase_items"
ON public.purchase_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.purchases p
  WHERE p.id = purchase_items.purchase_id AND public.owns_store(p.store_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.purchases p
  WHERE p.id = purchase_items.purchase_id AND public.owns_store(p.store_id)
));

CREATE POLICY "Managers manage purchase_items"
ON public.purchase_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.purchases p
  WHERE p.id = purchase_items.purchase_id AND public.has_store_role(p.store_id, 'MANAGER')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.purchases p
  WHERE p.id = purchase_items.purchase_id AND public.has_store_role(p.store_id, 'MANAGER')
));

-- ---------- expenses ----------
DROP POLICY IF EXISTS "Owners manage their expenses" ON public.expenses;

CREATE POLICY "Owners manage their expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers manage expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'))
WITH CHECK (public.has_store_role(store_id, 'MANAGER'));

-- ---------- debt_payments ----------
DROP POLICY IF EXISTS "Owners manage their debt payments" ON public.debt_payments;

CREATE POLICY "Owners manage their debt payments"
ON public.debt_payments
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers and cashiers manage debt payments"
ON public.debt_payments
FOR ALL
TO authenticated
USING (public.is_store_member(store_id))
WITH CHECK (public.is_store_member(store_id));

-- ---------- ledger_entries ----------
DROP POLICY IF EXISTS "Owners manage their ledger entries" ON public.ledger_entries;

CREATE POLICY "Owners manage their ledger entries"
ON public.ledger_entries
FOR ALL
TO authenticated
USING (public.owns_store(store_id))
WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Managers can view ledger entries"
ON public.ledger_entries
FOR SELECT
TO authenticated
USING (public.has_store_role(store_id, 'MANAGER'));

CREATE POLICY "Cashiers can create ledger entries"
ON public.ledger_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_store_member(store_id));