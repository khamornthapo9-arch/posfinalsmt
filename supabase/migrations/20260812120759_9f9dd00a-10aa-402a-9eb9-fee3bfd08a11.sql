ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.store_members ALTER COLUMN user_id DROP NOT NULL;