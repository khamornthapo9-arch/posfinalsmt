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
  /** Can open the Settings page and its sub-pages (receipt, plan, staff). */
  canManageSettings: boolean;
  /** Can manage inventory and item units. */
  canManageInventory: boolean;
  /** Can view analytics and export master CSV. */
  canViewAnalytics: boolean;
  /** Can manage staff (invite/PIN, edit roles, deactivate). */
  canManageStaff: boolean;
  /** Can export the master CSV report. */
  canExportMasterCsv: boolean;
  /** Can bulk-import items via CSV. */
  canBulkImport: boolean;
  /** Can manage suppliers, purchases and expenses. */
  canManageAccounting: boolean;
  /** Can view/manage customers and credit/debt. */
  canManageCustomers: boolean;
  /** Staff record is active. */
  isActive: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { session, store } = useAuth();
  const [role, setRole] = useState<StoreRole>("CASHIER");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!session || !store) {
        if (!cancelled) {
          setRole("CASHIER");
          setIsActive(true);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("store_members")
        .select("role, is_active")
        .eq("store_id", store.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setRole((data?.role as StoreRole) ?? "OWNER");
      setIsActive(data?.is_active ?? true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, store]);

  const value = useMemo<RoleContextValue>(() => {
    const isOwner = role === "OWNER";
    const isManager = role === "MANAGER";
    const isCashier = role === "CASHIER";
    const active = isActive;
    return {
      role,
      isOwner,
      isManager,
      isCashier,
      canSeeCost: isOwner || isManager,
      canManageSettings: isOwner && active,
      canManageInventory: (isOwner || isManager) && active,
      canViewAnalytics: (isOwner || isManager) && active,
      canManageStaff: isOwner && active,
      canExportMasterCsv: (isOwner || isManager) && active,
      canBulkImport: (isOwner || isManager) && active,
      canManageAccounting: (isOwner || isManager) && active,
      canManageCustomers: (isOwner || isManager || isCashier) && active,
      isActive: active,
      loading,
    };
  }, [role, isActive, loading]);

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
      canManageSettings: true,
      canManageInventory: true,
      canViewAnalytics: true,
      canManageStaff: true,
      canExportMasterCsv: true,
      canBulkImport: true,
      canManageAccounting: true,
      canManageCustomers: true,
      isActive: true,
      loading: false,
    }
  );
}

export const ROLE_LABEL: Record<StoreRole, string> = {
  OWNER: "ဆိုင်ပိုင်ရှင်",
  MANAGER: "မန်နေဂျာ",
  CASHIER: "ကောင်တာဝန်ထမ်း",
};
