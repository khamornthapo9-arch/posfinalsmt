import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { posDb } from "@/lib/pos-db";

export interface StoreRecord {
  id: string;
  name: string;
  logo_url: string | null;
  currency_symbol: string;
  tax_rate: number;
  business_type: string;
  advanced_accounting_mode: boolean;
  is_pro: boolean;
  address: string | null;
  cashier_name: string | null;
  phone_numbers: string[];
  receipt_header: string | null;
  receipt_footer: string | null;
  parent_store_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  store: StoreRecord | null;
  /** All shops this account can open (owner: main + branches). */
  stores: StoreRecord[];
  /** True when signed in as a branch device (not the owner). */
  isBranchDevice: boolean;
  switchStore: (id: string) => void;
  loading: boolean;
  refreshStore: () => Promise<StoreRecord | null>;
  updateStore: (patch: Partial<Omit<StoreRecord, "id">>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const PENDING_STORE_NAME_KEY = "pos-pending-store-name";

const STORE_COLUMNS =
  "id, name, logo_url, currency_symbol, tax_rate, business_type, advanced_accounting_mode, is_pro, address, cashier_name, phone_numbers, receipt_header, receipt_footer, parent_store_id";

export const ACTIVE_STORE_KEY = "pos-active-store-id";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setStore(null);
      return null;
    }
    setOwnerId(activeSession.user.id);
    const { data: list } = await supabase
      .from("stores")
      .select(STORE_COLUMNS)
      .order("created_at");
    const all = (list ?? []) as StoreRecord[];
    if (all.length > 0) {
      setStores(all);
      const saved =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_STORE_KEY) : null;
      const pick =
        all.find((s) => s.id === saved) ?? all.find((s) => !s.parent_store_id) ?? all[0]!;
      setStore(pick);
      return pick;
    }

    // No store yet (e.g. first sign-in, possibly via magic link in a new tab):
    // create it from the pending name captured on the sign-in form.
    const pendingName =
      (typeof window !== "undefined"
        ? window.localStorage.getItem(PENDING_STORE_NAME_KEY)
        : null) || "My Store";
    const { data: created } = await supabase
      .from("stores")
      .insert({ name: pendingName, owner_id: activeSession.user.id })
      .select(STORE_COLUMNS)
      .maybeSingle();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PENDING_STORE_NAME_KEY);
    }
    setStores(created ? [created as StoreRecord] : []);
    setStore((created as StoreRecord) ?? null);
    return (created as StoreRecord) ?? null;
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

  const updateStore = useCallback(
    async (patch: Partial<Omit<StoreRecord, "id">>) => {
      const current = store;
      if (!current) throw new Error("No active store");
      const { data, error } = await supabase
        .from("stores")
        .update(patch)
        .eq("id", current.id)
        .select(STORE_COLUMNS)
        .maybeSingle();
      if (error) throw error;
      if (data) setStore(data as StoreRecord);
    },
    [store],
  );

  const switchStore = useCallback(
    (id: string) => {
      const next = stores.find((s) => s.id === id);
      if (!next) return;
      window.localStorage.setItem(ACTIVE_STORE_KEY, id);
      // Reload so cached items/sales from the previous shop are not mixed in.
      void posDb
        .transaction("rw", posDb.cached_items, async () => posDb.cached_items.clear())
        .finally(() => window.location.reload());
    },
    [stores],
  );

  const isBranchDevice = Boolean(
    session && store?.parent_store_id && !stores.some((s) => !s.parent_store_id),
  );
  void ownerId;

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(ACTIVE_STORE_KEY);
    await posDb.transaction("rw", posDb.cached_items, posDb.pending_sales, async () => {
      await posDb.cached_items.clear();
      await posDb.pending_sales.clear();
    });
    await supabase.auth.signOut();
    setSession(null);
    setStore(null);
    setStores([]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      store,
      stores,
      isBranchDevice,
      switchStore,
      loading,
      refreshStore,
      updateStore,
      signOut,
    }),
    [session, store, stores, isBranchDevice, switchStore, loading, refreshStore, updateStore, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
