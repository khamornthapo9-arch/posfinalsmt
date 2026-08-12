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
}

export interface PendingSaleLine {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit_name?: string;
  conversion?: number;
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
  }
}

export const posDb = new PosDatabase();
