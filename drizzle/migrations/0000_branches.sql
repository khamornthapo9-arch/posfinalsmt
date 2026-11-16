ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS parent_store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  auth_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their branches" ON public.branches
  FOR SELECT TO authenticated USING (public.owns_store(parent_store_id));

CREATE TABLE public.branch_secrets (
  branch_id uuid PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);
GRANT ALL ON public.branch_secrets TO service_role;
ALTER TABLE public.branch_secrets ENABLE ROW LEVEL SECURITY;