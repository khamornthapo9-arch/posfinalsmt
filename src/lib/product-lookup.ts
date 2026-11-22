import type { CachedItem } from "@/lib/pos-db";

/** Only safe formatting is normalised: surrounding whitespace. Leading zeros are meaningful. */
export const normalizeCode = (code: string) => code.trim();

/** Visible catalog search: name, SKU, barcode and QR value, case-insensitive substring. */
export function matchesQuery(item: CachedItem, query: string): boolean {
  const q = normalizeCode(query).toLowerCase();
  if (!q) return true;
  return [item.name, item.sku, item.barcode, item.qr_value].some(
    (field) => field != null && field.toLowerCase().includes(q),
  );
}

export type CodeLookup =
  | { kind: "found"; item: CachedItem }
  | { kind: "ambiguous"; items: CachedItem[] }
  | { kind: "none" };

/** Exact scan lookup across SKU, barcode and QR value. Never picks an arbitrary item. */
export function findByCode(items: CachedItem[], rawCode: string): CodeLookup {
  const code = normalizeCode(rawCode).toLowerCase();
  if (!code) return { kind: "none" };
  const hits = items.filter((item) =>
    [item.sku, item.barcode, item.qr_value].some(
      (field) => field != null && field.trim().toLowerCase() === code,
    ),
  );
  if (hits.length === 1) return { kind: "found", item: hits[0]! };
  if (hits.length > 1) return { kind: "ambiguous", items: hits };
  return { kind: "none" };
}

/** Stock impact of cart lines for one item, in base units: sale quantity × unit conversion. */
export function baseQuantityFor(
  lines: { item_id: string; quantity: number; conversion?: number | undefined }[],
  itemId: string,
): number {
  return lines
    .filter((line) => line.item_id === itemId)
    .reduce((sum, line) => sum + line.quantity * (line.conversion ?? 1), 0);
}
