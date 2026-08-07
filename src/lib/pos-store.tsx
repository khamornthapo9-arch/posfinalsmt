import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { posDb, type CachedItem, type PendingSale, type PendingSaleLine } from "@/lib/pos-db";

export type SyncState = "online" | "offline" | "syncing";

interface PosContextValue {
  items: CachedItem[];
  loading: boolean;
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lowStockCount: number;
  refreshCatalog: () => Promise<void>;
  syncNow: () => Promise<void>;
  recordSale: (input: {
    lines: PendingSaleLine[];
    total: number;
    paymentMethod: string;
  }) => Promise<{ offline: boolean }>;
  saveItem: (input: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    stock_quantity: number;
    min_stock_threshold: number;
  }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const items = useLiveQuery(() => posDb.cached_items.orderBy("name").toArray(), [], []);
  const pending = useLiveQuery(() => posDb.pending_sales.toArray(), [], []);
  const pendingCount = pending?.length ?? 0;

  const refreshCatalog = useCallback(async () => {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error || !data) return;
    const rows: CachedItem[] = data.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      price: Number(row.price),
      stock_quantity: row.stock_quantity,
      min_stock_threshold: row.min_stock_threshold,
      created_at: row.created_at,
    }));
    await posDb.transaction("rw", posDb.cached_items, async () => {
      await posDb.cached_items.clear();
      await posDb.cached_items.bulkPut(rows);
    });
  }, []);

  const pushPendingSales = useCallback(async () => {
    const queued = await posDb.pending_sales.toArray();
    for (const sale of queued) {
      const { data: saleRow, error } = await supabase
        .from("sales")
        .insert({
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          is_offline_sync: true,
          created_at: sale.created_at,
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
      if (sale.localId != null) await posDb.pending_sales.delete(sale.localId);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
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
  }, [pushPendingSales, refreshCatalog, syncing]);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

  const recordSale = useCallback<PosContextValue["recordSale"]>(
    async ({ lines, total, paymentMethod }) => {
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

      if (navigator.onLine && isOnline) {
        try {
          const { data: saleRow, error } = await supabase
            .from("sales")
            .insert({
              total_amount: total,
              payment_method: paymentMethod,
              is_offline_sync: false,
              created_at: createdAt,
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
          await refreshCatalog();
          return { offline: false };
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
      return { offline: true };
    },
    [isOnline, refreshCatalog],
  );

  const saveItem = useCallback<PosContextValue["saveItem"]>(
    async (input) => {
      const payload = {
        sku: input.sku,
        name: input.name,
        price: input.price,
        stock_quantity: input.stock_quantity,
        min_stock_threshold: input.min_stock_threshold,
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
    [refreshCatalog],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  const list = items ?? [];
  const lowStockCount = list.filter((i) => i.stock_quantity <= i.min_stock_threshold).length;
  const syncState: SyncState = syncing ? "syncing" : isOnline ? "online" : "offline";

  const value = useMemo<PosContextValue>(
    () => ({
      items: list,
      loading,
      isOnline,
      syncState,
      pendingCount,
      lowStockCount,
      refreshCatalog,
      syncNow,
      recordSale,
      saveItem,
      deleteItem,
    }),
    [
      list,
      loading,
      isOnline,
      syncState,
      pendingCount,
      lowStockCount,
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
