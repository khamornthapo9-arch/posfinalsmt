import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export type StoreRole = "OWNER" | "MANAGER" | "CASHIER";

export interface ActiveStaff {
  id: string;
  name: string;
  role: StoreRole;
}

const STAFF_KEY = "pos-active-staff";

interface RoleContextValue {
  /** Effective role (PIN-selected staff if any, otherwise the account role). */
  role: StoreRole;
  /** The role attached to the signed-in account itself. */
  accountRole: StoreRole;
  /** Staff member currently working on this device (PIN switch), if any. */
  activeStaff: ActiveStaff | null;
  /** Sign a staff member in on this device with their PIN. */
  switchStaffByPin: (pin: string) => Promise<ActiveStaff>;
  /** Return to the signed-in account's own role. */
  clearActiveStaff: () => void;
  /** Verify a manager/owner PIN without switching (approval prompts). */
  verifyManagerPin: (pin: string) => Promise<boolean>;
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
  /** Cost prices, purchases and profit figures are owner/manager only. */
  canSeeCost: boolean;
  canManageSettings: boolean;
  canManageInventory: boolean;
  canViewAnalytics: boolean;
  canManageStaff: boolean;
  canExportMasterCsv: boolean;
  canBulkImport: boolean;
  canManageAccounting: boolean;
  canManageCustomers: boolean;
  /** Owner/manager level approvals (refunds, manual price edits). */
  canApprove: boolean;
  isActive: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { session, store } = useAuth();
  const [accountRole, setAccountRole] = useState<StoreRole>("CASHIER");
  const [accountActive, setAccountActive] = useState(true);
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STAFF_KEY);
    if (raw) {
      try {
        setActiveStaff(JSON.parse(raw) as ActiveStaff);
      } catch {
        window.sessionStorage.removeItem(STAFF_KEY);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!session || !store) {
        if (!cancelled) {
          setAccountRole("CASHIER");
          setAccountActive(true);
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
      setAccountRole((data?.role as StoreRole) ?? "OWNER");
      setAccountActive(data?.is_active ?? true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, store]);

  const persist = useCallback((staff: ActiveStaff | null) => {
    setActiveStaff(staff);
    if (typeof window === "undefined") return;
    if (staff) window.sessionStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    else window.sessionStorage.removeItem(STAFF_KEY);
  }, []);

  const switchStaffByPin = useCallback<RoleContextValue["switchStaffByPin"]>(
    async (pin) => {
      if (!store) throw new Error("No active store");
      const { data } = await supabase
        .from("store_members")
        .select("id, display_name, role, is_active")
        .eq("store_id", store.id)
        .eq("pin_code", pin)
        .maybeSingle();
      if (!data) throw new Error("PIN မမှန်ပါ");
      if (!data.is_active) throw new Error("ဤဝန်ထမ်း အကောင့်ကို ရပ်ဆိုင်းထားသည်");
      const staff: ActiveStaff = {
        id: data.id,
        name: data.display_name ?? "ဝန်ထမ်း",
        role: data.role as StoreRole,
      };
      persist(staff);
      return staff;
    },
    [store, persist],
  );

  const clearActiveStaff = useCallback(() => persist(null), [persist]);

  const verifyManagerPin = useCallback<RoleContextValue["verifyManagerPin"]>(
    async (pin) => {
      if (!store) return false;
      const { data } = await supabase
        .from("store_members")
        .select("role, is_active")
        .eq("store_id", store.id)
        .eq("pin_code", pin)
        .maybeSingle();
      return Boolean(data?.is_active && (data.role === "OWNER" || data.role === "MANAGER"));
    },
    [store],
  );

  const value = useMemo<RoleContextValue>(() => {
    const role: StoreRole = activeStaff?.role ?? accountRole;
    const isOwner = role === "OWNER";
    const isManager = role === "MANAGER";
    const isCashier = role === "CASHIER";
    const active = accountActive;
    return {
      role,
      accountRole,
      activeStaff,
      switchStaffByPin,
      clearActiveStaff,
      verifyManagerPin,
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
      canApprove: (isOwner || isManager) && active,
      isActive: active,
      loading,
    };
  }, [
    accountRole,
    accountActive,
    activeStaff,
    switchStaffByPin,
    clearActiveStaff,
    verifyManagerPin,
    loading,
  ]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  return (
    useContext(RoleContext) ?? {
      role: "OWNER",
      accountRole: "OWNER",
      activeStaff: null,
      switchStaffByPin: async () => {
        throw new Error("No role provider");
      },
      clearActiveStaff: () => {},
      verifyManagerPin: async () => true,
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
      canApprove: true,
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
