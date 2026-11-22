import { useMemo, type KeyboardEvent } from "react";
import { Camera, LayoutGrid, List, Package, Plus, Search, AlertTriangle } from "lucide-react";
import { matchesQuery } from "@/lib/product-lookup";
import { cn } from "@/lib/utils";
import { stockStatus, money } from "@/lib/pos-utils";
import { useCachedImage } from "@/lib/use-cached-image";
import { flyToCart } from "@/lib/fly-to-cart";
import type { ProductViewMode } from "@/lib/use-product-view";
import type { CachedItem, ItemUnit } from "@/lib/pos-db";

interface DenseProductListProps {
  items: CachedItem[];
  query: string;
  selectedCategory: string;
  lowStockCount: number;
  currencySymbol: string;
  /** True while the first catalog load is still running. */
  loading?: boolean;
  /** True when the device is offline (empty states then explain the cache). */
  offline?: boolean;
  /** The cashier's saved choice; `null` = automatic (grid when items have photos). */
  viewMode: ProductViewMode | null;
  onViewModeChange: (mode: ProductViewMode) => void;
  onQueryChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
  onAdd: (item: CachedItem, unit?: ItemUnit) => void;
  onScan: () => void;
}

/** Product photo, or a neutral placeholder tile so rows/cards stay aligned when a photo is missing. */
function ItemImage({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  const src = useCachedImage(url);
  return (
    <div data-fly-source className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
          <Package className="h-1/3 w-1/3 min-h-4 min-w-4" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

const VIEW_OPTIONS = [
  { mode: "grid", label: "ဂရစ်ပုံစံ", Icon: LayoutGrid },
  { mode: "list", label: "စာရင်းပုံစံ", Icon: List },
] as const;

export function DenseProductList({
  items,
  query,
  selectedCategory,
  lowStockCount,
  currencySymbol,
  loading = false,
  offline = false,
  viewMode,
  onViewModeChange,
  onQueryChange,
  onCategoryChange,
  onAdd,
  onScan,
}: DenseProductListProps) {
  const fmt = (n: number) => money(n, currencySymbol);

  const hasImages = useMemo(() => items.some((item) => Boolean(item.image_url)), [items]);
  // Until the cashier picks a layout, show a photo grid if any item has a photo, else the list.
  const view: ProductViewMode = viewMode ?? (hasImages ? "grid" : "list");

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== "အားလုံး" && item.category !== selectedCategory) return false;
      if (!q) return true;
      return matchesQuery(item, q);
    });
  }, [items, query, selectedCategory]);

  /** Enter / Space on a tappable (non-<button>) product area adds it, like a real button. */
  const addOnKey = (event: KeyboardEvent<HTMLElement>, add: (el: HTMLElement) => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      add(event.currentTarget);
    }
  };

  /**
   * "Item flies into the cart" effect, started from what the cashier tapped. Taps on the card/row
   * launch from the product photo (or its placeholder); taps on the + or unit buttons launch from
   * that button. The flying copy shows the product's photo when it has one.
   */
  const fly = (clicked: HTMLElement, fromImage: boolean) => {
    const root = clicked.closest<HTMLElement>("[data-product]");
    const img = root?.querySelector("img") ?? null;
    const origin = fromImage
      ? (root?.querySelector<HTMLElement>("[data-fly-source]") ??
        root?.querySelector<HTMLElement>("[data-add-button]") ??
        clicked)
      : clicked;
    flyToCart(origin, { imageSrc: img?.currentSrc || img?.src || null });
  };

  /** Extra unit buttons: whole-pack / carton prices next to the default one. */
  const renderUnitButtons = (item: CachedItem, units: ItemUnit[]) => {
    const soldOut = item.stock_quantity <= 0;
    return (
    <>
      <button
        type="button"
        disabled={soldOut}
        onClick={(event) => {
          onAdd(item);
          fly(event.currentTarget, false);
        }}
        className="press min-h-8 touch:min-h-10 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        အရပ် · {fmt(item.price)}
      </button>
      {units.map((unit) => (
        <button
          key={unit.id}
          type="button"
          disabled={soldOut}
          onClick={(event) => {
            onAdd(item, unit);
            fly(event.currentTarget, false);
          }}
          className="press min-h-8 touch:min-h-10 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {unit.unit_name} x{unit.conversion} · {fmt(unit.price)}
        </button>
      ))}
    </>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search + view toggle + scan */}
      <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card p-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="အမည်၊ SKU၊ ဘားကုဒ် ရှာရန်..."
              type="search"
              enterKeyHint="search"
              aria-label="ကုန်ပစ္စည်း ရှာဖွေရန်"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] hover:border-ring/40 focus:border-ring focus:ring-[3px] focus:ring-ring/25"
            />
          </div>

          <div
            role="group"
            aria-label="ကုန်ပစ္စည်း ပြသပုံစံ"
            className="flex shrink-0 items-stretch rounded-lg border border-input bg-card p-0.5 shadow-xs"
          >
            {VIEW_OPTIONS.map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                aria-pressed={view === mode}
                aria-label={label}
                title={label}
                className={cn(
                  "press flex w-10 items-center justify-center rounded-md transition-colors",
                  view === mode
                    ? "bg-primary text-primary-foreground shadow-btn"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
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

      {/* Products: only this area scrolls, the search/filter bar above stays put */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card">
        {view === "grid" ? (
          <div
            key="grid"
            className="animate-fade-in grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5 p-3 sm:gap-3 sm:p-4"
          >
            {filtered.map((item) => {
              const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
              const outOfStock = item.stock_quantity <= 0;
              const units = item.units;
              const defaultUnit = units.find((u) => u.is_default) ?? units[0];
              const add = (el: HTMLElement, fromImage: boolean) => {
                if (outOfStock) return;
                onAdd(item, defaultUnit);
                fly(el, fromImage);
              };

              return (
                <div
                  key={item.id}
                  data-product
                  className={cn(
                    "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs",
                    outOfStock ? "opacity-60" : "lift",
                  )}
                >
                  <div
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    aria-disabled={outOfStock}
                    aria-label={`${item.name} ထည့်ရန်`}
                    onClick={(event) => add(event.currentTarget, true)}
                    onKeyDown={(event) =>
                      !outOfStock && addOnKey(event, (el) => add(el, true))
                    }
                    className="flex min-w-0 flex-1 cursor-pointer select-none flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="relative">
                      <ItemImage url={item.image_url} name={item.name} className="aspect-square w-full" />
                      {status !== "ok" && (
                        <span
                          className={cn(
                            "absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold shadow-xs",
                            status === "low" && "bg-warning-soft text-warning",
                            status === "out" && "bg-danger-soft text-destructive",
                          )}
                        >
                          {status === "out" ? "ပစ္စည်းပြတ်" : `${item.stock_quantity} ကျန်`}
                        </span>
                      )}
                      {!outOfStock && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-btn"
                        >
                          <Plus className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2.5">
                      <p className="line-clamp-2 min-h-12 text-sm font-semibold leading-6">
                        {item.name}
                      </p>
                      <div className="mt-auto flex items-baseline justify-between gap-2">
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {fmt(item.price)}
                        </span>
                        {status === "ok" && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {item.stock_quantity} ကျန်
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {units.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border/60 p-2">
                      {renderUnitButtons(item, units)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div key="list" className="animate-fade-in divide-y divide-border border-b border-border">
            {filtered.map((item) => {
              const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
              const outOfStock = item.stock_quantity <= 0;
              const units = item.units;
              const defaultUnit = units.find((u) => u.is_default) ?? units[0];
              const add = (el: HTMLElement, fromImage: boolean) => {
                if (outOfStock) return;
                onAdd(item, defaultUnit);
                fly(el, fromImage);
              };

              return (
                <div
                  key={item.id}
                  data-product
                  className={cn(
                    "px-3 py-2.5 transition-colors duration-150 sm:px-4",
                    outOfStock ? "opacity-60" : "hover:bg-muted active:bg-primary-soft",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Photo thumbnail. Once any item has a photo, every row gets a tile (placeholder
                        when missing) so names and prices line up. Tap to add. */}
                    {hasImages && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        onClick={(event) => add(event.currentTarget, true)}
                        className="press shrink-0 overflow-hidden rounded-lg border border-border"
                      >
                        <ItemImage url={item.image_url} name={item.name} className="h-12 w-12" />
                      </button>
                    )}

                    <div
                      role="button"
                      tabIndex={outOfStock ? -1 : 0}
                      aria-disabled={outOfStock}
                      className="min-w-0 flex-1 cursor-pointer select-none rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={(event) => add(event.currentTarget, true)}
                      onKeyDown={(event) =>
                        !outOfStock && addOnKey(event, (el) => add(el, true))
                      }
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
                      data-add-button
                      onClick={(event) => add(event.currentTarget, false)}
                      disabled={outOfStock}
                      aria-label={`${item.name} ထည့်ရန်`}
                      className="press ml-1 flex h-10 w-10 touch:h-12 touch:w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {units.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">{renderUnitButtons(item, units)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && loading && items.length === 0 && (
          <div className="space-y-2 p-3" role="status" aria-label="ပစ္စည်းများ ဖတ်နေသည်">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {filtered.length === 0 && !(loading && items.length === 0) && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {offline
                  ? "အော့ဖ်လိုင်းဖြစ်နေပြီး သိမ်းထားသော ပစ္စည်းစာရင်း မရှိသေးပါ။"
                  : "ကုန်ပစ္စည်း စာရင်းမရှိသေးပါ။"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
