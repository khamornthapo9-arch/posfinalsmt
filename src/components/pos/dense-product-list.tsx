import { useMemo } from "react";
import { Camera, Plus, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { stockStatus, money } from "@/lib/pos-utils";
import { useCachedImage } from "@/lib/use-cached-image";
import type { CachedItem, ItemUnit } from "@/lib/pos-db";

interface DenseProductListProps {
  items: CachedItem[];
  query: string;
  selectedCategory: string;
  lowStockCount: number;
  currencySymbol: string;
  isPro: boolean;
  onQueryChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
  onAdd: (item: CachedItem, unit?: ItemUnit) => void;
  onScan: () => void;
}

function ItemThumbnail({
  url,
  name,
  onClick,
}: {
  url?: string | null;
  name: string;
  onClick?: () => void;
}) {
  const src = useCachedImage(url);
  if (!src) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="press relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
    >
      <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" />
    </button>
  );
}

export function DenseProductList({
  items,
  query,
  selectedCategory,
  lowStockCount,
  currencySymbol,
  isPro,
  onQueryChange,
  onCategoryChange,
  onAdd,
  onScan,
}: DenseProductListProps) {
  const fmt = (n: number) => money(n, currencySymbol);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== "အားလုံး" && item.category !== selectedCategory) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    });
  }, [items, query, selectedCategory]);

  return (
    <div className="flex h-full flex-col">
      {/* Search + scan */}
      <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="ရှာဖွေရန်..."
              type="search"
              enterKeyHint="search"
              aria-label="ကုန်ပစ္စည်း ရှာဖွေရန်"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] hover:border-ring/40 focus:border-ring focus:ring-[3px] focus:ring-ring/25"
            />
          </div>
          <button
            type="button"
            onClick={onScan}
            aria-label="စကင်န်ဖတ်ရန်"
            className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-btn hover:bg-primary/90"
          >
            <Camera className="h-5 w-5" />
            <span className="hidden sm:inline">စကင်န်ဖတ်ရန်</span>
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <p className="min-w-0 flex-1 text-xs font-medium">
              လက်ကျန်နည်းနေသော ပစ္စည်း {lowStockCount} မျိုး ရှိပါသည်။
            </p>
          </div>
        )}

        <div className="-mx-3 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-3 pb-1">
          {["အားလုံး", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              aria-pressed={selectedCategory === cat}
              className={cn(
                "press min-h-9 touch:min-h-11 shrink-0 snap-start rounded-md border px-3.5 py-1.5 text-sm font-semibold leading-5",
                selectedCategory === cat
                  ? "border-transparent bg-primary text-primary-foreground shadow-btn"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product rows */}
      <div className="flex-1 overflow-y-auto bg-card">
        <div className="divide-y divide-border border-b border-border">
          {filtered.map((item) => {
            const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
            const outOfStock = item.stock_quantity <= 0;
            const units = isPro ? item.units : [];
            const hasUnits = units.length > 0;
            const defaultUnit = units.find((u) => u.is_default) ?? units[0];

            return (
              <div
                key={item.id}
                className={cn(
                  "px-3 py-2.5 transition-colors duration-150 sm:px-4",
                  outOfStock ? "opacity-60" : "hover:bg-muted active:bg-primary-soft",
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Product Photo Thumbnail - tap to add */}
                  {item.image_url && (
                    <ItemThumbnail
                      url={item.image_url}
                      name={item.name}
                      onClick={() => !outOfStock && onAdd(item, defaultUnit)}
                    />
                  )}

                  <div
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    aria-disabled={outOfStock}
                    className="min-w-0 flex-1 cursor-pointer select-none rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => !outOfStock && onAdd(item, defaultUnit)}
                    onKeyDown={(event) => {
                      if (outOfStock) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onAdd(item, defaultUnit);
                      }
                    }}
                  >
                    <p className="truncate text-sm font-semibold leading-6">{item.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "tabular-nums",
                          status === "low" && "font-medium text-warning",
                          status === "out" && "font-medium text-destructive",
                        )}
                      >
                        {status === "out" ? "ပစ္စည်းပြတ်" : `${item.stock_quantity} ကျန်`}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">{fmt(item.price)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAdd(item, defaultUnit)}
                    disabled={outOfStock}
                    aria-label={`${item.name} ထည့်ရန်`}
                    className="press ml-1 flex h-10 w-10 touch:h-12 touch:w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {hasUnits && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onAdd(item)}
                      className="press min-h-8 touch:min-h-10 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                    >
                      အရပ် · {fmt(item.price)}
                    </button>
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => onAdd(item, unit)}
                        className="press min-h-8 touch:min-h-10 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        {unit.unit_name} x{unit.conversion} · {fmt(unit.price)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              {items.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">ကုန်ပစ္စည်း စာရင်းမရှိသေးပါ။</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
