import { Camera, Plus, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { stockStatus, money } from "@/lib/pos-utils";
import type { CachedItem } from "@/lib/pos-db";

interface DenseProductListProps {
  items: CachedItem[];
  filtered: CachedItem[];
  categories: string[];
  query: string;
  category: string;
  lowStockItems: CachedItem[];
  currencySymbol: string;
  onQueryChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
  onAdd: (item: CachedItem) => void;
  onScan: () => void;
}

export function DenseProductList({
  items,
  filtered,
  categories,
  query,
  category,
  lowStockItems,
  currencySymbol,
  onQueryChange,
  onCategoryChange,
  onAdd,
  onScan,
}: DenseProductListProps) {
  const fmt = (n: number) => money(n, currencySymbol);

  return (
    <div className="flex h-full flex-col">
      {/* Search + scan */}
      <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-background/95 p-4 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="အမည် (သို့) SKU ဖြင့် ရှာပါ၊ သို့မဟုတ် ဘားကုဒ် ဖတ်ပါ"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={onScan}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">စကင်န်ဖတ်ရန်</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <p className="min-w-0 flex-1 text-xs font-medium">
              လက်ကျန်နည်းနေသော ပစ္စည်း {lowStockItems.length} မျိုး ရှိပါသည်။
            </p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {["အားလုံး", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === cat
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product rows */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="space-y-2">
          {filtered.map((item) => {
            const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
            const outOfStock = item.stock_quantity <= 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors",
                  outOfStock ? "opacity-60" : "hover:border-primary/40",
                )}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {item.name.slice(0, 2)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{item.sku}</span>
                    <span>·</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        status === "ok" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                        status === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                        status === "out" && "bg-destructive/15 text-destructive",
                      )}
                    >
                      {status === "ok" ? "ပစ္စည်းရှိသည်" : status === "low" ? "လက်ကျန်နည်း" : "ပစ္စည်းပြတ်"}
                    </span>
                    <span className="tabular-nums">{item.stock_quantity} ကျန်</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-primary">{fmt(item.price)}</p>
                </div>

                <button
                  onClick={() => onAdd(item)}
                  disabled={outOfStock}
                  aria-label={`${item.name} ထည့်ရန်`}
                  className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors hover:bg-accent disabled:opacity-50 sm:h-9 sm:w-9"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
              {items.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">ကုန်ပစ္စည်း စာရင်းမရှိသေးပါ။</p>
                  <p className="text-xs text-muted-foreground">ကုန်ပစ္စည်းစာရင်းသို့ သွားပြီး ပစ္စည်းထည့်သွင်းပါ။</p>
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
