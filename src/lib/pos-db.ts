import Dexie, { type Table } from "dexie";

export interface CachedItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  created_at: string;
}

export interface PendingSaleLine {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface PendingSale {
  localId?: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
  lines: PendingSaleLine[];
}

class PosDatabase extends Dexie {
  cached_items!: Table<CachedItem, string>;
  pending_sales!: Table<PendingSale, number>;

  constructor() {
    super("pos_offline_db");
    this.version(1).stores({
      cached_items: "id, sku, name",
      pending_sales: "++localId, created_at",
    });
  }
}

export const posDb = new PosDatabase();
