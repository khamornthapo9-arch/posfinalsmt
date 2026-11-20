CREATE OR REPLACE FUNCTION public.guard_store_pro_flag()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_pro AND NOT public.is_platform_admin() THEN
      NEW.is_pro := false;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Pro plan can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_store_pro_flag_insert ON public.stores;
CREATE TRIGGER trg_guard_store_pro_flag_insert BEFORE INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.guard_store_pro_flag();

DROP POLICY IF EXISTS "Anyone can view platform contact info" ON public.platform_settings;
CREATE POLICY "Store members and admins can view platform contact info"
ON public.platform_settings FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.user_id = auth.uid() AND m.is_active)
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token text PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_link_tokens TO service_role;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;