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
  Trash2,
  X,
  ImagePlus,
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
        content:
          "ကုန်ပစ္စည်းများ၊ လက်ကျန်ပမာဏနှင့် အနည်းဆုံးလက်ကျန်သတ်မှတ်ချက်များကို စီမံခန့်ခွဲပြီး ၂x၁ လက်မ QR လေဘယ်များကို ရိုက်နှိပ်ပါ။",
      },
      { property: "og:title", content: "ကုန်ပစ္စည်းစာရင်းနှင့် လေဘယ်များ — Counter Point of Sale" },
      {
        property: "og:description",
        content: "QR လေဘယ်ထုတ်လုပ်ခြင်းနှင့် ပရင်ထုတ်ခြင်းဆိုင်ရာ ကုန်ပစ္စည်း ကတ်တလောက် စီမံခန့်ခွဲမှု။",
      },
    ],
  }),
  component: InventoryPage,
});

type Filter = "all" | "low" | "out";

const EMPTY = {
  sku: "",
  name: "",
  price: "",
  cost_price: "",
  stock_quantity: "",
  min_stock_threshold: "5",
  barcode: "",
  qr_value: "",
};

function InventoryPage() {
  const { items, saveItem, deleteItem, seedDemoItems } = usePos();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<CachedItem | "new" | null>(null);
  const [labelItem, setLabelItem] = useState<CachedItem | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);
  const { isPro, fmt } = useStoreSettings();
  const { isBranchDevice } = useAuth();

  // ပစ္စည်းစုစုပေါင်းတန်ဖိုး တွက်ချက်ခြင်း
  const totalStockValuation = useMemo(() => {
    return items.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.stock_quantity) || 0),
      0,
    );
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matches =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);
      const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
      const passes =
        filter === "all" || (filter === "out" ? status === "out" : status !== "ok");
      return matches && passes;
    });
  }, [items, query, filter]);

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      toast.success("ကုန်ပစ္စည်း ဖျက်ပြီးပါပြီ");
    } catch {
      toast.error("ရောင်းချထားသော မှတ်တမ်းရှိသည့် ကုန်ပစ္စည်းကို ဖျက်၍မရပါ");
    }
  };

  return (
    <PosShell
      title="ကုန်ပစ္စည်းစာရင်း"
      subtitle={
        isBranchDevice
          ? `ဆိုင်ခွဲ လက်ကျန်စာရင်း · ${items.length} မျိုး`
          : `စုစုပေါင်း ${items.length} မျိုး · တန်ဖိုး ${fmt(totalStockValuation)}`
      }
      actions={
        <div className="flex items-center gap-2">
          {/* 1. Search Box */}
          <div className="relative w-36 sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ရှာဖွေရန်..."
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* 2. Stock Filter Controls (Desktop/Tablet) */}
          <div className="hidden items-center rounded-md border border-border bg-background p-0.5 sm:flex">
            {(["all", "low", "out"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "အားလုံး" : f === "low" ? "လက်ကျန်နည်း" : "ပစ္စည်းပြတ်"}
              </button>
            ))}
          </div>

          {/* 3. Actions Menu */}
          <div className="relative">
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

          {/* ဆိုင်ခွဲစက်မဟုတ်သော Owner သာ ပစ္စည်းသစ် ထည့်သွင်းခွင့်ရှိမည် */}
          {!isBranchDevice && (
            <Button
              type="button"
              size="sm"
              onClick={() => setEditing("new")}
              className="h-9 gap-1 rounded-md text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> ကုန်ပစ္စည်းသစ်
            </Button>
          )}
        </div>
      }
    >
      <div className="h-[calc(100vh-64px)] overflow-y-auto bg-muted/20">
        {/* Mobile View: အလျားလိုက် Scroll လုပ်စရာမလိုသော Responsive Cards ပုံစံ */}
        <div className="block divide-y divide-border/60 bg-card md:hidden">
          {filtered.map((item) => {
            const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
            return (
              <div key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {item.sku || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold",
                      status === "ok" && "bg-success-soft text-success",
                      status === "low" && "bg-warning-soft text-warning",
                      status === "out" && "bg-danger-soft text-destructive",
                    )}
                  >
                    {status === "ok"
                      ? "ပစ္စည်းရှိ"
                      : status === "low"
                        ? "လက်ကျန်နည်း"
                        : "ပစ္စည်းပြတ်"}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">ဈေးနှုန်း: </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {money(item.price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">လက်ကျန်: </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {item.stock_quantity ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLabelItem(item)}
                      aria-label={`${item.name} အတွက် QR ထုတ်ရန်`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    {!isBranchDevice && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          aria-label={`${item.name} ကိုပြင်ဆင်ရန်`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          aria-label={`${item.name} ကိုဖျက်ရန်`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Grid Table (Desktop မျက်နှာပြင်တွင်သာ ပြသမည့် ဇယား) */}
        <div className="hidden min-w-[680px] md:block">
          {/* Sticky Column Header */}
          <div className="sticky top-0 z-10 grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] items-center border-b border-border bg-card/95 px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
            <span>ကုန်ပစ္စည်း</span>
            <span>အမျိုးအစား / SKU</span>
            <span>ဈေးနှုန်း</span>
            <span>အရေအတွက်</span>
            <span>အခြေအနေ</span>
            <span className="text-right">လုပ်ဆောင်ချက်များ</span>
          </div>

          {/* Product Rows */}
          <div className="divide-y divide-border/60 bg-card">
            {filtered.map((item) => {
              const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] items-center px-4 py-3 text-xs hover:bg-accent/40"
                >
                  <span className="truncate font-semibold text-foreground">{item.name}</span>
                  <span className="truncate font-mono text-muted-foreground">
                    {item.sku || "—"}
                  </span>
                  <span className="font-medium tabular-nums">{money(item.price)}</span>
                  <span className="font-bold tabular-nums">{item.stock_quantity ?? 0}</span>
                  <span>
                    <span
                      className={cn(
                        "rounded-sm px-2 py-0.5 text-[11px] font-semibold",
                        status === "ok" && "bg-success-soft text-success",
                        status === "low" && "bg-warning-soft text-warning",
                        status === "out" && "bg-danger-soft text-destructive",
                      )}
                    >
                      {status === "ok"
                        ? "ပစ္စည်းရှိသည်"
                        : status === "low"
                          ? "လက်ကျန်နည်း"
                          : "ပစ္စည်းပြတ်"}
                    </span>
                  </span>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setLabelItem(item)}
                      aria-label={`${item.name} အတွက် QR ထုတ်ရန်`}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    {!isBranchDevice && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          aria-label={`${item.name} ကိုပြင်ဆင်ရန်`}
                          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          aria-label={`${item.name} ကိုဖျက်ရန်`}
                          className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="bg-card px-4 py-12 text-center text-xs text-muted-foreground">
            {items.length === 0 ? (
              <div className="space-y-2">
                <p>ကုန်ပစ္စည်း မရှိသေးပါ။</p>
                {!isBranchDevice && (
                  <p>"ကုန်ပစ္စည်းသစ်" ခလုတ် သို့မဟုတ် "လုပ်ဆောင်ချက်များ" မှ ထည့်သွင်းနိုင်ပါသည်။</p>
                )}
              </div>
            ) : (
              "ကုန်ပစ္စည်း ရှာမတွေ့ပါ။"
            )}
          </div>
        )}
      </div>

      {editing && (
        <ProductModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (!isPro && editing === "new" && items.length >= FREE_LIMITS.items) {
              toast.error(
                `Standard အစီအစဉ်တွင် ကုန်ပစ္စည်း ${FREE_LIMITS.items} မျိုးသာ ထည့်နိုင်သည်။ Pro သို့ အဆင့်မြှင့်ပါ။`,
              );
              return;
            }
            try {
              await saveItem({
                ...values,
                sku: values.sku.trim() || generateSku(items.map((i) => i.sku)),
              });
              toast.success("ကုန်ပစ္စည်း သိမ်းဆည်းပြီးပါပြီ");
              setEditing(null);
            } catch {
              toast.error("သိမ်းဆည်း၍ မရပါ — SKU နံပါတ် အသုံးပြုပြီးသား ဖြစ်နိုင်ပါသည်");
            }
          }}
        />
      )}

      {importOpen && (
        <ImportModal
          items={items}
          isPro={isPro}
          onClose={() => setImportOpen(false)}
          onImport={async (rows) => {
            const bySku = new Map(items.map((i) => [i.sku, i]));
            let created = 0;
            let updated = 0;
            for (const row of rows) {
              const existing = bySku.get(row.sku);
              await saveItem({
                ...(existing ? { id: existing.id } : {}),
                sku: row.sku,
                name: row.name,
                price: row.price,
                cost_price: row.cost_price,
                stock_quantity: row.stock_quantity,
                min_stock_threshold: existing?.min_stock_threshold ?? 5,
                ...(row.category ? { category: row.category } : {}),
              });
              if (existing) updated += 1;
              else created += 1;
            }
            return { created, updated };
          }}
        />
      )}

      {labelItem && <LabelModal item={labelItem} onClose={() => setLabelItem(null)} />}
    </PosShell>
  );
}

function ProductModal({
  item,
  onClose,
  onSave,
}: {
  item: CachedItem | null;
  onClose: () => void;
  onSave: (values: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    min_stock_threshold: number;
    barcode?: string | null;
    qr_value?: string | null;
    image_url?: string | null;
    units?:
      | { unit_name: string; conversion: number; price: number; is_default?: boolean }[]
      | undefined;
  }) => Promise<void>;
}) {
  const { isPro } = useStoreSettings();
  const { store } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewSrc = useCachedImage(imageUrl);
  const [form, setForm] = useState<typeof EMPTY>(
    item
      ? {
          sku: item.sku,
          name: item.name,
          price: String(item.price),
          cost_price: String(item.cost_price ?? 0),
          stock_quantity: String(item.stock_quantity),
          min_stock_threshold: String(item.min_stock_threshold),
          barcode: item.barcode ?? "",
          qr_value: item.qr_value ?? "",
        }
      : EMPTY,
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
      const msg = e instanceof Error ? e.message : "ဓာတ်ပုံ တင်၍မရပါ";
      toast.error(msg);
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
          if (field === "is_default" && val === true) {
            return { ...u, is_default: false };
          }
          return u;
        }
        return { ...u, [field]: val };
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {item ? "ကုန်ပစ္စည်း ပြင်ဆင်ရန်" : "ကုန်ပစ္စည်း အသစ်"}
          </h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Photo Section */}
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

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-name">
              အမည် *
            </label>
            <input
              id="p-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-price">
                ရောင်းဈေး *
              </label>
              <input
                id="p-price"
                type="number"
                min="0"
                step="any"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-cost">
                ဝယ်ဈေး
              </label>
              <input
                id="p-cost"
                type="number"
                min="0"
                step="any"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-qty">
                အရေအတွက်
              </label>
              <input
                id="p-qty"
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-min">
                အနည်းဆုံး သတ်မှတ်ချက်
              </label>
              <input
                id="p-min"
                type="number"
                min="0"
                value={form.min_stock_threshold}
                onChange={(e) => setForm({ ...form, min_stock_threshold: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-sku">
                SKU (ကုဒ်)
              </label>
              <input
                id="p-sku"
                placeholder="အလိုအလျောက် သတ်မှတ်မည်"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="p-barcode">
                ဘားကုဒ် (Barcode)
              </label>
              <input
                id="p-barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Multi-unit Packaging (Pro) */}
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">ယူနစ် / ထုပ်ပိုးမှု</span>
              <button
                type="button"
                onClick={addUnitRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> ယူနစ်ထည့်ရန်
              </button>
            </div>
            {units.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-2 text-xs">
                {units.map((u, i) => (
                  <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-1.5">
                    <input
                      placeholder="ယူနစ်အမည် (ဥပမာ- ဖာ)"
                      value={u.unit_name}
                      onChange={(e) => updateUnit(i, "unit_name", e.target.value)}
                      className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="ပါဝင်မှု"
                      value={u.conversion}
                      onChange={(e) => updateUnit(i, "conversion", e.target.value)}
                      className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="ဈေးနှုန်း"
                      value={u.price}
                      onChange={(e) => updateUnit(i, "price", e.target.value)}
                      className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeUnitRow(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          disabled={busy || !form.name.trim() || Number(form.price) < 0}
          onClick={() => {
            setBusy(true);
            void onSave({
              ...(item ? { id: item.id } : {}),
              name: form.name.trim(),
              price: Number(form.price) || 0,
              cost_price: Number(form.cost_price) || 0,
              stock_quantity: Number(form.stock_quantity) || 0,
              min_stock_threshold: Number(form.min_stock_threshold) || 5,
              sku: form.sku,
              barcode: form.barcode.trim() || null,
              qr_value: form.qr_value.trim() || null,
              image_url: imageUrl,
              units: units
                .filter((u) => u.unit_name.trim())
                .map((u) => ({
                  unit_name: u.unit_name.trim(),
                  conversion: Number(u.conversion) || 1,
                  price: Number(u.price) || 0,
                  is_default: u.is_default,
                })),
            }).finally(() => setBusy(false));
          }}
          className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          သိမ်းဆည်းမည်
        </button>
      </div>
    </div>
  );
}

function LabelModal({ item, onClose }: { item: CachedItem; onClose: () => void }) {
  const [format, setFormat] = useState<"qr" | "barcode">("qr");
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;
    const w = window.open("", "_blank", "width=400,height=400");
    if (!w) {
      toast.error("Popup ပွင့်ရန် ခွင့်ပြုပါ");
      return;
    }
    w.document.write(`
      <html>
        <head>
          <title>${item.name} Label</title>
          <style>
            @page { size: 2in 1in; margin: 0; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">လေဘယ် ရိုက်နှိပ်ရန်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex rounded-md border border-border p-0.5">
          <button
            onClick={() => setFormat("qr")}
            className={cn(
              "flex-1 rounded-sm py-1 text-xs font-medium",
              format === "qr" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            QR Code
          </button>
          <button
            onClick={() => setFormat("barcode")}
            className={cn(
              "flex-1 rounded-sm py-1 text-xs font-medium",
              format === "barcode" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Barcode
          </button>
        </div>

        <div
          ref={printAreaRef}
          className="mx-auto flex h-32 w-56 flex-col items-center justify-center rounded-md border border-dashed border-border bg-white p-2 text-black"
        >
          <p className="max-w-full truncate text-center text-xs font-bold">{item.name}</p>
          <div className="my-1">
            <Suspense fallback={<div className="h-14 w-14 animate-pulse bg-gray-200" />}>
              {format === "qr" ? (
                <QRCodeCanvas value={item.qr_value || item.sku} size={64} />
              ) : (
                <Barcode value={item.barcode || item.sku} width={1.2} height={30} fontSize={10} />
              )}
            </Suspense>
          </div>
          <p className="text-[11px] font-semibold">{money(item.price)}</p>
        </div>

        <button
          onClick={handlePrint}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="h-4 w-4" /> လေဘယ် ပရင့်ထုတ်မည်
        </button>
      </div>
    </div>
  );
}

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
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseItemsCsv(text, items.map((item) => item.sku));
      setRows(parsed.rows);
      if (parsed.errors.length > 0) toast.error(parsed.errors.join("\n"));
    } catch {
      toast.error("CSV ဖိုင် ဖတ်၍မရပါ");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">CSV ဖြင့် ကုန်ပစ္စည်းများ ထည့်သွင်းရန်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
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

          {rows.length > 0 && (
            <p className="font-medium text-success">
              ✓ ကုန်ပစ္စည်း {rows.length} မျိုး တွေ့ရှိပါသည်
            </p>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() =>
                downloadCsv("sample-items.csv", SAMPLE_CSV_ROWS)
              }
              className="text-primary hover:underline"
            >
              နမူနာ CSV ရယူရန်
            </button>
          </div>
        </div>

        <button
          disabled={busy || rows.length === 0}
          onClick={() => {
            if (!isPro && items.length + rows.length > FREE_LIMITS.items) {
              toast.error(
                `Standard အစီအစဉ်တွင် ပစ္စည်း ${FREE_LIMITS.items} သာ ထည့်သွင်းနိုင်ပါသည်။`,
              );
              return;
            }
            setBusy(true);
            void onImport(rows)
              .then(({ created, updated }) => {
                toast.success(`အသစ် ${created} မျိုး၊ အဟောင်းပြင်ဆင် ${updated} မျိုး ထည့်ပြီးပါပြီ`);
                onClose();
              })
              .catch(() => toast.error("ထည့်သွင်း၍ မရပါ"))
              .finally(() => setBusy(false));
          }}
          className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          အတည်ပြု ထည့်သွင်းမည်
        </button>
      </div>
    </div>
  );
}
