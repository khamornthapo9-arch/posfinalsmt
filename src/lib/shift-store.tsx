import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useRole } from "@/lib/roles";
import { setCachedShiftId } from "@/lib/shift-ref";
import type { Database } from "@/integrations/supabase/types";

export type Shift = Database["public"]["Tables"]["cashier_shifts"]["Row"];
export type CashMovement = Database["public"]["Tables"]["cash_movements"]["Row"];

export type DrawerMovementType =
  "CASH_DROP" | "OWNER_CONTRIBUTION" | "OWNER_WITHDRAWAL" | "SAFE_TO_DRAWER";

export interface ShiftSummary {
  opening_cash: number;
  cash_sales: number;
  kbzpay_sales: number;
  wavepay_sales: number;
  credit_sales: number;
  sale_count: number;
  cash_in: number;
  cash_out: number;
  cash_drops: number;
  cash_expenses: number;
  cash_refunds: number;
  owner_contributions: number;
  owner_withdrawals: number;
  safe_to_drawer: number;
  customer_payments: number;
  expense_voids: number;
  supplier_payments: number;
  expected_cash: number;
  late_adjustment: number;
}

/** Maps the shift functions' error codes to Burmese messages. */
const SHIFT_ERRORS: [string, string][] = [
  ["shift_already_open", "သင့်အကောင့်တွင် ဖွင့်ထားသော အလုပ်ပတ် (shift) ရှိပြီးသား ဖြစ်သည်"],
  ["shift_closed", "ဤအလုပ်ပတ်ကို ပိတ်ပြီးပါပြီ — အသစ်ပြန်ဖွင့်ပါ"],
  ["shift_not_found", "အလုပ်ပတ် မတွေ့ပါ"],
  ["shift_not_closed", "ပိတ်ပြီးသော အလုပ်ပတ်ကိုသာ စစ်ဆေးနိုင်သည်"],
  ["shift_required", "ဤလုပ်ဆောင်ချက်အတွက် အလုပ်ပတ် (shift) ဖွင့်ထားရန် လိုသည်"],
  ["insufficient_drawer_cash", "အံဆွဲထဲရှိ ငွေသား မလုံလောက်ပါ"],
  ["note_required_for_difference", "ငွေကွာခြားမှု ရှိပါက မှတ်ချက် ထည့်ပါ"],
  ["note_required", "မှတ်ချက် ထည့်ပါ"],
  ["self_review_not_allowed", "ကိုယ်တိုင်ပိတ်ထားသော ကွာခြားမှုကို ကိုယ်တိုင် အတည်မပြုနိုင်ပါ"],
  ["already_approved", "အတည်ပြုပြီးသား ဖြစ်သည်"],
  ["reason_required", "အကြောင်းရင်း ထည့်ပါ"],
  ["category_required", "အမျိုးအစား ထည့်ပါ"],
  ["invalid_amount", "ပမာဏ မမှန်ကန်ပါ"],
  ["invalid_movement_type", "ငွေလွှဲပြောင်းမှု အမျိုးအစား မမှန်ကန်ပါ"],
  ["drawer_requires_cash", "အံဆွဲမှ ထုတ်သုံးခြင်းသည် ငွေသားဖြင့်သာ ဖြစ်ရမည်"],
  ["invalid_payment_method", "ငွေပေးချေမှု နည်းလမ်း မမှန်ကန်ပါ"],
  ["not_authorized", "ဤလုပ်ဆောင်ချက်အတွက် ခွင့်ပြုချက် မရှိပါ"],
  ["not_authenticated", "ဝင်ရောက်မှု သက်တမ်းကုန်သွားပါပြီ၊ ပြန်လည် ဝင်ပါ"],
  ["request_id_conflict", "တောင်းဆိုမှု နံပါတ် ထပ်နေသည်၊ ထပ်မံကြိုးစားပါ"],
  ["expense_immutable", "ဤအသုံးစရိတ်ကို ပြင်/ဖျက်၍ မရပါ — ပယ်ဖျက်ပြီး အသစ်ပြန်မှတ်ပါ"],
  ["use_specific_movement_type", "ငွေသား အဝင်/အထွက် အမျိုးအစားကို တိတိကျကျ ရွေးပါ"],
  ["sale_not_found", "ဘောက်ချာ မတွေ့ပါ"],
  [
    "sale_not_refundable",
    "ဤဘောက်ချာကို ပြန်အမ်း၍ မရပါ (ပြီးစီးပြီးသော ဘောက်ချာသာ ပြန်အမ်းနိုင်သည်)",
  ],
  ["expense_not_found", "အသုံးစရိတ် မတွေ့ပါ"],
  ["already_replaced", "ဤအသုံးစရိတ်ကို ပြင်ဆင်ပြီးသား ဖြစ်သည်"],
  ["open_shift_required_for_cash_void", "ငွေသားအသုံးစရိတ် ပယ်ဖျက်ရန် အလုပ်ပတ် ဖွင့်ထားရမည်"],
  ["overpayment", "ပေးချေငွေသည် ကျန်ရှိငွေထက် များနေသည်"],
  ["customer_not_found", "ဖောက်သည် မတွေ့ပါ"],
  ["sale_financial_fields_locked", "ဘောက်ချာ၏ ငွေကြေးအချက်အလက်ကို တိုက်ရိုက် ပြင်၍ မရပါ"],
  ["balance_managed_by_database", "လက်ကျန်ငွေကို တိုက်ရိုက် ပြင်၍ မရပါ"],
  ["supplier_not_found", "ကုန်သွင်းသူ မတွေ့ပါ"],
  ["supplier_has_history", "မှတ်တမ်း သို့မဟုတ် လက်ကျန်ရှိသော ကုန်သွင်းသူကို ဖျက်၍ မရပါ"],
  ["direct_sale_insert_not_allowed", "အရောင်းကို ဤနည်းဖြင့် မှတ်တမ်းတင်၍ မရပါ"],
];

export function shiftErrorMessage(error: unknown): string {
  const raw = (error as { message?: string } | null)?.message ?? "";
  const hit = SHIFT_ERRORS.find(([code]) => raw.includes(code));
  return hit ? hit[1] : "လုပ်ဆောင်၍ မရပါ — ထပ်ကြိုးစားပါ";
}

const num = (value: unknown): number => Number(value ?? 0);

function toSummary(raw: unknown): ShiftSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    opening_cash: num(r["opening_cash"]),
    cash_sales: num(r["cash_sales"]),
    kbzpay_sales: num(r["kbzpay_sales"]),
    wavepay_sales: num(r["wavepay_sales"]),
    credit_sales: num(r["credit_sales"]),
    sale_count: num(r["sale_count"]),
    cash_in: num(r["cash_in"]),
    cash_out: num(r["cash_out"]),
    cash_drops: num(r["cash_drops"]),
    cash_expenses: num(r["cash_expenses"]),
    cash_refunds: num(r["cash_refunds"]),
    owner_contributions: num(r["owner_contributions"]),
    owner_withdrawals: num(r["owner_withdrawals"]),
    safe_to_drawer: num(r["safe_to_drawer"]),
    customer_payments: num(r["customer_payments"]),
    expense_voids: num(r["expense_voids"]),
    supplier_payments: num(r["supplier_payments"]),
    expected_cash: num(r["expected_cash"]),
    late_adjustment: num(r["late_adjustment"]),
  };
}

interface ShiftContextValue {
  /** The signed-in account's OPEN shift in the active store, if any. */
  activeShift: Shift | null;
  loading: boolean;
  /** False until the M7 migration is installed (the shift tables do not exist yet). */
  supported: boolean;
  refresh: () => Promise<void>;
  openShift: (input: { openingCash: number; requestId: string }) => Promise<void>;
  recordMovement: (input: {
    type: DrawerMovementType;
    amount: number;
    reason: string;
    requestId: string;
  }) => Promise<void>;
  recordDrawerExpense: (input: {
    category: string;
    amount: number;
    note: string;
    requestId: string;
  }) => Promise<void>;
  closeShift: (input: {
    shiftId: string;
    countedCash: number;
    note: string;
  }) => Promise<{ expected: number; counted: number; difference: number; alreadyClosed: boolean }>;
  reviewShift: (input: {
    shiftId: string;
    decision: "APPROVED" | "FLAGGED";
    note: string;
  }) => Promise<void>;
  loadShifts: () => Promise<Shift[]>;
  loadMovements: (shiftId: string) => Promise<CashMovement[]>;
  getSummary: (shiftId: string) => Promise<ShiftSummary>;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { session, store } = useAuth();
  const { activeStaff } = useRole();
  const storeId = store?.id ?? null;
  const userId = session?.user.id ?? null;
  const staffName = activeStaff?.name ?? store?.cashier_name ?? null;

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  const refresh = useCallback(async () => {
    if (!storeId || !userId) {
      setActiveShift(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cashier_shifts")
        .select("*")
        .eq("store_id", storeId)
        .eq("opened_by", userId)
        .eq("status", "OPEN")
        .maybeSingle();
      if (error) {
        // Table missing (migration not applied): shifts are simply unavailable. Any other failure
        // (offline) keeps what we already know instead of dropping the shift link.
        if (/does not exist|schema cache|PGRST205|42P01/i.test(error.message)) {
          setSupported(false);
          setActiveShift(null);
          setCachedShiftId(storeId, null);
        }
        return;
      }
      setSupported(true);
      setActiveShift(data ?? null);
      setCachedShiftId(storeId, data?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [storeId, userId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [refresh]);

  const openShift = useCallback<ShiftContextValue["openShift"]>(
    async ({ openingCash, requestId }) => {
      if (!storeId) throw new Error("No active store");
      const { error } = await supabase.rpc("open_shift", {
        p_store_id: storeId,
        p_opening_cash: openingCash,
        p_request_id: requestId,
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
      await refresh();
    },
    [refresh, staffName, storeId],
  );

  const recordMovement = useCallback<ShiftContextValue["recordMovement"]>(
    async ({ type, amount, reason, requestId }) => {
      if (!activeShift) throw new Error(shiftErrorMessage({ message: "shift_not_found" }));
      const { error } = await supabase.rpc("record_cash_movement", {
        p_shift_id: activeShift.id,
        p_type: type,
        p_amount: amount,
        p_reason: reason,
        p_request_id: requestId,
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
    },
    [activeShift, staffName],
  );

  const recordDrawerExpense = useCallback<ShiftContextValue["recordDrawerExpense"]>(
    async ({ category, amount, note, requestId }) => {
      if (!storeId || !activeShift)
        throw new Error(shiftErrorMessage({ message: "shift_required" }));
      const { error } = await supabase.rpc("record_expense", {
        p_store_id: storeId,
        p_request_id: requestId,
        p_category: category,
        p_amount: amount,
        p_note: note,
        p_paid_with: "ငွေသား",
        p_spent_at: new Date().toISOString(),
        p_shift_id: activeShift.id,
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
    },
    [activeShift, staffName, storeId],
  );

  const closeShift = useCallback<ShiftContextValue["closeShift"]>(
    async ({ shiftId, countedCash, note }) => {
      const { data, error } = await supabase.rpc("close_shift", {
        p_shift_id: shiftId,
        p_counted_cash: countedCash,
        p_note: note,
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
      const r = (data ?? {}) as Record<string, unknown>;
      await refresh();
      return {
        expected: num(r["expected_cash"]),
        counted: num(r["counted_cash"]),
        difference: num(r["cash_difference"]),
        alreadyClosed: r["already_closed"] === true,
      };
    },
    [refresh, staffName],
  );

  const reviewShift = useCallback<ShiftContextValue["reviewShift"]>(async (input) => {
    const { error } = await supabase.rpc("review_shift", {
      p_shift_id: input.shiftId,
      p_decision: input.decision,
      p_note: input.note,
    });
    if (error) throw new Error(shiftErrorMessage(error));
  }, []);

  const loadShifts = useCallback(async () => {
    if (!storeId) return [];
    const { data, error } = await supabase
      .from("cashier_shifts")
      .select("*")
      .eq("store_id", storeId)
      .order("opened_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }, [storeId]);

  const loadMovements = useCallback(async (shiftId: string) => {
    const { data, error } = await supabase
      .from("cash_movements")
      .select("*")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }, []);

  const getSummary = useCallback(async (shiftId: string) => {
    const { data, error } = await supabase.rpc("get_shift_summary", { p_shift_id: shiftId });
    if (error) throw new Error(shiftErrorMessage(error));
    return toSummary(data);
  }, []);

  const value = useMemo<ShiftContextValue>(
    () => ({
      activeShift,
      loading,
      supported,
      refresh,
      openShift,
      recordMovement,
      recordDrawerExpense,
      closeShift,
      reviewShift,
      loadShifts,
      loadMovements,
      getSummary,
    }),
    [
      activeShift,
      loading,
      supported,
      refresh,
      openShift,
      recordMovement,
      recordDrawerExpense,
      closeShift,
      reviewShift,
      loadShifts,
      loadMovements,
      getSummary,
    ],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftContextValue {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShift must be used inside ShiftProvider");
  return ctx;
}
