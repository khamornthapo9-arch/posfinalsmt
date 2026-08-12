REVOKE EXECUTE ON FUNCTION public.owns_store(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid) FROM PUBLIC, anon;