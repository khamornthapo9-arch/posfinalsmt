ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS qr_value text;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS receipt_header text,
  ADD COLUMN IF NOT EXISTS receipt_footer text;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'PAID';