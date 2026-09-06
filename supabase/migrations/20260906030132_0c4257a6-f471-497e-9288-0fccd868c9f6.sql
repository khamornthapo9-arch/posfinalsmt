-- Platform admins
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins a WHERE a.user_id = auth.uid())
$$;

CREATE POLICY "Admins can view admin list" ON public.platform_admins
  FOR SELECT TO authenticated USING (public.is_platform_admin() OR user_id = auth.uid());

INSERT INTO public.platform_admins (user_id, email)
SELECT id, email FROM auth.users WHERE lower(email) = 'khamornthapo9@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Auto-register the master admin on first sign-up if the account is created later
CREATE OR REPLACE FUNCTION public.register_master_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'khamornthapo9@gmail.com' THEN
    INSERT INTO public.platform_admins (user_id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Admin access to stores
CREATE POLICY "Admins can view all stores" ON public.stores
  FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins can update all stores" ON public.stores
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Only admins may flip is_pro
CREATE OR REPLACE FUNCTION public.guard_store_pro_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Pro plan can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_store_pro_flag
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.guard_store_pro_flag();

-- Shop contact details
CREATE TABLE public.store_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  phone text,
  telegram text,
  viber text,
  email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_contacts TO authenticated;
GRANT ALL ON public.store_contacts TO service_role;
ALTER TABLE public.store_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their store contact" ON public.store_contacts
  FOR ALL TO authenticated USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE POLICY "Admins view all store contacts" ON public.store_contacts
  FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE TRIGGER update_store_contacts_updated_at BEFORE UPDATE ON public.store_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  audience text NOT NULL DEFAULT 'ALL',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.announcement_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_targets TO authenticated;
GRANT ALL ON public.announcement_targets TO service_role;
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Stores read their announcements" ON public.announcements
  FOR SELECT TO authenticated USING (
    is_active = true AND (
      audience = 'ALL' OR EXISTS (
        SELECT 1 FROM public.announcement_targets t
        WHERE t.announcement_id = announcements.id AND public.is_store_member(t.store_id)
      )
    )
  );
CREATE POLICY "Admins manage announcement targets" ON public.announcement_targets
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Stores read their announcement targets" ON public.announcement_targets
  FOR SELECT TO authenticated USING (public.is_store_member(store_id));