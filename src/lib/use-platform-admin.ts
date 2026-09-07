import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

/** True when the signed-in account is a platform (master) administrator. */
export function usePlatformAdmin() {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setIsAdmin(Boolean(data));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  return { isAdmin, loading };
}
