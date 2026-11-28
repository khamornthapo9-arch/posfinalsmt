import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useRole } from "@/lib/roles";
import { shiftErrorMessage, useShift } from "@/lib/shift-store";

/** Chart of accounts used by the double-entry engine. */
export const ACCOUNTS = {
  CASH: "CASH",
  KBZPAY: "KBZPAY",
  WAVEPAY: "WAVEPAY",
  RECEIVABLE: "ACCOUNTS_RECEIVABLE",
  PAYABLE: "ACCOUNTS_PAYABLE",
  INVENTORY: "INVENTORY",
  SALES_REVENUE: "SALES_REVENUE",
  TAX_PAYABLE: "TAX_PAYABLE",
  COGS: "COGS",
  EXPENSE: "OPERATING_EXPENSE",
  OWNER_EQUITY: "OWNER_EQUITY",
} as const;

export const CREDIT_METHOD = "အကြွေး";
export const CASH_METHOD = "ငွေသား";
export const LIQUID_ACCOUNTS = [ACCOUNTS.CASH, ACCOUNTS.KBZPAY, ACCOUNTS.WAVEPAY] as string[];

export function accountForMethod(method: string) {
  const key = method.toLowerCase();
  if (method === CREDIT_METHOD) return ACCOUNTS.RECEIVABLE;
  if (key.includes("kbz")) return ACCOUNTS.KBZPAY;
  if (key.includes("wave")) return ACCOUNTS.WAVEPAY;
  return ACCOUNTS.CASH;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
  customer_type: string;
  /** CRM fields (migration 20261123000000). Absent until that migration is applied. */
  email?: string | null;
  address?: string | null;
  /** Set when archived; archived customers keep their sales history but are not offered at the register. */
  archived_at?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
}

export interface PurchaseLine {
  item_id: string;
  quantity: number;
  unit_cost: number;
  name?: string;
  unit_name?: string | null;
  conversion?: number;
  received_quantity?: number;
}

export const PURCHASE_DRAFT = "DRAFT";
export const PURCHASE_ORDERED = "ORDERED";
export const PURCHASE_PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED";
export const PURCHASE_RECEIVED = "ရရှိပြီး"; // Backwards compatible with legacy
export const PURCHASE_PENDING = "စောင့်ဆိုင်းဆဲ"; // Backwards compatible with legacy
export const PURCHASE_CANCELLED = "CANCELLED";

/**
 * The existing one-shot receive (G2 will replace it) may only run on confirmed orders. Drafts,
 * cancelled and already-received orders must never add stock through it.
 */
export const canReceiveLegacy = (status: string) =>
  status === PURCHASE_ORDERED || status === PURCHASE_PENDING;

/** How a purchase prepayment was made. Codes match the ledger accounts they are credited to. */
export const PURCHASE_PAYMENT_METHODS = ["CASH", "KBZPAY", "WAVEPAY"] as const;
export type PurchasePaymentMethod = (typeof PURCHASE_PAYMENT_METHODS)[number];
export const PURCHASE_PAYMENT_LABEL: Record<PurchasePaymentMethod, string> = {
  CASH: "ငွေသား",
  KBZPAY: "KBZ Pay",
  WAVEPAY: "Wave Pay",
};
export const isPurchasePaymentMethod = (value: unknown): value is PurchasePaymentMethod =>
  typeof value === "string" && (PURCHASE_PAYMENT_METHODS as readonly string[]).includes(value);

/** Maps receive_purchase's error codes to Burmese messages. */
const RECEIVE_PURCHASE_ERRORS: [string, string][] = [
  [
    "payment_method_required",
    "ကြိုတင်ပေးငွေ ပေးချေခဲ့သော နည်းလမ်း (ငွေသား / KBZ Pay / Wave Pay) ရွေးပါ",
  ],
  ["invalid_payment_method", "ငွေပေးချေမှု နည်းလမ်း မမှန်ကန်ပါ"],
  ["not_authorized", "ကုန်ပစ္စည်း လက်ခံရန် ခွင့်ပြုချက် မရှိပါ"],
  ["not_authenticated", "ဝင်ရောက်မှု သက်တမ်းကုန်သွားပါပြီ၊ ပြန်လည် ဝင်ပါ"],
  ["purchase_not_found", "ဝယ်ယူမှု အော်ဒါ မတွေ့ပါ"],
  ["purchase_not_receivable", "ဤအော်ဒါကို လက်ခံ၍ မရပါ — အတည်ပြုပြီးသော အော်ဒါများသာ လက်ခံနိုင်သည်"],
  ["partially_received", "ဤအော်ဒါတွင် တစ်စိတ်တစ်ပိုင်း လက်ခံမှု ရှိပြီးသား ဖြစ်သည်"],
  ["total_mismatch", "အော်ဒါ စုစုပေါင်းနှင့် စာရင်းမကိုက်ပါ — အော်ဒါကို ပြန်ပြင်ပါ"],
  ["empty_purchase", "အော်ဒါတွင် ပစ္စည်း မရှိပါ"],
  ["item_not_found", "အော်ဒါထဲရှိ ပစ္စည်းတစ်ခု မတွေ့ပါ (သို့) ဤဆိုင်နှင့် မသက်ဆိုင်ပါ"],
  ["quantity_too_large", "လက်ကျန် ပမာဏ ကန့်သတ်ချက် ကျော်လွန်နေသည်"],
  ["supplier_not_found", "ကုန်သွင်းသူ မတွေ့ပါ"],
  ["invalid_amount_paid", "ကြိုတင်ပေးငွေ မမှန်ကန်ပါ"],
  ["invalid_conversion", "ယူနစ် ပြောင်းလဲနှုန်း မမှန်ကန်ပါ"],
  ["invalid_quantity", "အရေအတွက် မမှန်ကန်ပါ"],
];

export const receivePurchaseErrorMessage = (error: unknown): string => {
  const raw = (error as { message?: string } | null)?.message ?? "";
  const hit = RECEIVE_PURCHASE_ERRORS.find(([code]) => raw.includes(code));
  return hit ? hit[1] : "လက်ခံ၍ မရပါ — ထပ်ကြိုးစားပါ";
};

/** Only drafts and cancelled orders may be deleted; anything that may have moved stock may not. */
export const canDeletePurchase = (status: string) =>
  status === PURCHASE_DRAFT || status === PURCHASE_CANCELLED;

export interface Purchase {
  id: string;
  supplier_id: string | null;
  status: string;
  total_amount: number;
  amount_paid: number;
  /** How the prepayment was made; null on older orders (asked for at receive time). */
  payment_method: PurchasePaymentMethod | null;
  notes: string | null;
  created_at: string;
  lines: PurchaseLine[];
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  paid_with: string;
  spent_at: string;
  /** Set when the expense was recorded by record_expense (ledger written with it; read-only). */
  request_id?: string | null;
  /** Shift whose drawer paid it, when it was paid from the drawer. */
  shift_id?: string | null;
  /** Set when the expense was voided (kept for history, excluded from totals). */
  voided_at?: string | null;
  void_reason?: string | null;
  /** The expense that replaced this one after a correction. */
  replaced_by?: string | null;
  /** The expense this one replaced. */
  replaces_expense_id?: string | null;
}

export interface LedgerEntry {
  id: string;
  account: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  reference_type: string | null;
  memo: string | null;
  entry_date: string;
}

export interface LedgerLine {
  account: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  memo?: string;
}

interface PurchaseRow {
  id: string;
  supplier_id: string | null;
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  purchase_items:
    | {
        item_id: string;
        quantity: number;
        unit_cost: number | string;
        unit_name?: string | null;
        conversion?: number;
        received_quantity?: number;
        items: { name: string } | null;
      }[]
    | null;
}

interface AccountingContextValue {
  enabled: boolean;
  loading: boolean;
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  expenses: Expense[];
  ledger: LedgerEntry[];
  balances: Record<string, number>;
  liquidCapital: number;
  receivable: number;
  payable: number;
  totalExpenses: number;
  refreshAll: () => Promise<void>;
  postEntries: (
    lines: LedgerLine[],
    ref: { type: string; id?: string | null; memo?: string },
  ) => Promise<void>;
  postSale: (input: {
    saleId?: string | null;
    subtotal: number;
    tax: number;
    cogs: number;
    paymentMethod: string;
    customerId?: string | null;
    /** Payment split breakdown; when omitted the whole total lands on paymentMethod. */
    splits?: { method: string; amount: number }[];
    /** True when the database function already applied the credit balance + debt record. */
    skipCredit?: boolean;
  }) => Promise<void>;
  saveCustomer: (input: {
    id?: string;
    name: string;
    phone: string;
    note: string;
    email?: string;
    address?: string;
  }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  /** Archive (true) or restore (false). Never deletes, so past sales keep their customer. */
  setCustomerArchived: (id: string, archived: boolean) => Promise<void>;
  quickAddCustomer: (input: { name: string; phone: string }) => Promise<Customer>;
  saveSupplier: (input: {
    id?: string;
    name: string;
    phone: string;
    note: string;
  }) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  createPurchase: (input: {
    /** Defaults to ORDERED. DRAFT saves the order without committing to it. */
    status?: typeof PURCHASE_DRAFT | typeof PURCHASE_ORDERED;
    supplierId: string | null;
    lines: PurchaseLine[];
    amountPaid: number;
    /** Required in the UI when amountPaid > 0. */
    paymentMethod: PurchasePaymentMethod | null;
    notes: string;
  }) => Promise<void>;
  /** Edit a DRAFT purchase (lines, supplier, notes). Optionally confirm it in the same save. */
  updateDraftPurchase: (input: {
    purchaseId: string;
    supplierId: string | null;
    lines: PurchaseLine[];
    amountPaid: number;
    paymentMethod: PurchasePaymentMethod | null;
    notes: string;
    confirm?: boolean;
  }) => Promise<void>;
  /** DRAFT → ORDERED. Changes status only: no stock, cost, supplier balance or ledger effect. */
  confirmPurchase: (purchaseId: string) => Promise<void>;
  /**
   * Receives the WHOLE purchase in one database transaction (stock in base units, last cost,
   * movements, supplier balance, ledger, status). Returns true when it was already received.
   * `paymentMethod` is only needed when the order has a prepayment but no recorded method.
   */
  receivePurchase: (
    purchaseId: string,
    paymentMethod?: PurchasePaymentMethod,
  ) => Promise<{ alreadyReceived: boolean }>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  saveExpense: (input: {
    category: string;
    amount: number;
    note: string;
    paidWith: string;
    spentAt: string;
    /** Pay from the open shift's cash drawer (cash only; reduces expected drawer cash once). */
    fromDrawer?: boolean;
    /** Idempotency key for this attempt (a retry with the same key never duplicates). */
    requestId?: string;
  }) => Promise<void>;
  /** Owner/manager only. Keeps the expense, reverses its ledger entries (never a delete). */
  voidExpense: (input: { expenseId: string; reason: string; requestId?: string }) => Promise<void>;
  /** Owner/manager only. Void + replacement in one database transaction. */
  correctExpense: (input: {
    expenseId: string;
    reason: string;
    category: string;
    amount: number;
    note: string;
    paidWith: string;
    spentAt: string;
    fromDrawer?: boolean;
    voidRequestId?: string;
    requestId?: string;
  }) => Promise<void>;
  settleCustomerDebt: (input: {
    customerId: string;
    amount: number;
    method: string;
    /** Idempotency key for this attempt (a retry with the same key never posts twice). */
    requestId?: string;
  }) => Promise<void>;
  paySupplierDebt: (input: { supplierId: string; amount: number; method: string }) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextValue | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const { store } = useAuth();
  const storeId = store?.id ?? null;
  const enabled = Boolean(store?.advanced_accounting_mode);
  const { activeShift } = useShift();
  const { activeStaff } = useRole();
  const staffName = activeStaff?.name ?? store?.cashier_name ?? null;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  const refreshAll = useCallback(async () => {
    if (!storeId) {
      setCustomers([]);
      setSuppliers([]);
      setPurchases([]);
      setExpenses([]);
      setLedger([]);
      return;
    }
    setLoading(true);
    try {
      const [c, s, p, e, l] = await Promise.all([
        // "*" so the loader keeps working before and after the CRM columns exist.
        supabase.from("customers").select("*").eq("store_id", storeId).order("name"),
        supabase
          .from("suppliers")
          .select("id,name,phone,note,balance")
          .eq("store_id", storeId)
          .order("name"),
        supabase
          .from("purchases")
          .select(
            "id,supplier_id,status,total_amount,amount_paid,payment_method,notes,created_at,purchase_items(item_id,quantity,unit_cost,unit_name,conversion,received_quantity,items(name))",
          )
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("*")
          .eq("store_id", storeId)
          .order("spent_at", { ascending: false }),
        supabase
          .from("ledger_entries")
          .select("id,account,direction,amount,reference_type,memo,entry_date")
          .eq("store_id", storeId)
          .order("entry_date", { ascending: false })
          .limit(2000),
      ]);
      setCustomers(
        (c.data ?? []).map((row) => ({ ...row, balance: Number(row.balance) })) as Customer[],
      );
      setSuppliers(
        (s.data ?? []).map((row) => ({ ...row, balance: Number(row.balance) })) as Supplier[],
      );
      const purchaseRows = (p.data ?? []) as unknown as PurchaseRow[];
      setPurchases(
        purchaseRows.map((row) => ({
          id: row.id,
          supplier_id: row.supplier_id ?? null,
          status: row.status,
          total_amount: Number(row.total_amount),
          amount_paid: Number(row.amount_paid),
          payment_method: isPurchasePaymentMethod(row.payment_method) ? row.payment_method : null,
          notes: row.notes ?? null,
          created_at: row.created_at,
          lines: (row.purchase_items ?? []).map((line) => ({
            item_id: line.item_id,
            quantity: Number(line.quantity),
            unit_cost: Number(line.unit_cost),
            unit_name: line.unit_name ?? null,
            conversion: Number(line.conversion || 1),
            received_quantity: Number(line.received_quantity || 0),
            name: line.items?.name ?? "",
          })),
        })),
      );
      setExpenses(
        (e.data ?? []).map((row) => ({
          id: row.id,
          category: row.category,
          amount: Number(row.amount),
          note: row.note,
          paid_with: row.paid_with,
          spent_at: row.spent_at,
          request_id: row.request_id ?? null,
          shift_id: row.shift_id ?? null,
          voided_at: row.voided_at ?? null,
          void_reason: row.void_reason ?? null,
          replaced_by: row.replaced_by ?? null,
          replaces_expense_id: row.replaces_expense_id ?? null,
        })),
      );
      setLedger(
        (l.data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as LedgerEntry[],
      );
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const postEntries = useCallback<AccountingContextValue["postEntries"]>(
    async (lines, ref) => {
      if (!storeId || lines.length === 0) return;
      const rows = lines
        .filter((line) => Math.abs(line.amount) > 0.0000001)
        .map((line) => ({
          store_id: storeId,
          account: line.account,
          direction: line.direction,
          amount: Number(line.amount.toFixed(4)),
          reference_type: ref.type,
          reference_id: ref.id ?? null,
          memo: line.memo ?? ref.memo ?? null,
        }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("ledger_entries").insert(rows);
      if (error) throw error;
    },
    [storeId],
  );

  const postSale = useCallback<AccountingContextValue["postSale"]>(
    async ({ saleId, subtotal, tax, cogs, paymentMethod, customerId, splits, skipCredit }) => {
      if (!storeId) return;
      const total = subtotal + tax;
      const breakdown =
        splits && splits.length > 0 ? splits : [{ method: paymentMethod, amount: total }];
      const creditAmount = breakdown
        .filter((split) => split.method === CREDIT_METHOD)
        .reduce((sum, split) => sum + Number(split.amount || 0), 0);
      const assetLines: LedgerLine[] = breakdown.map((split) => ({
        account: accountForMethod(split.method),
        direction: "DEBIT" as const,
        amount: Number(split.amount || 0),
        memo: split.method,
      }));
      await postEntries(
        [
          ...assetLines,
          { account: ACCOUNTS.SALES_REVENUE, direction: "CREDIT", amount: subtotal },
          { account: ACCOUNTS.TAX_PAYABLE, direction: "CREDIT", amount: tax },
          { account: ACCOUNTS.COGS, direction: "DEBIT", amount: cogs },
          { account: ACCOUNTS.INVENTORY, direction: "CREDIT", amount: cogs },
        ],
        { type: "SALE", id: saleId ?? null, memo: paymentMethod },
      );
      if (creditAmount > 0 && customerId && !skipCredit) {
        const current = customers.find((c) => c.id === customerId);
        await supabase
          .from("customers")
          .update({ balance: Number(((current?.balance ?? 0) + creditAmount).toFixed(2)) })
          .eq("id", customerId);
        await supabase.from("debt_payments").insert({
          store_id: storeId,
          party_type: "CUSTOMER",
          party_id: customerId,
          amount: -creditAmount,
          method: CREDIT_METHOD,
          note: saleId ? `အကြွေးရောင်းချမှု · ${saleId}` : "အကြွေးရောင်းချမှု",
        });
      }
      await refreshAll();
    },
    [customers, postEntries, refreshAll, storeId],
  );

  const saveCustomer = useCallback<AccountingContextValue["saveCustomer"]>(
    async ({ id, name, phone, note, email, address }) => {
      if (!storeId) throw new Error("No active store");
      const payload = {
        store_id: storeId,
        name,
        phone: phone || null,
        note: note || null,
        // Only touch CRM columns when there is something to write or they already exist.
        ...(email || address || customers.some((c) => c.id === id && "email" in c)
          ? { email: email || null, address: address || null }
          : {}),
      };
      const { error } = id
        ? await supabase.from("customers").update(payload).eq("id", id)
        : await supabase.from("customers").insert(payload);
      if (error) throw error;
      await refreshAll();
    },
    [customers, refreshAll, storeId],
  );

  const setCustomerArchived = useCallback<AccountingContextValue["setCustomerArchived"]>(
    async (id, archived) => {
      const { error } = await supabase
        .from("customers")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll],
  );

  const quickAddCustomer = useCallback<AccountingContextValue["quickAddCustomer"]>(
    async ({ name, phone }) => {
      if (!storeId) throw new Error("No active store");
      const { data, error } = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          name,
          phone: phone || null,
          customer_type: "QUICK",
        })
        .select("*")
        .single();
      if (error || !data) throw error ?? new Error("Customer failed");
      await refreshAll();
      return { ...data, balance: Number(data.balance) } as Customer;
    },
    [refreshAll, storeId],
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll],
  );

  const saveSupplier = useCallback<AccountingContextValue["saveSupplier"]>(
    async ({ id, name, phone, note }) => {
      if (!storeId) throw new Error("No active store");
      const payload = { store_id: storeId, name, phone: phone || null, note: note || null };
      const { error } = id
        ? await supabase.from("suppliers").update(payload).eq("id", id)
        : await supabase.from("suppliers").insert(payload);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll, storeId],
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll],
  );

  const createPurchase = useCallback<AccountingContextValue["createPurchase"]>(
    async ({ status, supplierId, lines, amountPaid, paymentMethod, notes }) => {
      if (!storeId) throw new Error("No active store");
      const total = lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0);
      const { data, error } = await supabase
        .from("purchases")
        .insert({
          store_id: storeId,
          supplier_id: supplierId,
          status: status ?? PURCHASE_ORDERED,
          total_amount: total,
          amount_paid: amountPaid,
          payment_method: amountPaid > 0 ? paymentMethod : null,
          notes: notes || null,
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Purchase failed");
      const { error: lineError } = await supabase.from("purchase_items").insert(
        lines.map((line) => ({
          purchase_id: data.id,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          unit_name: line.unit_name || null,
          conversion: line.conversion || 1,
          received_quantity: 0,
        })),
      );
      if (lineError) throw lineError;
      await refreshAll();
    },
    [refreshAll, storeId],
  );

  // Draft edit/confirm run as database functions (see migration 20261124040000): the header and
  // lines are replaced in one transaction, so a failure leaves the original draft untouched.
  const updateDraftPurchase = useCallback<AccountingContextValue["updateDraftPurchase"]>(
    async ({ purchaseId, supplierId, lines, amountPaid, paymentMethod, notes, confirm }) => {
      if (!storeId) throw new Error("No active store");
      if (confirm && lines.length === 0) throw new Error("Add at least one line before confirming");
      const { error } = await supabase.rpc("update_draft_purchase", {
        p_purchase_id: purchaseId,
        p_supplier_id: supplierId,
        p_amount_paid: amountPaid,
        p_payment_method: amountPaid > 0 ? paymentMethod : null,
        p_notes: notes,
        p_confirm: Boolean(confirm),
        p_lines: lines.map((line) => ({
          item_id: line.item_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          unit_name: line.unit_name || null,
          conversion: line.conversion || 1,
        })),
      });
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll, storeId],
  );

  const confirmPurchase = useCallback<AccountingContextValue["confirmPurchase"]>(
    async (purchaseId) => {
      if (!storeId) throw new Error("No active store");
      const { error } = await supabase.rpc("confirm_purchase", { p_purchase_id: purchaseId });
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll, storeId],
  );

  // Receiving runs as ONE database function (migration 20261126040000): stock, last cost,
  // inventory movements, supplier balance, ledger and status commit together or not at all.
  const receivePurchase = useCallback<AccountingContextValue["receivePurchase"]>(
    async (purchaseId, paymentMethod) => {
      if (!storeId) throw new Error("No active store");
      const { data, error } = await supabase.rpc("receive_purchase", {
        p_purchase_id: purchaseId,
        ...(paymentMethod ? { p_payment_method: paymentMethod } : {}),
      });
      if (error) throw new Error(receivePurchaseErrorMessage(error));
      await refreshAll();
      const result = (data ?? {}) as { already_received?: boolean };
      return { alreadyReceived: result.already_received === true };
    },
    [refreshAll, storeId],
  );

  const deletePurchase = useCallback(
    async (purchaseId: string) => {
      // The status filter is enforced by the database query, not only the button: a received or
      // ordered purchase is never deleted from here (no stock/ledger reversal exists yet).
      const { data, error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", purchaseId)
        .in("status", [PURCHASE_DRAFT, PURCHASE_CANCELLED])
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Only draft or cancelled purchases can be deleted");
      await refreshAll();
    },
    [refreshAll],
  );

  const saveExpense = useCallback<AccountingContextValue["saveExpense"]>(
    async ({ category, amount, note, paidWith, spentAt, fromDrawer, requestId }) => {
      if (!storeId) throw new Error("No active store");
      // Expense row, ledger entries and (for a drawer expense) the shift's cash movement commit
      // together, once per request id.
      const { error: rpcError } = await supabase.rpc("record_expense", {
        p_store_id: storeId,
        p_request_id: requestId ?? crypto.randomUUID(),
        p_category: category,
        p_amount: amount,
        p_note: note,
        p_paid_with: paidWith,
        p_spent_at: spentAt,
        p_shift_id: fromDrawer && activeShift ? activeShift.id : null,
      });
      if (rpcError) throw new Error(shiftErrorMessage(rpcError));
      await refreshAll();
    },
    [activeShift, refreshAll, storeId],
  );

  const voidExpense = useCallback<AccountingContextValue["voidExpense"]>(
    async ({ expenseId, reason, requestId }) => {
      const { error } = await supabase.rpc("void_expense", {
        p_expense_id: expenseId,
        p_reason: reason,
        p_request_id: requestId ?? crypto.randomUUID(),
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
      await refreshAll();
    },
    [refreshAll, staffName],
  );

  const correctExpense = useCallback<AccountingContextValue["correctExpense"]>(
    async (input) => {
      const { error } = await supabase.rpc("replace_expense", {
        p_expense_id: input.expenseId,
        p_void_request_id: input.voidRequestId ?? crypto.randomUUID(),
        p_new_request_id: input.requestId ?? crypto.randomUUID(),
        p_reason: input.reason,
        p_category: input.category,
        p_amount: input.amount,
        p_note: input.note,
        p_paid_with: input.paidWith,
        p_spent_at: input.spentAt,
        p_shift_id: input.fromDrawer && activeShift ? activeShift.id : null,
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
      await refreshAll();
    },
    [activeShift, refreshAll, staffName],
  );

  const settleCustomerDebt = useCallback<AccountingContextValue["settleCustomerDebt"]>(
    async ({ customerId, amount, method, requestId }) => {
      if (!storeId) return;
      // One database transaction: debt record, customer balance (under a row lock), ledger entries
      // (Dr payment account / Cr receivable) and, for cash, the open shift's drawer. A repeated
      // request id is recognised and posts nothing; paying more than is owed is refused.
      const { error } = await supabase.rpc("receive_customer_payment", {
        p_store_id: storeId,
        p_customer_id: customerId,
        p_amount: amount,
        p_method: method,
        p_request_id: requestId ?? crypto.randomUUID(),
        p_staff_name: staffName,
      });
      if (error) throw new Error(shiftErrorMessage(error));
      await refreshAll();
    },
    [refreshAll, staffName, storeId],
  );

  const paySupplierDebt = useCallback<AccountingContextValue["paySupplierDebt"]>(
    async ({ supplierId, amount, method }) => {
      if (!storeId) return;
      const supplier = suppliers.find((s) => s.id === supplierId);
      await supabase.from("debt_payments").insert({
        store_id: storeId,
        party_type: "SUPPLIER",
        party_id: supplierId,
        amount,
        method,
      });
      await postEntries(
        [
          { account: ACCOUNTS.PAYABLE, direction: "DEBIT", amount },
          { account: accountForMethod(method), direction: "CREDIT", amount },
        ],
        { type: "SUPPLIER_PAYMENT", id: supplierId, memo: supplier?.name ?? "" },
      );
      await supabase
        .from("suppliers")
        .update({ balance: Number(Math.max((supplier?.balance ?? 0) - amount, 0).toFixed(2)) })
        .eq("id", supplierId);
      await refreshAll();
    },
    [postEntries, refreshAll, storeId, suppliers],
  );

  const balances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of ledger) {
      const signed = entry.direction === "DEBIT" ? entry.amount : -entry.amount;
      map[entry.account] = (map[entry.account] ?? 0) + signed;
    }
    return map;
  }, [ledger]);

  const liquidCapital = LIQUID_ACCOUNTS.reduce((sum, key) => sum + (balances[key] ?? 0), 0);
  const receivable = balances[ACCOUNTS.RECEIVABLE] ?? 0;
  const payable = -(balances[ACCOUNTS.PAYABLE] ?? 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.voided_at ? sum : sum + e.amount), 0);

  const value = useMemo<AccountingContextValue>(
    () => ({
      enabled,
      loading,
      customers,
      suppliers,
      purchases,
      expenses,
      ledger,
      balances,
      liquidCapital,
      receivable,
      payable,
      totalExpenses,
      refreshAll,
      postEntries,
      postSale,
      saveCustomer,
      deleteCustomer,
      setCustomerArchived,
      quickAddCustomer,
      saveSupplier,
      deleteSupplier,
      createPurchase,
      updateDraftPurchase,
      confirmPurchase,
      receivePurchase,
      deletePurchase,
      saveExpense,
      voidExpense,
      correctExpense,
      settleCustomerDebt,
      paySupplierDebt,
    }),
    [
      enabled,
      loading,
      customers,
      suppliers,
      purchases,
      expenses,
      ledger,
      balances,
      liquidCapital,
      receivable,
      payable,
      totalExpenses,
      refreshAll,
      postEntries,
      postSale,
      saveCustomer,
      deleteCustomer,
      setCustomerArchived,
      quickAddCustomer,
      saveSupplier,
      deleteSupplier,
      createPurchase,
      updateDraftPurchase,
      confirmPurchase,
      receivePurchase,
      deletePurchase,
      saveExpense,
      voidExpense,
      correctExpense,
      settleCustomerDebt,
      paySupplierDebt,
    ],
  );

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccountingStore() {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error("useAccountingStore must be used inside AccountingProvider");
  return ctx;
}
