import type { CachedItem } from "@/lib/pos-db";

export const CSV_HEADERS = [
  "Name",
  "SKU",
  "Selling_Price",
  "Cost_Price",
  "Stock_Quantity",
  "Unit_Name",
  "Category",
] as const;

/** Generate a unique 8-digit numeric SKU that is not already used. */
export function generateSku(existing: Iterable<string> = []): string {
  const used = new Set(existing);
  for (let i = 0; i < 50; i += 1) {
    const sku = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    if (!used.has(sku)) return sku;
  }
  return String(Date.now()).slice(-8);
}

/** Minimal RFC4180-ish CSV parser (handles quoted fields and CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ParsedItemRow {
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  unit_name: string;
  category: string;
  /** Not read from CSV today; importers fall back to a default threshold. */
  min_stock_threshold?: number;
}

export interface ParseResult {
  rows: ParsedItemRow[];
  errors: string[];
}

const num = (value: string | undefined) => {
  const n = Number(String(value ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function parseItemsCsv(text: string, existingSkus: Iterable<string>): ParseResult {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ["ဖိုင်ထဲတွင် အချက်အလက် မတွေ့ပါ။"] };

  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idx = {
    name: col("name"),
    sku: col("sku"),
    price: col("selling_price"),
    cost: col("cost_price"),
    stock: col("stock_quantity"),
    unit: col("unit_name"),
    category: col("category"),
  };
  if (idx.name < 0) return { rows: [], errors: ["`Name` ကော်လံ မပါဝင်ပါ။"] };

  const used = new Set(existingSkus);
  const rows: ParsedItemRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const lineNo = i + 2;
    const name = (cells[idx.name] ?? "").trim();
    if (!name) {
      errors.push(`စာကြောင်း ${lineNo}: အမည် မပါသဖြင့် ကျော်လိုက်သည်။`);
      return;
    }
    let sku = idx.sku >= 0 ? (cells[idx.sku] ?? "").trim() : "";
    if (!sku) sku = generateSku(used);
    used.add(sku);
    const price = idx.price >= 0 ? num(cells[idx.price]) : 0;
    if (price <= 0) errors.push(`စာကြောင်း ${lineNo}: စျေးနှုန်း ၀ ဖြစ်နေသည်။`);
    rows.push({
      name,
      sku,
      price,
      cost_price: idx.cost >= 0 ? num(cells[idx.cost]) : 0,
      stock_quantity: idx.stock >= 0 ? Math.trunc(num(cells[idx.stock])) : 0,
      unit_name: idx.unit >= 0 ? (cells[idx.unit] ?? "").trim() : "",
      category: idx.category >= 0 ? (cells[idx.category] ?? "").trim() : "",
    });
  });
  return { rows, errors };
}

export const SAMPLE_CSV_ROWS: (string | number)[][] = [
  [...CSV_HEADERS],
  ["ကော်ဖီမစ် (၃ဆက်)", "88001234", 1200, 800, 120, "ခု", "အဖျော်ယမကာ"],
  ["သောက်ရေသန့် ၁ လီတာ", "", 500, 300, 200, "ပုလင်း", "အဖျော်ယမကာ"],
];

export function itemsToCsvRows(items: CachedItem[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    [...CSV_HEADERS, "Min_Stock_Threshold", "Barcode", "Packaging_Units"],
  ];
  for (const item of items) {
    rows.push([
      item.name,
      item.sku,
      item.price,
      item.cost_price ?? 0,
      item.stock_quantity,
      item.units?.find((u) => u.is_default)?.unit_name ?? "",
      item.category ?? "",
      item.min_stock_threshold,
      item.barcode ?? "",
      (item.units ?? []).map((u) => `${u.unit_name}x${u.conversion}@${u.price}`).join(" | "),
    ]);
  }
  return rows;
}
