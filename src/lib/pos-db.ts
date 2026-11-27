import Dexie, { type Table } from "dexie";

export interface ItemUnit {
  id: string;
  item_id: string;
  unit_name: string;
  conversion: number;
  price: number;
  is_default: boolean;
}

export interface CachedItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  category: string;
  image_url: string | null;
  barcode: string | null;
  qr_value: string | null;
  created_at: string;
  units: ItemUnit[];
  /** Set when archived: kept for history and restorable, hidden from selling and alerts. */
  archived_at?: string | null;
}

export interface PendingSaleLine {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit_name?: string | undefined;
  conversion?: number | undefined;
}

export type PendingSyncState = "queued" | "syncing" | "failed" | "needs_review";

export interface PendingSale {
  localId?: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
  lines: PendingSaleLine[];
  /** Stable idempotency key. It is also used as the server `sales.id`, so a retry can never create a second sale. */
  client_transaction_id?: string;
  /** Store the sale was rung up in. Sync always uses this, never the currently selected store. */
  store_id?: string | null;
  user_id?: string | null;
  payment_breakdown?: { method: string; amount: number }[];
  customer_id?: string | null;
  /** Shift active when the sale was rung up; the server re-validates it on sync. */
  shift_id?: string | null;
  customer_name?: string | null;
  status?: string;
  payment_status?: string;
  cash_received?: number | null;
  change?: number | null;
  sync_state?: PendingSyncState;
  last_error?: string | null;
  attempts?: number;
  last_attempt_at?: string | null;
}

export interface CachedImage {
  url: string;
  blob: Blob;
  cached_at: number;
}

class PosDatabase extends Dexie {
  cached_items!: Table<CachedItem, string>;
  pending_sales!: Table<PendingSale, number>;
  cached_images!: Table<CachedImage, string>;

  constructor() {
    super("pos_offline_db");
    this.version(1).stores({
      cached_items: "id, sku, name",
      pending_sales: "++localId, created_at",
    });
    this.version(2)
      .stores({
        cached_items: "id, sku, name",
        pending_sales: "++localId, created_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("cached_items")
          .toCollection()
          .modify((item: Partial<CachedItem>) => {
            if (item.cost_price == null) item.cost_price = 0;
          });
      });
    this.version(3)
      .stores({
        cached_items: "id, sku, name, category",
        pending_sales: "++localId, created_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("cached_items")
          .toCollection()
          .modify((item: Partial<CachedItem>) => {
            if (!item.category) item.category = "အထွေထွေ";
            if (item.image_url === undefined) item.image_url = null;
          });
      });
    this.version(4)
      .stores({
        cached_items: "id, sku, name, category",
        pending_sales: "++localId, created_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("cached_items")
          .toCollection()
          .modify((item: Partial<CachedItem>) => {
            if (item.barcode === undefined) item.barcode = null;
            if (item.qr_value === undefined) item.qr_value = null;
          });
      });
    this.version(5)
      .stores({
        cached_items: "id, sku, name, category",
        pending_sales: "++localId, created_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("cached_items")
          .toCollection()
          .modify((item: Partial<CachedItem>) => {
            if (!item.units) item.units = [];
          });
      });
    this.version(6).stores({
      cached_items: "id, sku, name, category",
      pending_sales: "++localId, created_at",
      cached_images: "url, cached_at",
    });
    // v7: pending sales carry their own store, key and full payment/customer snapshot.
    // Rows queued before this version have no reliable store, so they are quarantined for review
    // instead of being posted to whichever store happens to be active.
    this.version(7)
      .stores({
        cached_items: "id, sku, name, category",
        pending_sales: "++localId, created_at, store_id, client_transaction_id, sync_state",
        cached_images: "url, cached_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("pending_sales")
          .toCollection()
          .modify((sale: Partial<PendingSale>) => {
            if (!sale.client_transaction_id) sale.client_transaction_id = crypto.randomUUID();
            if (sale.store_id === undefined) sale.store_id = null;
            if (!sale.sync_state) sale.sync_state = sale.store_id ? "queued" : "needs_review";
            if (sale.attempts == null) sale.attempts = 0;
          });
      });
  }
}

export const posDb = new PosDatabase();
