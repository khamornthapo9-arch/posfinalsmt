import { useMemo } from "react";
import { useAuth } from "@/lib/auth-store";

export type PlanType = "FREE" | "PRO";

/** FREE tier hard limits. */
export const FREE_LIMITS = {
  items: 300,
  customers: 20,
  suppliers: 20,
  heldCarts: 1,
  staffAccounts: 1,
} as const;

export interface SubscriptionState {
  plan_type: PlanType;
  isPro: boolean;
  isFree: boolean;
  limits: typeof FREE_LIMITS;
  /** Convenience: returns Infinity on PRO, the FREE cap otherwise. */
  limitFor: (key: keyof typeof FREE_LIMITS) => number;
}

/** Global subscription state derived from the active store account. */
export function useSubscription(): SubscriptionState {
  const { store } = useAuth();
  const plan_type: PlanType = store?.is_pro ? "PRO" : "FREE";
  return useMemo(() => {
    const isPro = plan_type === "PRO";
    return {
      plan_type,
      isPro,
      isFree: !isPro,
      limits: FREE_LIMITS,
      limitFor: (key: keyof typeof FREE_LIMITS) => (isPro ? Infinity : FREE_LIMITS[key]),
    };
  }, [plan_type]);
}
