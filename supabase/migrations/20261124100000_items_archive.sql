-- M6.2: archive items instead of hard-deleting them.
--
-- NOT YET APPLIED. Additive and idempotent: one nullable column and one index. No data is
-- changed (every existing item stays active because archived_at is NULL), nothing is dropped,
-- and existing RLS on public.items is row-level (store owner / manager write), so it already
-- covers the new column.
--
-- Why: deleting an item that has sales, purchases or stock movements either fails (foreign keys)
-- or, worse, removes history. Archiving keeps the row, its SKU and all history, and hides it
-- from the register, scanner, pickers and stock alerts. It can be restored.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS items_store_active_idx
  ON public.items (store_id)
  WHERE archived_at IS NULL;
