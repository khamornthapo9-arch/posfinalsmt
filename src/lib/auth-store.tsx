import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { posDb } from "@/lib/pos-db";

export interface StoreRecord {
  id: string;
  name: string;
}

interface AuthContextValue {
  session: Session | null;
  store: StoreRecord | null;
  loading: boolean;
  refreshStore: () => Promise<StoreRecord | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setStore(null);
      return null;
    }
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    setStore(data ?? null);
    return data ?? null;
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadStore(next);
    });
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadStore(data.session);
      setLoading(false);
    })();
    return () => sub.subscription.unsubscribe();
  }, [loadStore]);

  const refreshStore = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return loadStore(data.session);
  }, [loadStore]);

  const signOut = useCallback(async () => {
    await posDb.transaction("rw", posDb.cached_items, posDb.pending_sales, async () => {
      await posDb.cached_items.clear();
      await posDb.pending_sales.clear();
    });
    await supabase.auth.signOut();
    setSession(null);
    setStore(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, store, loading, refreshStore, signOut }),
    [session, store, loading, refreshStore, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
