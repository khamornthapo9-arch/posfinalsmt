import Dexie, { type Table } from "dexie";

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
  }
}

export const posDb = new PosDatabase();
