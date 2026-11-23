import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

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
}

export interface Purchase {
  id: string;
  supplier_id: string | null;
  status: string;
  total_amount: number;
  amount_paid: number;
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

export const PURCHASE_RECEIVED = "ရရှိပြီး";
export const PURCHASE_PENDING = "စောင့်ဆိုင်းဆဲ";

interface PurchaseRow {
  id: string;
  supplier_id: string | null;
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  notes: string | null;
  created_at: string;
  purchase_items:
    | {
        item_id: string;
        quantity: number;
        unit_cost: number | string;
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
  }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  quickAddCustomer: (input: { name: string; phone: string }) => Promise<Customer>;
  saveSupplier: (input: {
    id?: string;
    name: string;
    phone: string;
    note: string;
  }) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  createPurchase: (input: {
    supplierId: string | null;
    lines: PurchaseLine[];
    amountPaid: number;
    notes: string;
  }) => Promise<void>;
  receivePurchase: (purchaseId: string) => Promise<void>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  saveExpense: (input: {
    id?: string;
    category: string;
    amount: number;
    note: string;
    paidWith: string;
    spentAt: string;
  }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  settleCustomerDebt: (input: {
    customerId: string;
    amount: number;
    method: string;
  }) => Promise<void>;
  paySupplierDebt: (input: {
    supplierId: string;
    amount: number;
    method: string;
  }) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextValue | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const { store } = useAuth();
  const storeId = store?.id ?? null;
  const enabled = Boolean(store?.advanced_accounting_mode);

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
        supabase.from("customers").select("id,name,phone,note,balance,customer_type").eq("store_id", storeId).order("name"),
        supabase.from("suppliers").select("id,name,phone,note,balance").eq("store_id", storeId).order("name"),
        supabase
          .from("purchases")
          .select(
            "id,supplier_id,status,total_amount,amount_paid,notes,created_at,purchase_items(item_id,quantity,unit_cost,items(name))",
          )
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("id,category,amount,note,paid_with,spent_at")
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
          notes: row.notes ?? null,
          created_at: row.created_at,
          lines: (row.purchase_items ?? []).map((line) => ({
            item_id: line.item_id,
            quantity: Number(line.quantity),
            unit_cost: Number(line.unit_cost),
            name: line.items?.name ?? "",
          })),
        })),
      );
      setExpenses(
        (e.data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Expense[],
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
    async ({ id, name, phone, note }) => {
      if (!storeId) throw new Error("No active store");
      const payload = { store_id: storeId, name, phone: phone || null, note: note || null };
      const { error } = id
        ? await supabase.from("customers").update(payload).eq("id", id)
        : await supabase.from("customers").insert(payload);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll, storeId],
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
        .select("id,name,phone,note,balance,customer_type")
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
    async ({ supplierId, lines, amountPaid, notes }) => {
      if (!storeId) throw new Error("No active store");
      const total = lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0);
      const { data, error } = await supabase
        .from("purchases")
        .insert({
          store_id: storeId,
          supplier_id: supplierId,
          status: PURCHASE_PENDING,
          total_amount: total,
          amount_paid: amountPaid,
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
        })),
      );
      if (lineError) throw lineError;
      await refreshAll();
    },
    [refreshAll, storeId],
  );

  const receivePurchase = useCallback(
    async (purchaseId: string) => {
      if (!storeId) return;
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase || purchase.status === PURCHASE_RECEIVED) return;
      const unpaid = Math.max(purchase.total_amount - purchase.amount_paid, 0);

      // Increment stock for each received line.
      for (const line of purchase.lines) {
        const { data } = await supabase
          .from("items")
          .select("stock_quantity")
          .eq("id", line.item_id)
          .maybeSingle();
        await supabase
          .from("items")
          .update({
            stock_quantity: (data?.stock_quantity ?? 0) + line.quantity,
            cost_price: line.unit_cost,
          })
          .eq("id", line.item_id);
      }

      await postEntries(
        [
          { account: ACCOUNTS.INVENTORY, direction: "DEBIT", amount: purchase.total_amount },
          { account: ACCOUNTS.PAYABLE, direction: "CREDIT", amount: unpaid },
          { account: ACCOUNTS.CASH, direction: "CREDIT", amount: purchase.amount_paid },
        ],
        { type: "PURCHASE", id: purchaseId, memo: "ဝယ်ယူမှု လက်ခံရရှိ" },
      );

      if (unpaid > 0 && purchase.supplier_id) {
        const supplier = suppliers.find((s) => s.id === purchase.supplier_id);
        await supabase
          .from("suppliers")
          .update({ balance: Number(((supplier?.balance ?? 0) + unpaid).toFixed(2)) })
          .eq("id", purchase.supplier_id);
      }

      await supabase
        .from("purchases")
        .update({ status: PURCHASE_RECEIVED, received_at: new Date().toISOString() })
        .eq("id", purchaseId);
      await refreshAll();
    },
    [postEntries, purchases, refreshAll, storeId, suppliers],
  );

  const deletePurchase = useCallback(
    async (purchaseId: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", purchaseId);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll],
  );

  const saveExpense = useCallback<AccountingContextValue["saveExpense"]>(
    async ({ id, category, amount, note, paidWith, spentAt }) => {
      if (!storeId) throw new Error("No active store");
      const payload = {
        store_id: storeId,
        category,
        amount,
        note: note || null,
        paid_with: paidWith,
        spent_at: spentAt,
      };
      if (id) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("expenses").insert(payload).select("id").single();
        if (error || !data) throw error ?? new Error("Expense failed");
        await postEntries(
          [
            { account: ACCOUNTS.EXPENSE, direction: "DEBIT", amount },
            { account: accountForMethod(paidWith), direction: "CREDIT", amount },
          ],
          { type: "EXPENSE", id: data.id, memo: category },
        );
      }
      await refreshAll();
    },
    [postEntries, refreshAll, storeId],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      await refreshAll();
    },
    [refreshAll],
  );

  const settleCustomerDebt = useCallback<AccountingContextValue["settleCustomerDebt"]>(
    async ({ customerId, amount, method }) => {
      if (!storeId) return;
      const customer = customers.find((c) => c.id === customerId);
      await supabase.from("debt_payments").insert({
        store_id: storeId,
        party_type: "CUSTOMER",
        party_id: customerId,
        amount,
        method,
      });
      await postEntries(
        [
          { account: accountForMethod(method), direction: "DEBIT", amount },
          { account: ACCOUNTS.RECEIVABLE, direction: "CREDIT", amount },
        ],
        { type: "CUSTOMER_PAYMENT", id: customerId, memo: customer?.name ?? "" },
      );
      await supabase
        .from("customers")
        .update({ balance: Number(Math.max((customer?.balance ?? 0) - amount, 0).toFixed(2)) })
        .eq("id", customerId);
      await refreshAll();
    },
    [customers, postEntries, refreshAll, storeId],
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
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
      quickAddCustomer,
      saveSupplier,
      deleteSupplier,
      createPurchase,
      receivePurchase,
      deletePurchase,
      saveExpense,
      deleteExpense,
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
      quickAddCustomer,
      saveSupplier,
      deleteSupplier,
      createPurchase,
      receivePurchase,
      deletePurchase,
      saveExpense,
      deleteExpense,
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
