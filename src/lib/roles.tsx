import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export type StoreRole = "OWNER" | "MANAGER" | "CASHIER";

interface RoleContextValue {
  role: StoreRole;
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
  /** Cost prices, purchases and profit figures are owner/manager only. */
  canSeeCost: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { session, store } = useAuth();
  const [role, setRole] = useState<StoreRole>("CASHIER");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!session || !store) {
        if (!cancelled) {
          setRole("CASHIER");
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("store_members")
        .select("role")
        .eq("store_id", store.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setRole((data?.role as StoreRole) ?? "OWNER");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, store]);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      isOwner: role === "OWNER",
      isManager: role === "MANAGER",
      isCashier: role === "CASHIER",
      canSeeCost: role !== "CASHIER",
      loading,
    }),
    [role, loading],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  return (
    useContext(RoleContext) ?? {
      role: "OWNER",
      isOwner: true,
      isManager: false,
      isCashier: false,
      canSeeCost: true,
      loading: false,
    }
  );
}

export const ROLE_LABEL: Record<StoreRole, string> = {
  OWNER: "ဆိုင်ပိုင်ရှင်",
  MANAGER: "မန်နေဂျာ",
  CASHIER: "ကောင်တာဝန်ထမ်း",
};
