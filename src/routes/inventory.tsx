import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
const QRCodeCanvas = lazy(() =>
  import("@/components/lazy/label-codes").then((m) => ({ default: m.QRCodeCanvas })),
);
const Barcode = lazy(() =>
  import("@/components/lazy/label-codes").then((m) => ({ default: m.Barcode })),
);
import {
  Barcode as BarcodeIcon,
  Crown,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  ImagePlus,
  AlertTriangle,
  Boxes,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import { useAuth } from "@/lib/auth-store";
import { usePos } from "@/lib/pos-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { uploadItemImage } from "@/lib/image-store";
import { useCachedImage } from "@/lib/use-cached-image";
import { downloadCsv, money, stockStatus } from "@/lib/pos-utils";
import {
  SAMPLE_CSV_ROWS,
  generateSku,
  itemsToCsvRows,
  parseItemsCsv,
  type ParsedItemRow,
} from "@/lib/item-csv";
import type { CachedItem } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ကုန်ပစ္စည်းစာရင်းနှင့် လေဘယ်များ — Counter Point of Sale" },
      {
        name: "description",
        content: "ကုန်ပစ္စည်းစာရင်း၊ စာရင်းချိန်ညှိမှု၊ ဘားကုဒ်နှင့် QR လေဘယ်များ ထုတ်ယူရန် စနစ်။",
      },
      { property: "og:title", content: "ကုန်ပစ္စည်းစာရင်းနှင့် လေဘယ်များ — Counter Point of Sale" },
      {
        property: "og:description",
        content: "ကုန်ပစ္စည်းစာရင်း၊ စာရင်းချိန်ညှိမှု၊ ဘားကုဒ်နှင့် QR လေဘယ်များ ထုတ်ယူရန် စနစ်။",
      },
    ],
  }),
  component: InventoryPage,
});

type Filter = "all" | "in_stock" | "low" | "out";

const EMPTY_ITEM = {
  sku: "",
  name: "",
  price: "",
  cost_price: "0",
  stock_quantity: "0",
  min_stock_threshold: "5",
  category: "အထွေထွေ",
  barcode: "",
  qr_value: "",
};

function InventoryPage() {
  const { items, categories, saveItem, deleteItem, seedDemoItems, adjustStock } = usePos();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editing, setEditing] = useState<CachedItem | "new" | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<CachedItem | null>(null);
  const [labelItem, setLabelItem] = useState<CachedItem | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);
  const { isPro, fmt } = useStoreSettings();
  const { isBranchDevice } = useAuth();

  // Summary Metrics
  const metrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;
    let totalRetailValuation = 0;
    let totalCostValuation = 0;

    for (const item of items) {
      const qty = Number(item.stock_quantity) || 0;
      const min = Number(item.min_stock_threshold) || 0;
      const price = Number(item.price) || 0;
      const cost = Number(item.cost_price) || 0;

      if (qty <= 0) {
        outStock++;
      } else if (qty <= min) {
        lowStock++;
      } else {
        inStock++;
      }

      totalRetailValuation += price * qty;
      totalCostValuation += cost * qty;
    }

    return {
      totalItems: items.length,
      inStock,
      lowStock,
      outStock,
      totalRetailValuation,
      totalCostValuation,
    };
  }, [items]);

  // Filtered Items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.qr_value && item.qr_value.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" ||
        (item.category || "အထွေထွေ") === selectedCategory;

      const qty = Number(item.stock_quantity) || 0;
      const min = Number(item.min_stock_threshold) || 0;

      let passesFilter = true;
      if (filter === "in_stock") passesFilter = qty > min;
      else if (filter === "low") passesFilter = qty > 0 && qty <= min;
      else if (filter === "out") passesFilter = qty <= 0;

      return matchesSearch && matchesCategory && passesFilter;
    });
  }, [items, query, filter, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?")) return;
    try {
      await deleteItem(id);
      toast.success("ကုန်ပစ္စည်း ဖျက်ပြီးပါပြီ");
    } catch {
      toast.error("ရောင်းချထားသော သမိုင်းမှတ်တမ်းရှိသည့် ကုန်ပစ္စည်းကို ဖျက်၍မရပါ");
    }
  };

  return (
    <PosShell
      stackActionsOnMobile
      title="ကုန်ပစ္စည်းစာရင်း"
      subtitle={
        isBranchDevice
          ? `ဆိုင်ခွဲ လက်ကျန်စာရင်း · စုစုပေါင်း ${items.length} မျိုး`
          : `စုစုပေါင်း ${items.length} မျိုး · ရောင်းရငွေခန့်မှန်းတန်ဖိုး ${fmt(metrics.totalRetailValuation)}`
      }
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {/* Search Box */}
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="အမည်/SKU/Barcode..."
              aria-label="ကုန်ပစ္စည်း ရှာဖွေရန်"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions Dropdown */}
          <div className="relative shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCsvMenuOpen((prev) => !prev)}
              className="h-9 rounded-md text-xs"
            >
              လုပ်ဆောင်ချက်များ ▾
            </Button>

            {csvMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    downloadCsv(
                      `items-${new Date().toISOString().slice(0, 10)}.csv`,
                      itemsToCsvRows(items),
                    );
                  }}
                  className="w-full rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-accent"
                >
                  CSV ထုတ်ယူမည် (Export)
                </button>
                {!isBranchDevice && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvMenuOpen(false);
                        setImportOpen(true);
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-accent"
                    >
                      CSV ဖြင့် ထည့်သွင်းမည် (Import)
                    </button>
                    {items.length === 0 && (
                      <button
                        type="button"
                        disabled={seeding}
                        onClick={() => {
                          setCsvMenuOpen(false);
                          setSeeding(true);
                          void seedDemoItems()
                            .then((count) =>
                              toast.success(`${count} ကုန်ပစ္စည်း ဥပမာများ ထည့်သွင်းပြီးပါပြီ`),
                            )
                            .catch(() => toast.error("ဥပမာကုန်ပစ္စည်းများ ထည့်သွင်း၍မရပါ"))
                            .finally(() => setSeeding(false));
                        }}
                        className="flex w-full items-center gap-1.5 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-accent disabled:opacity-50"
                      >
                        <PackagePlus className="h-3.5 w-3.5" />
                        {seeding ? "ထည့်သွင်းနေသည်..." : "ဥပမာကုန်ပစ္စည်းထည့်မည်"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* New Product Button */}
          {!isBranchDevice && (
            <Button
              type="button"
              size="sm"
              onClick={() => setEditing("new")}
              aria-label="ကုန်ပစ္စည်းသစ် ထည့်ရန်"
              className="h-9 shrink-0 gap-1 rounded-md text-xs font-semibold"
            >
              <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">ကုန်ပစ္စည်းသစ်</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="h-[calc(100dvh-var(--pos-chrome,64px))] overflow-y-auto overscroll-contain bg-muted/20">
        <div className="space-y-4 p-3 md:p-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">ပစ္စည်း စုစုပေါင်း</p>
              <p className="mt-1 text-lg font-bold text-foreground">{metrics.totalItems}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">လက်ကျန်ရှိ</p>
              <p className="mt-1 text-lg font-bold text-foreground">{metrics.inStock}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">လက်ကျန်နည်း</p>
              <p className="mt-1 text-lg font-bold text-foreground">{metrics.lowStock}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">ပစ္စည်းပြတ်</p>
              <p className="mt-1 text-lg font-bold text-foreground">{metrics.outStock}</p>
            </div>
            {!isBranchDevice && (
              <>
                <div className="col-span-2 rounded-lg border border-border bg-card p-3 shadow-xs sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-medium text-muted-foreground">ခန့်မှန်းရောင်းတန်ဖိုး</p>
                  <p className="mt-1 truncate text-base font-bold text-foreground">{fmt(metrics.totalRetailValuation)}</p>
                </div>
                <div className="col-span-2 rounded-lg border border-border bg-card p-3 shadow-xs sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-medium text-muted-foreground">ဝယ်ရင်းတန်ဖိုး</p>
                  <p className="mt-1 truncate text-base font-bold text-foreground">{fmt(metrics.totalCostValuation)}</p>
                </div>
              </>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 shadow-xs">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { key: "all", label: "အားလုံး" },
                  { key: "in_stock", label: "လက်ကျန်ရှိ" },
                  { key: "low", label: "လက်ကျန်နည်း" },
                  { key: "out", label: "ပစ္စည်းပြတ်" },
                ] as { key: Filter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === tab.key
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">အမျိုးအစား:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">အားလုံး ({items.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Product Cards (< md) */}
          <div className="block divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card md:hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                ကိုက်ညီသော ကုန်ပစ္စည်း မတွေ့ရှိပါ
              </div>
            ) : (
              filtered.map((item) => {
                const qty = Number(item.stock_quantity) || 0;
                const min = Number(item.min_stock_threshold) || 0;
                const status = qty <= 0 ? "out" : qty <= min ? "low" : "ok";

                return (
                  <div key={item.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{item.sku || "—"}</span>
                          <span>·</span>
                          <span>{item.category || "အထွေထွေ"}</span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          status === "out"
                            ? "bg-destructive/10 text-destructive"
                            : status === "low"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {status === "out" ? "ပြတ်" : status === "low" ? "နည်း" : "ရှိ"} ({item.stock_quantity})
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">ရောင်းဈေး: </span>
                        <span className="font-semibold">{fmt(item.price)}</span>
                      </div>
                      {!isBranchDevice && (
                        <div>
                          <span className="text-muted-foreground">ဝယ်ရင်း: </span>
                          <span>{fmt(item.cost_price || 0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border/40 pt-2">
                      <button
                        type="button"
                        onClick={() => setLabelItem(item)}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        လေဘယ်
                      </button>
                      {!isBranchDevice && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAdjustingItem(item)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            လက်ကျန်ချိန်ရန်
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(item)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            ပြင်ဆင်ရန်
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                          >
                            ဖျက်ရန်
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Product Table (>= md) */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-xs md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">ကုန်ပစ္စည်း</th>
                    <th className="px-3 py-3">အမျိုးအစား</th>
                    <th className="px-3 py-3 text-right">ရောင်းဈေး</th>
                    {!isBranchDevice && <th className="px-3 py-3 text-right">ဝယ်ရင်းဈေး</th>}
                    <th className="px-3 py-3 text-right">လက်ကျန်</th>
                    <th className="px-3 py-3 text-center">အခြေအနေ</th>
                    <th className="px-4 py-3 text-right">လုပ်ဆောင်ချက်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isBranchDevice ? 6 : 7} className="px-4 py-8 text-center text-muted-foreground">
                        ကိုက်ညီသော ကုန်ပစ္စည်း မတွေ့ရှိပါ
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const qty = Number(item.stock_quantity) || 0;
                      const min = Number(item.min_stock_threshold) || 0;
                      const status = qty <= 0 ? "out" : qty <= min ? "low" : "ok";

                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{item.sku || "—"}</p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {item.category || "အထွေထွေ"}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-foreground">
                            {fmt(item.price)}
                          </td>
                          {!isBranchDevice && (
                            <td className="px-3 py-3 text-right text-muted-foreground">
                              {fmt(item.cost_price || 0)}
                            </td>
                          )}
                          <td className="px-3 py-3 text-right font-mono font-medium">
                            {item.stock_quantity}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={cn(
                                "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                status === "out"
                                  ? "bg-destructive/10 text-destructive"
                                  : status === "low"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              )}
                            >
                              {status === "out" ? "ပြတ်" : status === "low" ? "နည်း" : "ရှိ"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setLabelItem(item)}
                                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                              >
                                လေဘယ်
                              </button>
                              {!isBranchDevice && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setAdjustingItem(item)}
                                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                  >
                                    လက်ကျန်ချိန်ရန်
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditing(item)}
                                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                  >
                                    ပြင်ဆင်ရန်
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editing && (
        <ProductModal
          item={editing === "new" ? null : editing}
          existingCategories={categories}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await saveItem(values);
            setEditing(null);
            toast.success("ကုန်ပစ္စည်း သိမ်းဆည်းပြီးပါပြီ");
          }}
        />
      )}

      {adjustingItem && (
        <StockAdjustmentModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onAdjust={async (newQty, reason, note) => {
            if (adjustStock) {
              await adjustStock({
                itemId: adjustingItem.id,
                newQuantity: newQty,
                reason,
                note,
              });
            } else {
              await saveItem({
                ...adjustingItem,
                stock_quantity: newQty,
              });
            }
            setAdjustingItem(null);
            toast.success("လက်ကျန်စာရင်း ချိန်ညှိပြီးပါပြီ");
          }}
        />
      )}

      {labelItem && <LabelModal item={labelItem} onClose={() => setLabelItem(null)} />}

      {importOpen && (
        <ImportModal
          items={items}
          isPro={isPro}
          onClose={() => setImportOpen(false)}
          onImport={async (rows) => {
            let created = 0;
            let updated = 0;
            const skuMap = new Map(items.map((i) => [i.sku, i]));

            for (const r of rows) {
              const existing = skuMap.get(r.sku);
              if (existing) {
                await saveItem({
                  ...existing,
                  name: r.name,
                  price: r.price,
                  cost_price: r.cost_price,
                  category: r.category || existing.category,
                });
                updated++;
              } else {
                await saveItem({
                  sku: r.sku || generateSku(),
                  name: r.name,
                  price: r.price,
                  cost_price: r.cost_price,
                  stock_quantity: r.stock_quantity,
                  min_stock_threshold: r.min_stock_threshold || 5,
                  category: r.category || "အထွေထွေ",
                });
                created++;
              }
            }
            return { created, updated };
          }}
        />
      )}
    </PosShell>
  );
}

// Product Create/Edit Modal with Grouped Sections & Live Margin
function ProductModal({
  item,
  existingCategories,
  onClose,
  onSave,
}: {
  item: CachedItem | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: (values: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    min_stock_threshold: number;
    category?: string;
    barcode?: string | null;
    qr_value?: string | null;
    image_url?: string | null;
    units?: { unit_name: string; conversion: number; price: number; is_default?: boolean }[];
  }) => Promise<void>;
}) {
  const { store } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewSrc = useCachedImage(imageUrl);

  const [form, setForm] = useState(
    item
      ? {
          sku: item.sku,
          name: item.name,
          price: String(item.price),
          cost_price: String(item.cost_price ?? 0),
          stock_quantity: String(item.stock_quantity),
          min_stock_threshold: String(item.min_stock_threshold),
          category: item.category || "အထွေထွေ",
          barcode: item.barcode ?? "",
          qr_value: item.qr_value ?? "",
        }
      : { ...EMPTY_ITEM, sku: generateSku() },
  );

  const [units, setUnits] = useState<
    { unit_name: string; conversion: string; price: string; is_default: boolean }[]
  >(
    item?.units?.length
      ? item.units.map((u) => ({
          unit_name: u.unit_name,
          conversion: String(u.conversion),
          price: String(u.price),
          is_default: Boolean(u.is_default),
        }))
      : [],
  );

  const [busy, setBusy] = useState(false);

  // Derived Gross Profit & Margin
  const sellPriceNum = Number(form.price) || 0;
  const costPriceNum = Number(form.cost_price) || 0;
  const grossProfit = sellPriceNum - costPriceNum;
  const grossMarginPct = sellPriceNum > 0 ? (grossProfit / sellPriceNum) * 100 : 0;

  const handleImagePick = async (file: File) => {
    if (!store) {
      toast.error("ဆိုင်အကောင့် မတွေ့ပါ");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadItemImage(file, store.id);
      setImageUrl(url);
      toast.success("ဓာတ်ပုံ တင်ပြီးပါပြီ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ဓာတ်ပုံ တင်၍မရပါ");
    } finally {
      setUploading(false);
    }
  };

  const addUnitRow = () => {
    setUnits((prev) => [
      ...prev,
      { unit_name: "", conversion: "1", price: form.price || "0", is_default: false },
    ]);
  };

  const removeUnitRow = (idx: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateUnit = (
    idx: number,
    field: "unit_name" | "conversion" | "price" | "is_default",
    val: string | boolean,
  ) => {
    setUnits((prev) =>
      prev.map((u, i) => {
        if (i !== idx) {
          if (field === "is_default" && val === true) return { ...u, is_default: false };
          return u;
        }
        return { ...u, [field]: val };
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold">
            {item ? "ကုန်ပစ္စည်း အချက်အလက် ပြင်ဆင်ရန်" : "ကုန်ပစ္စည်း အသစ် ထည့်ရန်"}
          </h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Photo & Basic Details */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40">
              {previewSrc ? (
                <img src={previewSrc} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImagePick(f);
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  {imageUrl ? "ဓာတ်ပုံ ပြောင်းရန်" : "ဓာတ်ပုံ ထည့်ရန်"}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    ဖျက်ရန်
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group A: Basic Information */}
          <div className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/10">
            <p className="text-xs font-semibold text-foreground">အခြေခံ အချက်အလက်များ</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">ကုန်ပစ္စည်း အမည် *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ဥပမာ - ရွှေဖလား လက်ဖက်ရည်"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">SKU (ကုဒ်)</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">အမျိုးအစား (Category)</label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="ဥပမာ - အချိုရည်"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <datalist id="category-suggestions">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Barcode (ဘားကုဒ်)</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="ဘားကုဒ် ရိုက်ထည့်ပါ"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">QR Value</label>
                <input
                  type="text"
                  value={form.qr_value}
                  onChange={(e) => setForm({ ...form, qr_value: e.target.value })}
                  placeholder="QR တန်ဖိုး"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Group B: Pricing & Margins */}
          <div className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/10">
            <p className="text-xs font-semibold text-foreground">ဈေးနှုန်းနှင့် အမြတ်သတ်မှတ်ခြင်း</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">ရောင်းဈေး (Selling Price) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">ဝယ်ရင်းဈေး (Cost Price)</label>
                <input
                  type="number"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {sellPriceNum > 0 && (
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                <div>
                  <span className="text-muted-foreground">အမြတ်ငွေ: </span>
                  <span className={cn("font-bold", grossProfit >= 0 ? "text-emerald-600" : "text-destructive")}>
                    {grossProfit.toLocaleString()} ကျပ်
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">အမြတ်ရာခိုင်နှုန်း: </span>
                  <span className={cn("font-bold", grossMarginPct >= 0 ? "text-emerald-600" : "text-destructive")}>
                    {grossMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Group C: Units & Packaging */}
          <div className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">ထုပ်ပိုးမှုယူနစ်များ (Packaging Units)</p>
              <button
                type="button"
                onClick={addUnitRow}
                className="text-xs font-medium text-primary hover:underline"
              >
                + ယူနစ်ထည့်ရန်
              </button>
            </div>
            {units.length === 0 ? (
              <p className="text-xs text-muted-foreground">အခြေခံယူနစ်ဖြင့်သာ သတ်မှတ်ထားပါသည်</p>
            ) : (
              <div className="space-y-2">
                {units.map((u, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ယူနစ်အမည် (ဥပမာ - ကတ်တွန်)"
                      value={u.unit_name}
                      onChange={(e) => updateUnit(idx, "unit_name", e.target.value)}
                      className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="အချိုး"
                      value={u.conversion}
                      onChange={(e) => updateUnit(idx, "conversion", e.target.value)}
                      className="h-8 w-16 rounded border border-input bg-background px-2 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="ရောင်းဈေး"
                      value={u.price}
                      onChange={(e) => updateUnit(idx, "price", e.target.value)}
                      className="h-8 w-24 rounded border border-input bg-background px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeUnitRow(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group D & E: Stock Control */}
          <div className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/10">
            <p className="text-xs font-semibold text-foreground">လက်ကျန်နှင့် အနိမ့်ဆုံးသတိပေးချက်</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  {item ? "လက်ရှိလက်ကျန် (အပြောင်းအလဲမပြုလုပ်နိုင်ပါ)" : "အစပျိုးလက်ကျန် (Opening Stock)"}
                </label>
                <input
                  type="number"
                  disabled={Boolean(item)}
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring disabled:bg-muted/50"
                />
                {item && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    လက်ကျန်ပြင်ရန် ပင်မစာရင်းရှိ "လက်ကျန်ချိန်ရန်" ကို နှိပ်ပါ
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">အနိမ့်ဆုံး သတိပေးလက်ကျန်</label>
                <input
                  type="number"
                  value={form.min_stock_threshold}
                  onChange={(e) => setForm({ ...form, min_stock_threshold: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            မလုပ်တော့ပါ
          </Button>
          <Button
            size="sm"
            disabled={busy || !form.name.trim() || !form.price}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  ...(item ? { id: item.id } : {}),
                  sku: form.sku.trim() || generateSku(),
                  name: form.name.trim(),
                  price: Number(form.price),
                  cost_price: Number(form.cost_price) || 0,
                  stock_quantity: Number(form.stock_quantity) || 0,
                  min_stock_threshold: Number(form.min_stock_threshold) || 5,
                  category: form.category.trim() || "အထွေထွေ",
                  barcode: form.barcode.trim() || null,
                  qr_value: form.qr_value.trim() || null,
                  image_url: imageUrl,
                  units: units
                    .filter((u) => u.unit_name.trim() && Number(u.conversion) > 0)
                    .map((u) => ({
                      unit_name: u.unit_name.trim(),
                      conversion: Number(u.conversion),
                      price: Number(u.price),
                      is_default: u.is_default,
                    })),
                });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "သိမ်းဆည်း၍မရပါ");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "သိမ်းဆည်းနေသည်..." : "သိမ်းဆည်းမည်"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Dedicated Stock Adjustment Modal with Reasons
function StockAdjustmentModal({
  item,
  onClose,
  onAdjust,
}: {
  item: CachedItem;
  onClose: () => void;
  onAdjust: (newQty: number, reason: string, note?: string) => Promise<void>;
}) {
  const [newQuantity, setNewQuantity] = useState(String(item.stock_quantity));
  const [reason, setReason] = useState("စာရင်းစစ် ပြင်ဆင်ခြင်း");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const delta = (Number(newQuantity) || 0) - (Number(item.stock_quantity) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold">လက်ကျန်စာရင်း ချိန်ညှိခြင်း</h2>
            <p className="text-xs text-muted-foreground">{item.name} ({item.sku})</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">လက်ရှိ စနစ်တွင်းလက်ကျန်:</span>
            <span className="font-bold text-foreground font-mono">{item.stock_quantity}</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">အမှန်တကယ်ရှိသော လက်ကျန်အရေအတွက် *</label>
            <input
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs">
              ကွာခြားချက် (Delta):{" "}
              <span className={cn("font-bold font-mono", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">ချိန်ညှိရသည့် အကြောင်းပြချက် *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="စာရင်းစစ် ပြင်ဆင်ခြင်း">စာရင်းစစ် ပြင်ဆင်ခြင်း (Stock Count Correction)</option>
              <option value="ပျက်စီးဆုံးရှုံးခြင်း">ပျက်စီးဆုံးရှုံးခြင်း (Damaged Stock)</option>
              <option value="ပျောက်ဆုံးခြင်း">ပျောက်ဆုံးခြင်း (Lost / Missing)</option>
              <option value="လက်ကျန်ဖွင့်လှစ်ခြင်း">လက်ကျန်ဖွင့်လှစ်ခြင်း (Opening Balance)</option>
              <option value="အခြား">အခြား (Other)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">မှတ်ချက် (ရွေးချယ်ရန်)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="အသေးစိတ်မှတ်ချက် ရေးသွင်းပါ"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            မလုပ်တော့ပါ
          </Button>
          <Button
            size="sm"
            disabled={busy || newQuantity === "" || Number(newQuantity) < 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onAdjust(Number(newQuantity), reason, note.trim() || undefined);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "ချိန်ညှိ၍မရပါ");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "ချိန်ညှိနေသည်..." : "အတည်ပြုမည်"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Review-first CSV Import Modal
function ImportModal({
  items,
  isPro,
  onClose,
  onImport,
}: {
  items: CachedItem[];
  isPro: boolean;
  onClose: () => void;
  onImport: (rows: ParsedItemRow[]) => Promise<{ created: number; updated: number }>;
}) {
  const [rows, setRows] = useState<ParsedItemRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseItemsCsv(text, items.map((item) => item.sku));
      setRows(parsed.rows);
      setErrors(parsed.errors || []);
    } catch {
      toast.error("CSV ဖိုင် ဖတ်၍မရပါ");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold">CSV ဖြင့် ကုန်ပစ္စည်းများ ထည့်သွင်းရန်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="rounded-md border border-dashed border-border p-4 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              className="text-xs"
            />
          </div>

          {errors.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive">
              <p className="font-semibold">သတိပေးချက်များ:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-emerald-600">✓ ကုန်ပစ္စည်း {rows.length} မျိုး စစ်ဆေးတွေ့ရှိပါသည်</p>
                <button
                  type="button"
                  onClick={() => downloadCsv("sample-items.csv", SAMPLE_CSV_ROWS)}
                  className="text-primary hover:underline"
                >
                  နမူနာ CSV ရယူရန်
                </button>
              </div>

              {/* Preview Table */}
              <div className="max-h-56 overflow-auto rounded border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/40 font-semibold text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5">SKU</th>
                      <th className="px-2 py-1.5">အမည်</th>
                      <th className="px-2 py-1.5 text-right">ရောင်းဈေး</th>
                      <th className="px-2 py-1.5 text-right">ဝယ်ရင်းဈေး</th>
                      <th className="px-2 py-1.5 text-right">လက်ကျန်</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 font-mono">{r.sku}</td>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1 text-right">{r.price}</td>
                        <td className="px-2 py-1 text-right">{r.cost_price}</td>
                        <td className="px-2 py-1 text-right font-mono">{r.stock_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-center">... အခြား {rows.length - 10} မျိုး ပါဝင်ပါသည်</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            မလုပ်တော့ပါ
          </Button>
          <Button
            size="sm"
            disabled={busy || rows.length === 0}
            onClick={async () => {
              if (!isPro && items.length + rows.length > FREE_LIMITS.items) {
                toast.error(`Standard အစီအစဉ်တွင် ပစ္စည်း ${FREE_LIMITS.items} သာ ထည့်သွင်းနိုင်ပါသည်`);
                return;
              }
              setBusy(true);
              try {
                const res = await onImport(rows);
                toast.success(`အသစ် ${res.created} မျိုး၊ ပြင်ဆင်မှု ${res.updated} မျိုး ထည့်သွင်းပြီးပါပြီ`);
                onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "ထည့်သွင်း၍မရပါ");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "ထည့်သွင်းနေသည်..." : `အတည်ပြုထည့်မည် (${rows.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Label Printing Modal
function LabelModal({ item, onClose }: { item: CachedItem; onClose: () => void }) {
  const [mode, setMode] = useState<"barcode" | "qr">("barcode");
  const [count, setCount] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  const codeValue = (mode === "barcode" ? item.barcode || item.sku : item.qr_value || item.sku).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold">လေဘယ် ထုတ်ယူရန်</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("barcode")}
              className={cn(
                "flex-1 rounded py-1.5 font-medium border text-center transition-colors",
                mode === "barcode" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
              )}
            >
              Barcode
            </button>
            <button
              type="button"
              onClick={() => setMode("qr")}
              className={cn(
                "flex-1 rounded py-1.5 font-medium border text-center transition-colors",
                mode === "qr" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
              )}
            >
              QR Code
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">အရေအတွက်:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              className="h-8 w-20 rounded border border-input bg-background px-2 text-right font-mono text-xs"
            />
          </div>

          {/* Label Preview */}
          <div ref={printRef} className="rounded border border-border bg-white p-4 text-black text-center space-y-2">
            <p className="font-bold text-sm truncate">{item.name}</p>
            <div className="flex justify-center my-2">
              <Suspense fallback={<div className="h-12 w-32 animate-pulse bg-gray-200" />}>
                {mode === "barcode" ? (
                  <Barcode value={codeValue} width={1.4} height={40} fontSize={10} />
                ) : (
                  <QRCodeCanvas value={codeValue} size={90} />
                )}
              </Suspense>
            </div>
            <p className="font-bold text-xs">{money(item.price)} ကျပ်</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            ပိတ်မည်
          </Button>
          <Button
            size="sm"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print ထုတ်မည်
          </Button>
        </div>
      </div>
    </div>
  );
}
