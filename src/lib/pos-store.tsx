import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { posDb, type CachedItem, type PendingSale, type PendingSaleLine } from "@/lib/pos-db";

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
  pendingCount: number;
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
  }) => Promise<{ offline: boolean; saleId: string | null }>;
  saveItem: (input: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    min_stock_threshold: number;
    category?: string;
  }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
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
  const pendingCount = pending?.length ?? 0;

  const refreshCatalog = useCallback(async () => {
    if (!storeId) {
      await posDb.cached_items.clear();
      return;
    }
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    if (error || !data) return;
    const rows: CachedItem[] = data.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      price: Number(row.price),
      cost_price: Number(row.cost_price ?? 0),
      stock_quantity: row.stock_quantity,
      min_stock_threshold: row.min_stock_threshold,
      category: (row as { category?: string | null }).category || DEFAULT_CATEGORY,
      image_url: (row as { image_url?: string | null }).image_url ?? null,
      created_at: row.created_at,
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
    const queued = await posDb.pending_sales.toArray();
    for (const sale of queued) {
      const { data: saleRow, error } = await supabase
        .from("sales")
        .insert({
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          is_offline_sync: true,
          created_at: sale.created_at,
          store_id: storeId,
        })
        .select("id")
        .single();
      if (error || !saleRow) throw error ?? new Error("Sale sync failed");
      const { error: lineError } = await supabase.from("sale_items").insert(
        sale.lines.map((line) => ({
          sale_id: saleRow.id,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
      );
      if (lineError) throw lineError;
      await logMovements(sale.lines, "SALE", saleRow.id as string);
      if (sale.localId != null) await posDb.pending_sales.delete(sale.localId);
    }
  }, [logMovements, storeId]);

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
    async ({ lines, total, paymentMethod, paymentBreakdown, customerId, status }) => {
      const createdAt = new Date().toISOString();
      const applyLocalStock = async () => {
        await posDb.transaction("rw", posDb.cached_items, async () => {
          for (const line of lines) {
            const cached = await posDb.cached_items.get(line.item_id);
            if (cached) {
              await posDb.cached_items.put({
                ...cached,
                stock_quantity: Math.max(cached.stock_quantity - line.quantity, 0),
              });
            }
          }
        });
      };

      if (navigator.onLine && isOnline && storeId) {
        try {
          const { data: saleRow, error } = await supabase
            .from("sales")
            .insert({
              total_amount: total,
              payment_method: paymentMethod,
              payment_breakdown: (paymentBreakdown ?? [
                { method: paymentMethod, amount: total },
              ]) as unknown as never,
              is_offline_sync: false,
              created_at: createdAt,
              store_id: storeId,
              customer_id: customerId ?? null,
              status: status ?? "COMPLETED",
            })
            .select("id")
            .single();
          if (error || !saleRow) throw error ?? new Error("Sale failed");
          const { error: lineError } = await supabase.from("sale_items").insert(
            lines.map((line) => ({
              sale_id: saleRow.id,
              item_id: line.item_id,
              quantity: line.quantity,
              unit_price: line.unit_price,
            })),
          );
          if (lineError) throw lineError;
          await logMovements(lines, "SALE", saleRow.id as string);
          await refreshCatalog();
          return { offline: false, saleId: saleRow.id as string };
        } catch {
          setIsOnline(false);
        }
      }

      const offlineSale: PendingSale = {
        total_amount: total,
        payment_method: paymentMethod,
        created_at: createdAt,
        lines,
      };
      await posDb.pending_sales.add(offlineSale);
      await applyLocalStock();
      return { offline: true, saleId: null };
    },
    [isOnline, logMovements, refreshCatalog, storeId],
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
      };
      if (input.id) {
        const { error } = await supabase.from("items").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("items").insert(payload);
        if (error) throw error;
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

      const { error } = await supabase
        .from("sales")
        .update({
          status: "REFUNDED",
          refund_reason: reason,
          refund_note: note.trim() || null,
          refunded_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      // Put the stock back item by item.
      for (const line of order.lines) {
        const { data: current } = await supabase
          .from("items")
          .select("stock_quantity")
          .eq("id", line.item_id)
          .maybeSingle();
        if (current) {
          await supabase
            .from("items")
            .update({ stock_quantity: current.stock_quantity + line.quantity })
            .eq("id", line.item_id);
        }
      }
      await logMovements(order.lines, "RETURN", orderId);
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
            })),
          );
          if (error) throw error;
          await logMovements(deltas, "SALE", saleId);
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
          })),
        );
        if (lineError) throw lineError;
        await logMovements(lines, "SALE", saleRow.id as string);
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
    }),
    [
      list,
      categories,
      loading,
      isOnline,
      syncState,
      pendingCount,
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
    ],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside PosProvider");
  return ctx;
}
