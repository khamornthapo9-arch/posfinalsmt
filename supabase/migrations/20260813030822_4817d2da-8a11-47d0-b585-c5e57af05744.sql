CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.store_id = _store_id AND m.user_id = auth.uid() AND m.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id AND s.owner_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.store_id = _store_id AND m.user_id = auth.uid() AND m.role = _role AND m.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id AND s.owner_id = auth.uid() AND (_role = 'OWNER'::app_role OR s.owner_id IS NOT NULL)
  )
$$;
