import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { posDb, type CachedItem, type ItemUnit, type PendingSale, type PendingSaleLine } from "@/lib/pos-db";
import { DEMO_CATALOG } from "@/lib/demo-catalog";
import { CREDIT_METHOD } from "@/lib/accounting-store";

export type SyncState = "online" | "offline" | "syncing";

export const DEFAULT_CATEGORY = "အထွေထွေ";

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface OpenTabLine {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit_name?: string | undefined;
  conversion?: number | undefined;
}

export interface OpenTab {
  id: string;
  table_number: number;
  total_amount: number;
  notes: string | null;
  lines: OpenTabLine[];
}

export interface HeldOrder {
  id: string;
  note: string | null;
  total_amount: number;
  created_at: string;
  lines: OpenTabLine[];
}

export interface OrderSummary {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  payment_breakdown: PaymentSplit[];
  status: string;
  customer_id: string | null;
  refund_reason: string | null;
  lines: OpenTabLine[];
}

interface PosContextValue {
  items: CachedItem[];
  categories: string[];
  loading: boolean;
  isOnline: boolean;
  syncState: SyncState;
  /** Unsynced sales for the active store (queued, syncing or failed). */
  pendingCount: number;
  /** Subset of pendingCount whose last sync attempt failed and will be retried. */
  failedSyncCount: number;
  /** Legacy queued sales with no reliable store: held for review, never posted automatically. */
  reviewCount: number;
  /** Unsynced sales that belong to a different store than the active one. */
  otherStorePendingCount: number;
  lowStockCount: number;
  lowStockItems: CachedItem[];
  openTabs: OpenTab[];
  heldOrders: HeldOrder[];
  recentOrders: OrderSummary[];
  refreshHeldOrders: () => Promise<void>;
  refreshRecentOrders: () => Promise<void>;
  holdOrder: (input: { lines: PendingSaleLine[]; total: number; note: string }) => Promise<void>;
  deleteHeldOrder: (id: string) => Promise<void>;
  refundOrder: (input: { orderId: string; reason: string; note: string }) => Promise<void>;
  refreshTabs: () => Promise<void>;
  holdTab: (input: {
    saleId?: string | undefined;
    tableNumber: number;
    lines: PendingSaleLine[];
    total: number;
    notes: string;
  }) => Promise<string>;
  closeTab: (input: {
    saleId: string;
    total: number;
    paymentMethod: string;
  }) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  syncNow: () => Promise<void>;
  recordSale: (input: {
    lines: PendingSaleLine[];
    total: number;
    paymentMethod: string;
    paymentBreakdown?: PaymentSplit[];
    customerId?: string | null;
    status?: string;
    paymentStatus?: string;
    customerName?: string | null;
    cashReceived?: number | null;
    change?: number | null;
    /** Idempotency key: reuse the same value when retrying the same checkout. */
    clientTransactionId?: string;
  }) => Promise<{
    offline: boolean;
    saleId: string | null;
    reference: string;
    /** True when post_sale already applied the credit balance (skip the client credit posting). */
    creditPosted: boolean;
  }>;
  saveItem: (input: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    min_stock_threshold: number;
    category?: string;
    barcode?: string | null;
    qr_value?: string | null;
    image_url?: string | null;
    units?: { unit_name: string; conversion: number; price: number; is_default?: boolean }[] | undefined;
  }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  seedDemoItems: () => Promise<number>;
}

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Starting register...
      </div>
    );
  }
  return <PosProviderInner>{children}</PosProviderInner>;
}

interface SaleItemRow {
  item_id: string;
  quantity: number;
  unit_price: number | string;
  items: { name: string; sku: string } | null;
}

function mapLines(rows: SaleItemRow[] | null): OpenTabLine[] {
  const merged = new Map<string, OpenTabLine>();
  for (const line of rows ?? []) {
    const existing = merged.get(line.item_id);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      merged.set(line.item_id, {
        item_id: line.item_id,
        name: line.items?.name ?? "Item",
        sku: line.items?.sku ?? "",
        quantity: line.quantity,
        unit_price: Number(line.unit_price),
      });
    }
  }
  return [...merged.values()];
}

export type SaleFailureKind = "network" | "permission" | "validation" | "unknown";

/** A checkout failure with a cashier-safe message. Technical detail goes to the console only. */
export class SaleError extends Error {
  kind: SaleFailureKind;
  constructor(kind: SaleFailureKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Only a real "could not reach the server" failure may be queued offline. */
export function classifySaleError(err: unknown): SaleFailureKind {
  const e = err as { code?: string; message?: string; status?: number } | null;
  const code = e?.code ?? "";
  const message = e?.message ?? String(err ?? "");
  if (
    !code &&
    (err instanceof TypeError ||
      /failed to fetch|networkerror|network request failed|load failed|timed? ?out|aborted/i.test(
        message,
      ))
  ) {
    return "network";
  }
  if (code === "42501" || e?.status === 401 || e?.status === 403 || /row-level security|permission denied/i.test(message)) {
    return "permission";
  }
  if (/^(22|23|P0001|PGRST)/.test(code)) return "validation";
  return "unknown";
}

const SALE_ERROR_TEXT: Record<SaleFailureKind, string> = {
  network: "ဆာဗာသို့ ချိတ်ဆက်၍ မရပါ",
  permission: "ဤအရောင်းကို သိမ်းရန် ခွင့်ပြုချက် မရှိပါ",
  validation: "အရောင်းဒေတာ မမှန်ကန်ပါ (လက်ကျန် သို့မဟုတ် ဆိုင်စာရင်း ပြောင်းလဲနေနိုင်သည်)",
  unknown: "ဆာဗာ အမှားတစ်ခု ဖြစ်ပွားသည်။ ထပ်မံကြိုးစားပါ",
};

/** Maps post_sale's error codes (RAISE EXCEPTION text) to cashier-friendly Burmese messages. */
const POST_SALE_ERRORS: [string, string][] = [
  ["INSUFFICIENT_STOCK", "လက်ကျန် မလုံလောက်ပါ — ပစ္စည်းစာရင်း ပြန်စစ်ပါ"],
  ["ITEM_NOT_IN_STORE", "ပစ္စည်းတစ်ခုသည် ဤဆိုင်နှင့် မသက်ဆိုင်ပါ"],
  ["INVALID_UNIT", "ရောင်းချသည့် ယူနစ် မမှန်ကန်ပါ (ယူနစ်များ ပြောင်းလဲနေနိုင်သည်)"],
  ["TOTAL_MISMATCH", "စုစုပေါင်း ပမာဏ မကိုက်ညီပါ (ဈေးနှုန်း/အခွန် ပြောင်းလဲနေနိုင်သည်)"],
  ["PAYMENT_MISMATCH", "ငွေပေးချေမှု စုစုပေါင်း မကိုက်ညီပါ"],
  ["NEGATIVE_PAYMENT", "ငွေပေးချေမှု ပမာဏ အနုတ် မဖြစ်ရပါ"],
  ["PAYMENT_REQUIRED", "ငွေပေးချေမှု ပမာဏ ထည့်ပါ"],
  ["CUSTOMER_REQUIRED", "အကြွေးရောင်းရန် ဖောက်သည် ရွေးပါ"],
  ["CUSTOMER_NOT_IN_STORE", "ဖောက်သည်သည် ဤဆိုင်နှင့် မသက်ဆိုင်ပါ"],
  ["EMPTY_SALE", "ဈေးဝယ်ခြင်းတောင်း ဗလာ ဖြစ်နေသည်"],
  ["INVALID_QUANTITY", "အရေအတွက် မမှန်ကန်ပါ"],
  ["INVALID_PRICE", "ဈေးနှုန်း မမှန်ကန်ပါ"],
  ["ACCESS_DENIED", "ဤဆိုင်တွင် အရောင်းသိမ်းရန် ခွင့်ပြုချက် မရှိပါ"],
  ["NOT_AUTHENTICATED", "ဝင်ရောက်မှု သက်တမ်းကုန်သွားပါပြီ၊ ပြန်လည် ဝင်ပါ"],
  ["SALE_ID_CONFLICT", "အရောင်း အမှတ်စဉ် ထပ်နေသည်၊ ထပ်မံကြိုးစားပါ"],
];

/** Turns a server rejection into a SaleError with the most specific safe message available. */
export function saleErrorFromServer(err: unknown): SaleError {
  const kind = classifySaleError(err);
  const raw = (err as { message?: string } | null)?.message ?? "";
  const hit = POST_SALE_ERRORS.find(([code]) => raw.includes(code));
  return new SaleError(kind, hit ? hit[1] : SALE_ERROR_TEXT[kind]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface ServerSaleInput {
  id: string;
  storeId: string;
  userId: string | null;
  lines: PendingSaleLine[];
  total: number;
  paymentMethod: string;
  paymentBreakdown: PaymentSplit[];
  customerId: string | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
  isOfflineSync: boolean;
}

/**
 * Saves one sale idempotently. The client-generated key IS the sale id, so a retry (double click,
 * timeout after commit, offline sync) hits the primary key instead of creating a second sale.
 * Each step is checked before it runs, so a half-saved sale is resumed, never duplicated.
 * A non-network failure after the header exists rolls the header back (best effort).
 */
async function postSaleToServer(input: ServerSaleInput): Promise<{ creditPosted: boolean }> {
  // Preferred path: one atomic, idempotent database transaction (sale, lines, stock movements,
  // cost snapshot and credit balance). Falls back to the step-by-step path below only when the
  // function has not been installed in this database yet.
  const { error: rpcError } = await supabase.rpc("post_sale", {
    p_sale_id: input.id,
    p_store_id: input.storeId,
    p_lines: input.lines.map((line) => ({
      item_id: line.item_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      unit_name: line.unit_name ?? null,
      conversion: line.conversion ?? 1,
    })) as unknown as never,
    p_total: round2(input.total),
    p_payment_method: input.paymentMethod,
    p_payment_breakdown: input.paymentBreakdown.map((part) => ({
      method: part.method,
      amount: round2(part.amount),
    })) as unknown as never,
    ...(input.customerId ? { p_customer_id: input.customerId } : {}),
    p_status: input.status,
    p_payment_status: input.paymentStatus,
    p_created_at: input.createdAt,
    p_is_offline_sync: input.isOfflineSync,
  });
  if (!rpcError) return { creditPosted: true };
  const missing =
    rpcError.code === "PGRST202" ||
    rpcError.code === "42883" ||
    /could not find the function/i.test(rpcError.message ?? "");
  if (!missing) throw rpcError;
  console.warn("[post_sale] function not installed, using step-by-step fallback");

  const baseQty = (line: PendingSaleLine) => line.quantity * (line.conversion ?? 1);
  const { error: headerError } = await supabase.from("sales").insert({
    id: input.id,
    total_amount: input.total,
    payment_method: input.paymentMethod,
    payment_breakdown: input.paymentBreakdown as unknown as never,
    is_offline_sync: input.isOfflineSync,
    created_at: input.createdAt,
    store_id: input.storeId,
    customer_id: input.customerId,
    status: input.status,
    payment_status: input.paymentStatus,
  });
  // 23505 = this key was already saved by an earlier attempt: carry on from where it stopped.
  const createdNow = !headerError;
  if (headerError && headerError.code !== "23505") throw headerError;

  try {
    const { count: lineCount, error: lineCountError } = await supabase
      .from("sale_items")
      .select("id", { count: "exact", head: true })
      .eq("sale_id", input.id);
    if (lineCountError) throw lineCountError;
    if (!lineCount) {
      const { error } = await supabase.from("sale_items").insert(
        input.lines.map((line) => ({
          sale_id: input.id,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          unit_name: line.unit_name ?? null,
          conversion: line.conversion ?? 1,
        })),
      );
      if (error) throw error;
    }

    const { count: movementCount, error: movementCountError } = await supabase
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("reference_id", input.id)
      .eq("movement_type", "SALE");
    if (movementCountError) throw movementCountError;
    if (!movementCount) {
      const { error } = await supabase.from("inventory_movements").insert(
        input.lines.map((line) => ({
          store_id: input.storeId,
          item_id: line.item_id,
          movement_type: "SALE",
          quantity: -baseQty(line),
          reference_id: input.id,
          created_by: input.userId,
        })),
      );
      if (error) throw error;
    }
  } catch (err) {
    if (createdNow && classifySaleError(err) !== "network") {
      // The sale was rejected, not lost: remove the partial header so no half-posted sale remains.
      try {
        await supabase.from("sale_items").delete().eq("sale_id", input.id);
        await supabase.from("sales").delete().eq("id", input.id);
      } catch {
        /* best effort */
      }
    }
    throw err;
  }
  return { creditPosted: false };
}

function PosProviderInner({ children }: { children: ReactNode }) {
  const { store, session } = useAuth();
  const storeId = store?.id ?? null;
  const userId = session?.user.id ?? null;
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);

  const items = useLiveQuery(() => posDb.cached_items.orderBy("name").toArray(), [], []);
  const pending = useLiveQuery(() => posDb.pending_sales.toArray(), [], []);
  const activePending = (pending ?? []).filter(
    (sale) => sale.sync_state !== "needs_review" && sale.store_id === storeId,
  );
  const pendingCount = activePending.length;
  const failedSyncCount = activePending.filter((sale) => sale.sync_state === "failed").length;
  const reviewCount = (pending ?? []).filter((sale) => sale.sync_state === "needs_review").length;
  const otherStorePendingCount = (pending ?? []).filter(
    (sale) => sale.sync_state !== "needs_review" && sale.store_id && sale.store_id !== storeId,
  ).length;

  const refreshCatalog = useCallback(async () => {
    if (!storeId) {
      await posDb.cached_items.clear();
      return;
    }
    const { data: itemsData, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    if (itemsError || !itemsData) return;

    const { data: unitsData } = await supabase
      .from("item_units")
      .select("*")
      .in(
        "item_id",
        itemsData.map((i) => i.id),
      );
    const unitsByItem = new Map<string, ItemUnit[]>();
    for (const u of unitsData ?? []) {
      const list = unitsByItem.get(u.item_id) ?? [];
      list.push({
        id: u.id,
        item_id: u.item_id,
        unit_name: u.unit_name,
        conversion: u.conversion,
        price: Number(u.price),
        is_default: u.is_default,
      });
      unitsByItem.set(u.item_id, list);
    }

    const rows: CachedItem[] = itemsData.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      price: Number(row.price),
      cost_price: Number(row.cost_price ?? 0),
      stock_quantity: row.stock_quantity,
      min_stock_threshold: row.min_stock_threshold,
      category: (row as { category?: string | null }).category || DEFAULT_CATEGORY,
      image_url: (row as { image_url?: string | null }).image_url ?? null,
      barcode: (row as { barcode?: string | null }).barcode ?? null,
      qr_value: (row as { qr_value?: string | null }).qr_value ?? null,
      created_at: row.created_at,
      units: unitsByItem.get(row.id) ?? [],
    }));
    await posDb.transaction("rw", posDb.cached_items, async () => {
      await posDb.cached_items.clear();
      await posDb.cached_items.bulkPut(rows);
    });
  }, [storeId]);

  const logMovements = useCallback(
    async (
      lines: { item_id: string; quantity: number }[],
      movementType: string,
      referenceId: string | null,
    ) => {
      if (!storeId || lines.length === 0) return;
      await supabase.from("inventory_movements").insert(
        lines.map((line) => ({
          store_id: storeId,
          item_id: line.item_id,
          movement_type: movementType,
          quantity: movementType === "RETURN" ? line.quantity : -line.quantity,
          reference_id: referenceId,
          created_by: userId,
        })),
      );
    },
    [storeId, userId],
  );

  const pushPendingSales = useCallback(async () => {
    if (!storeId) return;
    // Only this store's own queued sales, and never the quarantined legacy rows.
    const queued = (await posDb.pending_sales.toArray()).filter(
      (sale) =>
        // A row left "syncing" by a closed tab is retried too: the key makes that safe.
        sale.store_id === storeId && sale.sync_state !== "needs_review",
    );
    for (const sale of queued) {
      if (sale.localId == null || !sale.client_transaction_id) continue;
      await posDb.pending_sales.update(sale.localId, {
        sync_state: "syncing",
        attempts: (sale.attempts ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
      });
      try {
        await postSaleToServer({
          id: sale.client_transaction_id,
          storeId: sale.store_id!,
          userId: sale.user_id ?? userId,
          lines: sale.lines,
          total: sale.total_amount,
          paymentMethod: sale.payment_method,
          paymentBreakdown: sale.payment_breakdown ?? [
            { method: sale.payment_method, amount: sale.total_amount },
          ],
          customerId: sale.customer_id ?? null,
          status: sale.status ?? "COMPLETED",
          paymentStatus: sale.payment_status ?? "PAID",
          createdAt: sale.created_at,
          isOfflineSync: true,
        });
        await posDb.pending_sales.delete(sale.localId);
      } catch (err) {
        const kind = classifySaleError(err);
        console.error("[sync] pending sale failed", kind, (err as { message?: string })?.message);
        if (kind === "network") {
          // Outcome unknown: keep it queued with the same key; the next sync resumes safely.
          await posDb.pending_sales.update(sale.localId, { sync_state: "queued" });
          throw err;
        }
        await posDb.pending_sales.update(sale.localId, {
          sync_state: "failed",
          last_error: saleErrorFromServer(err).message,
        });
      }
    }
  }, [storeId, userId]);

  const syncNow = useCallback(async () => {
    if (syncing || !storeId) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from("items").select("id").limit(1);
      if (error) throw error;
      setIsOnline(true);
      await pushPendingSales();
      await refreshCatalog();
    } catch {
      setIsOnline(false);
    } finally {
      setSyncing(false);
    }
  }, [pushPendingSales, refreshCatalog, syncing, storeId]);

  useEffect(() => {
    let cancelled = false;
    if (!storeId) {
      setLoading(false);
      return;
    }
    void (async () => {
      await syncNow();
      if (!cancelled) setLoading(false);
    })();
    const handleOnline = () => void syncNow();
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const timer = window.setInterval(() => void syncNow(), 30_000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const recordSale = useCallback<PosContextValue["recordSale"]>(
    async ({
      lines,
      total,
      paymentMethod,
      paymentBreakdown,
      customerId,
      customerName,
      status,
      paymentStatus,
      cashReceived,
      change,
      clientTransactionId,
    }) => {
      if (!storeId) throw new SaleError("validation", "ဆိုင် မရွေးရသေးပါ");
      const createdAt = new Date().toISOString();
      const txnId = clientTransactionId ?? crypto.randomUUID();
      const breakdown = paymentBreakdown ?? [{ method: paymentMethod, amount: total }];
      const baseQty = (line: PendingSaleLine) => line.quantity * (line.conversion ?? 1);
      const reference = (offline: boolean) =>
        offline ? `OFF-${txnId.slice(0, 8).toUpperCase()}` : txnId.slice(0, 8).toUpperCase();

      const applyLocalStock = async () => {
        await posDb.transaction("rw", posDb.cached_items, async () => {
          for (const line of lines) {
            const cached = await posDb.cached_items.get(line.item_id);
            if (cached) {
              await posDb.cached_items.put({
                ...cached,
                stock_quantity: Math.max(cached.stock_quantity - baseQty(line), 0),
              });
            }
          }
        });
      };

      const queueOffline = async () => {
        // Credit changes a customer's balance and the ledger, which are only posted online.
        if (breakdown.some((part) => part.method === CREDIT_METHOD && part.amount > 0)) {
          throw new SaleError(
            "network",
            "အကြွေးရောင်းချမှုကို အွန်လိုင်းတွင်သာ သိမ်းနိုင်သည်။ ချိတ်ဆက်မှု ပြန်ရမှ ထပ်ကြိုးစားပါ",
          );
        }
        const existing = await posDb.pending_sales
          .where("client_transaction_id")
          .equals(txnId)
          .first();
        if (!existing) {
          const offlineSale: PendingSale = {
            total_amount: total,
            payment_method: paymentMethod,
            created_at: createdAt,
            lines,
            client_transaction_id: txnId,
            store_id: storeId,
            user_id: userId,
            payment_breakdown: breakdown,
            customer_id: customerId ?? null,
            customer_name: customerName ?? null,
            status: status ?? "COMPLETED",
            payment_status: paymentStatus ?? "PAID",
            cash_received: cashReceived ?? null,
            change: change ?? null,
            sync_state: "queued",
            attempts: 0,
            last_error: null,
            last_attempt_at: null,
          };
          await posDb.pending_sales.add(offlineSale);
          await applyLocalStock();
        }
        return { offline: true, saleId: null, reference: reference(true), creditPosted: false };
      };

      if (!(navigator.onLine && isOnline)) return queueOffline();

      let creditPosted = false;
      try {
        ({ creditPosted } = await postSaleToServer({
          id: txnId,
          storeId,
          userId,
          lines,
          total,
          paymentMethod,
          paymentBreakdown: breakdown,
          customerId: customerId ?? null,
          status: status ?? "COMPLETED",
          paymentStatus: paymentStatus ?? "PAID",
          createdAt,
          isOfflineSync: false,
        }));
      } catch (err) {
        const kind = classifySaleError(err);
        console.error("[recordSale]", kind, (err as { message?: string })?.message);
        if (kind === "network") {
          // Unknown whether the server committed. Queue under the SAME key so sync resolves it
          // instead of creating a second sale.
          setIsOnline(false);
          return queueOffline();
        }
        throw saleErrorFromServer(err);
      }
      await refreshCatalog();
      return { offline: false, saleId: txnId, reference: reference(false), creditPosted };
    },
    [isOnline, refreshCatalog, storeId, userId],
  );

  const saveItem = useCallback<PosContextValue["saveItem"]>(
    async (input) => {
      if (!storeId) throw new Error("No active store");
      const payload = {
        store_id: storeId,
        sku: input.sku,
        name: input.name,
        price: input.price,
        cost_price: input.cost_price,
        stock_quantity: input.stock_quantity,
        min_stock_threshold: input.min_stock_threshold,
        category: input.category?.trim() || DEFAULT_CATEGORY,
        barcode: input.barcode?.trim() || null,
        qr_value: input.qr_value?.trim() || null,
        ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
      };
      let itemId = input.id;
      if (itemId) {
        const { error } = await supabase.from("items").update(payload).eq("id", itemId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("items").insert(payload).select("id").single();
        if (error) throw error;
        itemId = data.id;
      }

      if (itemId && input.units) {
        const { error: delError } = await supabase.from("item_units").delete().eq("item_id", itemId);
        if (delError) throw delError;
        const rows = input.units
          .filter((u) => u.unit_name.trim() && u.conversion > 0)
          .map((u) => ({
            item_id: itemId,
            unit_name: u.unit_name.trim(),
            conversion: Math.trunc(u.conversion),
            price: Number(u.price),
            is_default: Boolean(u.is_default),
          }));
        if (rows.length > 0) {
          const { error: insertError } = await supabase.from("item_units").insert(rows);
          if (insertError) throw insertError;
        }
      }

      await refreshCatalog();
    },
    [refreshCatalog, storeId],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  const seedDemoItems = useCallback(async () => {
    if (!storeId) throw new Error("No active store");
    const { data: existing } = await supabase
      .from("items")
      .select("sku")
      .eq("store_id", storeId)
      .in(
        "sku",
        DEMO_CATALOG.map((i) => i.sku),
      );
    const existingSkus = new Set((existing ?? []).map((r) => r.sku));
    const toInsert = DEMO_CATALOG.filter((i) => !existingSkus.has(i.sku)).map((i) => ({
      ...i,
      store_id: storeId,
    }));
    if (toInsert.length === 0) return 0;
    const { error } = await supabase.from("items").insert(toInsert);
    if (error) throw error;
    await refreshCatalog();
    return toInsert.length;
  }, [refreshCatalog, storeId]);

  const refreshTabs = useCallback(async () => {
    if (!storeId) {
      setOpenTabs([]);
      return;
    }
    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, total_amount, table_number, notes, sale_items(item_id, quantity, unit_price, items(name, sku))",
      )
      .eq("store_id", storeId)
      .eq("status", "OPEN");
    if (error || !data) return;
    const tabs: OpenTab[] = data
      .filter((row) => row.table_number != null)
      .map((row) => ({
        id: row.id,
        table_number: row.table_number as number,
        total_amount: Number(row.total_amount),
        notes: row.notes,
        lines: mapLines(row.sale_items as SaleItemRow[] | null),
      }));
    setOpenTabs(tabs);
  }, [storeId]);

  // ---------- Parked / held orders ----------
  const refreshHeldOrders = useCallback(async () => {
    if (!storeId) {
      setHeldOrders([]);
      return;
    }
    const { data, error } = await supabase
      .from("held_orders")
      .select("id, note, total_amount, created_at, cart_data")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error || !data) return;
    setHeldOrders(
      data.map((row) => ({
        id: row.id,
        note: row.note,
        total_amount: Number(row.total_amount),
        created_at: row.created_at,
        lines: (row.cart_data as unknown as OpenTabLine[]) ?? [],
      })),
    );
  }, [storeId]);

  const holdOrder = useCallback<PosContextValue["holdOrder"]>(
    async ({ lines, total, note }) => {
      if (!storeId) throw new Error("No active store");
      const { error } = await supabase.from("held_orders").insert({
        store_id: storeId,
        cart_data: lines as unknown as never,
        total_amount: total,
        note: note.trim() || null,
        created_by: userId,
      });
      if (error) throw error;
      await refreshHeldOrders();
    },
    [refreshHeldOrders, storeId, userId],
  );

  const deleteHeldOrder = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("held_orders").delete().eq("id", id);
      if (error) throw error;
      await refreshHeldOrders();
    },
    [refreshHeldOrders],
  );

  // ---------- Order history + refunds ----------
  const refreshRecentOrders = useCallback(async () => {
    if (!storeId) {
      setRecentOrders([]);
      return;
    }
    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, created_at, total_amount, payment_method, payment_breakdown, status, customer_id, refund_reason, sale_items(item_id, quantity, unit_price, items(name, sku))",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return;
    setRecentOrders(
      data.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        total_amount: Number(row.total_amount),
        payment_method: row.payment_method,
        payment_breakdown: (row.payment_breakdown as unknown as PaymentSplit[]) ?? [],
        status: row.status,
        customer_id: row.customer_id,
        refund_reason: (row as { refund_reason?: string | null }).refund_reason ?? null,
        lines: mapLines(row.sale_items as SaleItemRow[] | null),
      })),
    );
  }, [storeId]);

    const refundOrder = useCallback<PosContextValue["refundOrder"]>(
    async ({ orderId, reason, note }) => {
      if (!storeId) throw new Error("No active store");
      const order = recentOrders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");

      // Only allow refunds for sales created TODAY
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const isToday =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate();

      if (!isToday) {
        throw new Error("ယနေ့ဘောင်ချာသာ ပြန်အမ်းခွင့်ရှိပါသည် (Only today's sales can be refunded)");
      }

      const { error } = await supabase
        .from("sales")
        .update({
          status: "REFUNDED",
          payment_status: "REFUNDED",
          refund_reason: reason,
          refund_note: note.trim() || null,
          refunded_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      // Put the stock back item by item...

      for (const line of order.lines) {
        const { data: current } = await supabase
          .from("items")
          .select("stock_quantity")
          .eq("id", line.item_id)
          .maybeSingle();
        if (current) {
          await supabase
            .from("items")
            .update({ stock_quantity: current.stock_quantity + line.quantity * (line.conversion ?? 1) })
            .eq("id", line.item_id);
        }
      }
      await logMovements(
        order.lines.map((line) => ({
          item_id: line.item_id,
          quantity: line.quantity * (line.conversion ?? 1),
        })),
        "RETURN",
        orderId,
      );

      // Credit portion of the order (if any) is written back off the customer's debt.
      const creditAmount =
        order.payment_breakdown.length > 0
          ? order.payment_breakdown
              .filter((split) => split.method === CREDIT_METHOD)
              .reduce((sum, split) => sum + Number(split.amount || 0), 0)
          : order.payment_method === CREDIT_METHOD
            ? order.total_amount
            : 0;

      if (creditAmount > 0 && order.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("balance")
          .eq("id", order.customer_id)
          .maybeSingle();
        const nextBalance = Math.max(Number(customer?.balance ?? 0) - creditAmount, 0);
        await supabase
          .from("customers")
          .update({ balance: Number(nextBalance.toFixed(2)) })
          .eq("id", order.customer_id);
        await supabase.from("debt_payments").insert({
          store_id: storeId,
          party_type: "CUSTOMER",
          party_id: order.customer_id,
          amount: creditAmount,
          method: "REFUND",
          note: `ပြန်အမ်းငွေ · ${reason}`,
        });
      }

      // Reverse the money side of the sale in the ledger.
      await supabase.from("ledger_entries").insert(
        [
          creditAmount > 0
            ? {
                store_id: storeId,
                account: "ACCOUNTS_RECEIVABLE",
                direction: "CREDIT",
                amount: creditAmount,
                reference_type: "REFUND",
                reference_id: orderId,
                memo: reason,
              }
            : null,
          order.total_amount - creditAmount > 0
            ? {
                store_id: storeId,
                account: "CASH",
                direction: "CREDIT",
                amount: order.total_amount - creditAmount,
                reference_type: "REFUND",
                reference_id: orderId,
                memo: reason,
              }
            : null,
          {
            store_id: storeId,
            account: "SALES_REVENUE",
            direction: "DEBIT",
            amount: order.total_amount,
            reference_type: "REFUND",
            reference_id: orderId,
            memo: reason,
          },
        ].filter(Boolean) as never[],
      );

      await refreshRecentOrders();
      await refreshCatalog();
    },
    [logMovements, recentOrders, refreshCatalog, refreshRecentOrders, storeId],
  );

  useEffect(() => {
    void refreshTabs();
    void refreshHeldOrders();
    void refreshRecentOrders();
  }, [refreshTabs, refreshHeldOrders, refreshRecentOrders]);

  const holdTab = useCallback<PosContextValue["holdTab"]>(
    async ({ saleId, tableNumber, lines, total, notes }) => {
      if (!storeId) throw new Error("No active store");
      let createdId: string | null = null;
      if (saleId) {
        const existing = openTabs.find((tab) => tab.id === saleId);
        // Only newly added quantities are sent to the kitchen / deducted from stock.
        const deltas = lines
          .map((line) => {
            const saved = existing?.lines.find((l) => l.item_id === line.item_id);
            return { ...line, quantity: line.quantity - (saved?.quantity ?? 0) };
          })
          .filter((line) => line.quantity > 0);
        if (deltas.length > 0) {
          const { error } = await supabase.from("sale_items").insert(
            deltas.map((line) => ({
              sale_id: saleId,
              item_id: line.item_id,
              quantity: line.quantity,
              unit_price: line.unit_price,
              unit_name: line.unit_name ?? null,
              conversion: line.conversion ?? 1,
            })),
          );
          if (error) throw error;
          await logMovements(
            deltas.map((line) => ({
              item_id: line.item_id,
              quantity: line.quantity * (line.conversion ?? 1),
            })),
            "SALE",
            saleId,
          );
        }
        const { error: updateError } = await supabase
          .from("sales")
          .update({ total_amount: total, notes })
          .eq("id", saleId);
        if (updateError) throw updateError;
      } else {
        const { data: saleRow, error } = await supabase
          .from("sales")
          .insert({
            store_id: storeId,
            total_amount: total,
            payment_method: "Unpaid",
            status: "OPEN",
            table_number: tableNumber,
            notes,
            is_offline_sync: false,
          })
          .select("id")
          .single();
        if (error || !saleRow) throw error ?? new Error("Could not open the tab");
        createdId = saleRow.id;
        const { error: lineError } = await supabase.from("sale_items").insert(
          lines.map((line) => ({
            sale_id: saleRow.id,
            item_id: line.item_id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            unit_name: line.unit_name ?? null,
            conversion: line.conversion ?? 1,
          })),
        );
        if (lineError) throw lineError;
        await logMovements(
          lines.map((line) => ({
            item_id: line.item_id,
            quantity: line.quantity * (line.conversion ?? 1),
          })),
          "SALE",
          saleRow.id as string,
        );
      }
      await refreshTabs();
      await refreshCatalog();
      return createdId ?? saleId!;
    },
    [logMovements, openTabs, refreshCatalog, refreshTabs, storeId],
  );

  const closeTab = useCallback<PosContextValue["closeTab"]>(
    async ({ saleId, total, paymentMethod }) => {
      const { error } = await supabase
        .from("sales")
        .update({ status: "COMPLETED", payment_method: paymentMethod, total_amount: total })
        .eq("id", saleId);
      if (error) throw error;
      await refreshTabs();
      await refreshCatalog();
      await refreshRecentOrders();
    },
    [refreshCatalog, refreshRecentOrders, refreshTabs],
  );

  const list = items ?? [];
  const lowStockItems = list.filter((i) => i.stock_quantity <= i.min_stock_threshold);
  const lowStockCount = lowStockItems.length;
  const categories = [...new Set(list.map((i) => i.category || DEFAULT_CATEGORY))].sort();
  const syncState: SyncState = syncing ? "syncing" : isOnline ? "online" : "offline";

  const value = useMemo<PosContextValue>(
    () => ({
      items: list,
      categories,
      loading,
      isOnline,
      syncState,
      pendingCount,
      failedSyncCount,
      reviewCount,
      otherStorePendingCount,
      lowStockCount,
      lowStockItems,
      openTabs,
      heldOrders,
      recentOrders,
      refreshHeldOrders,
      refreshRecentOrders,
      holdOrder,
      deleteHeldOrder,
      refundOrder,
      refreshTabs,
      holdTab,
      closeTab,
      refreshCatalog,
      syncNow,
      recordSale,
      saveItem,
      deleteItem,
      seedDemoItems,
    }),
    [
      list,
      categories,
      loading,
      isOnline,
      syncState,
      pendingCount,
      failedSyncCount,
      reviewCount,
      otherStorePendingCount,
      lowStockCount,
      lowStockItems,
      openTabs,
      heldOrders,
      recentOrders,
      refreshHeldOrders,
      refreshRecentOrders,
      holdOrder,
      deleteHeldOrder,
      refundOrder,
      refreshTabs,
      holdTab,
      closeTab,
      refreshCatalog,
      syncNow,
      recordSale,
      saveItem,
      deleteItem,
      seedDemoItems,
    ],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside PosProvider");
  return ctx;
}
