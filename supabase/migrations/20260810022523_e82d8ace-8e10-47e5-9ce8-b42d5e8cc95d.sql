ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS currency_symbol text NOT NULL DEFAULT '$',
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'RETAIL';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS table_number integer,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS sales_store_status_idx ON public.sales (store_id, status);