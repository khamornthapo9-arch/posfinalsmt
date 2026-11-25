import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

/** Resolves the store logo storage path into a temporary signed URL. */
export function useStoreLogo() {
  const { store } = useAuth();
  const path = store?.logo_url ?? null;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    void (async () => {
      const { data } = await supabase.storage.from("store-logos").createSignedUrl(path, 3600);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
