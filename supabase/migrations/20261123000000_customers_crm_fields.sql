-- Workstream F (Customer CRM): additive, backward-compatible customer fields.
-- No drops, no renames, no data changes. Existing RLS on public.customers is row-level
-- (owner / store member by store_id) so it already covers the new columns.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  -- Archiving replaces deleting: customers with sales history must keep their identity.
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS customers_store_active_idx
  ON public.customers (store_id)
  WHERE archived_at IS NULL;

-- Purchase history looks sales up by customer.
CREATE INDEX IF NOT EXISTS sales_customer_created_idx
  ON public.sales (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;
