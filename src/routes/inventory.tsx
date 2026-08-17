import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Barcode as BarcodeIcon,
  Crown,
  Download,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Barcode from "react-barcode";
import { toast } from "sonner";
import { ProBadge } from "@/components/pos/pro-lock";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import { useAuth } from "@/lib/auth-store";
import { usePos } from "@/lib/pos-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { downloadCsv, money, stockStatus } from "@/lib/pos-utils";
import {
  SAMPLE_CSV_ROWS,
  generateSku,
  itemsToCsvRows,
  parseItemsCsv,
  type ParsedItemRow,
} from "@/lib/item-csv";
import type { CachedItem, ItemUnit } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  ssr: false,
  head: () => ({
    meta: [
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
  const { isPro } = useStoreSettings();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matches =
        !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
      const passes =
        filter === "all" || (filter === "out" ? status === "out" : status !== "ok");
      return matches && passes;
    });
  }, [items, query, filter]);

  return (
    <PosShell title="ကုန်ပစ္စည်းစာရင်း">
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ကုန်ပစ္စည်းရှာဖွေရန်"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["all", "low", "out"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-medium capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {f === "all" ? "အားလုံး" : f === "low" ? "လက်ကျန်နည်း" : "ပစ္စည်းပြတ်"}
              </button>
            ))}
          </div>
          <button
            onClick={() => downloadCsv(`items-${new Date().toISOString().slice(0, 10)}.csv`, itemsToCsvRows(items))}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> ကုန်ပစ္စည်းများ ထုတ်ယူမည် (CSV)
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" /> CSV ဖြင့် ထည့်သွင်းမည်
          </button>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" /> ကုန်ပစ္စည်းသစ်ထည့်မည်
          </button>
          {items.length === 0 && (
            <button
              onClick={() => {
                setSeeding(true);
                void seedDemoItems()
                  .then((count) => toast.success(`${count} ကုန်ပစ္စည်း ဥပမာများ ထည့်သွင်းပြီးပါပြီ`))
                  .catch(() => toast.error("ဥပမာကုန်ပစ္စည်းများ ထည့်သွင်း၍မရပါ"))
                  .finally(() => setSeeding(false));
              }}
              disabled={seeding}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {seeding ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ထည့်သွင်းနေသည်
                </span>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4" /> ဥပမာကုန်ပစ္စည်းထည့်မည်
                </>
              )}
            </button>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ကုန်ပစ္စည်း</th>
                <th className="px-4 py-3">အမျိုးအစား</th>
                <th className="px-4 py-3 text-right">စျေးနှုန်း</th>
                <th className="px-4 py-3 text-right">အရေအတွက်</th>
                <th className="px-4 py-3">အခြေအနေ</th>
                <th className="px-4 py-3 text-right">လုပ်ဆောင်ချက်များ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(item.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          status === "ok" &&
                            "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                          status === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                          status === "out" && "bg-destructive/15 text-destructive",
                        )}
                      >
                        {status === "ok" ? "ပစ္စည်းရှိသည်" : status === "low" ? "လက်ကျန်နည်း" : "ပစ္စည်းပြတ်"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setLabelItem(item)}
                          aria-label={`${item.name} အတွက် QR ထုတ်ရန်`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(item)}
                          aria-label={`${item.name} ကိုပြင်ဆင်ရန်`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            void deleteItem(item.id).catch(() =>
                              toast.error("ရောင်းချထားသော မှတ်တမ်းရှိသည့် ကုန်ပစ္စည်းကို ဖျက်၍မရပါ"),
                            );
                          }}
                          aria-label={`${item.name} ကိုဖျက်ရန်`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {items.length === 0 ? (
                      <div className="space-y-2">
                        <p>ကုန်ပစ္စည်း မရှိသေးပါ။</p>
                        <p className="text-xs">"ဥပမာကုန်ပစ္စည်းထည့်မည်" ခလုတ်ကို နှိပ်ပြီး စမ်းသပ်နိုင်ပါသည်။</p>
                      </div>
                    ) : (
                      "ကုန်ပစ္စည်း ရှာမတွေ့ပါ။"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: compact structured cards */}
        <div className="grid gap-3 md:hidden">
          {filtered.map((item) => {
            const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      status === "ok" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                      status === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                      status === "out" && "bg-destructive/15 text-destructive",
                    )}
                  >
                    {status === "ok" ? "ပစ္စည်းရှိသည်" : status === "low" ? "လက်ကျန်နည်း" : "ပစ္စည်းပြတ်"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm tabular-nums">
                    <span className="font-semibold">{money(item.price)}</span>
                    <span className="text-muted-foreground"> · လက်ကျန် {item.stock_quantity} ခု</span>
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setLabelItem(item)}
                      aria-label={`${item.name} အတွက် လေဘယ်ထုတ်ရန်`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border active:scale-95"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditing(item)}
                      aria-label={`${item.name} ကိုပြင်ဆင်ရန်`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border active:scale-95"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        void deleteItem(item.id).catch(() =>
                          toast.error("မှတ်တမ်းရှိသည့် ကုန်ပစ္စည်းကို ဖျက်၍မရပါ(ပြုပြင်ပါ)"),
                        );
                      }}
                      aria-label={`${item.name} ကိုဖျက်ရန်`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              {items.length === 0 ? (
                <div className="space-y-2">
                  <p>ကုန်ပစ္စည်း မရှိသေးပါ။</p>
                  <p className="text-xs">"ဥပမာကုန်ပစ္စည်းထည့်မည်" ခလုတ်ကို နှိပ်ပြီး စမ်းသပ်နိုင်ပါသည်။</p>
                </div>
              ) : (
                "ကုန်ပစ္စည်း ရှာမတွေ့ပါ။"
              )}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <ProductModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (!isPro && editing === "new" && items.length >= FREE_LIMITS.items) {
              toast.error(`Standard အစီအစဉ်တွင် ကုန်ပစ္စည်း ${FREE_LIMITS.items} မျိုးသာ ထည့်နိုင်သည်။ Pro သို့ အဆင့်မြှင့်ပါ။`);
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
    units?: { unit_name: string; conversion: number; price: number; is_default?: boolean }[] | undefined;
  }) => Promise<void>;
}) {
  const { isPro } = useStoreSettings();
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
  const [units, setUnits] = useState<{ unit_name: string; conversion: string; price: string; is_default: boolean }[]>(
    item?.units?.length
      ? item.units.map((u) => ({
          unit_name: u.unit_name,
          conversion: String(u.conversion),
          price: String(u.price),
          is_default: Boolean(u.is_default),
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);

  const field = (key: keyof typeof EMPTY, label: string, type = "text") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{item ? "ကုန်ပစ္စည်း ပြင်ဆင်ရန်" : "ကုန်ပစ္စည်း အသစ်"}</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {field("name", "အမည်")}
          {field("sku", "SKU နံပါတ် (မထည့်လျှင် ၈ လုံး အလိုအလျောက် ထုတ်ပေးမည်)")}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("barcode", "ဘားကုဒ် (မထည့်လျှင် SKU သုံးမည်)")}
            {field("qr_value", "QR တန်ဖိုး (မထည့်လျှင် SKU သုံးမည်)")}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {field("price", "စျေးနှုန်း", "number")}
            {isPro && field("cost_price", "အရင်းစျေး", "number")}
            {field("stock_quantity", "လက်ကျန်", "number")}
            {isPro && field("min_stock_threshold", "သတိပေး ရေတွက်မှု", "number")}
          </div>
          {!isPro && (
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              အရင်းစျေးနှင့် လက်ကျန် သတိပေးချက်များ <ProBadge />
            </p>
          )}

          {isPro ? (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">ထုပ်ပိုးမှု အရွယ်အစား</span>
                <button
                  onClick={() =>
                    setUnits((prev) => [
                      ...prev,
                      { unit_name: "", conversion: "", price: "", is_default: false },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  <Plus className="h-3 w-3" /> အရွယ်အစား ထည့်မည်
                </button>
              </div>
              <div className="space-y-2">
                {units.map((u, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                    <input
                      placeholder="အမည် (ဥပ. ထုပ်)"
                      value={u.unit_name}
                      onChange={(e) =>
                        setUnits((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, unit_name: e.target.value } : x)),
                        )
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="အခြေခံထည့်စဉ်"
                      value={u.conversion}
                      onChange={(e) =>
                        setUnits((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, conversion: e.target.value } : x)),
                        )
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                    />
                    <input
                      type="number"
                      placeholder="စျေးနှုန်း"
                      value={u.price}
                      onChange={(e) =>
                        setUnits((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)),
                        )
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                    />
                    <button
                      onClick={() => setUnits((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="ဖျက်ရန်"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {units.length === 0 && (
                  <p className="text-xs text-muted-foreground">အခြားထုပ်ပိုးမှု အရွယ်အစားများ ထည့်သွင်းနိုင်သည်။</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Crown className="h-4 w-4 text-amber-500" />
              ထုပ်ပိုးမှု အရွယ်အစား စီမံခန့်ခွဲရန် Pro Plan လိုအပ်သည်။
            </div>
          )}
        </div>
        <button
          disabled={saving || !form.name.trim()}
          onClick={() => {
            setSaving(true);
            void onSave({
              ...(item ? { id: item.id } : {}),
              sku: form.sku.trim(),
              name: form.name.trim(),
              price: Number(form.price) || 0,
              cost_price: Number(form.cost_price) || 0,
              stock_quantity: Math.trunc(Number(form.stock_quantity) || 0),
              min_stock_threshold: Math.trunc(Number(form.min_stock_threshold) || 0),
              barcode: form.barcode.trim() || null,
              qr_value: form.qr_value.trim() || null,
              units: isPro
                ? units
                    .filter((u) => u.unit_name.trim() && Number(u.conversion) > 0)
                    .map((u) => ({
                      unit_name: u.unit_name.trim(),
                      conversion: Math.trunc(Number(u.conversion) || 1),
                      price: Number(u.price) || 0,
                      is_default: u.is_default,
                    }))
                : undefined,
            }).finally(() => setSaving(false));
          }}
          className="mt-5 h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "သိမ်းဆည်းနေသည်..." : "ကုန်ပစ္စည်း သိမ်းဆည်းမည်"}
        </button>
      </div>
    </div>
  );
}

function LabelModal({ item, onClose }: { item: CachedItem; onClose: () => void }) {
  const [mode, setMode] = useState<"qr" | "barcode">("qr");
  const [qty, setQty] = useState(10);
  const [size, setSize] = useState<"40x30" | "50x25">("40x30");
  const [show, setShow] = useState({ name: true, price: true, code: true, shop: false });
  const { store } = useAuth();
  const [w, h] = size === "40x30" ? ["40mm", "30mm"] : ["50mm", "25mm"];
  const codeValue = mode === "qr" ? item.qr_value || item.sku : item.barcode || item.sku;
  const toggle = (key: keyof typeof show) => setShow((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 print:static print:block print:bg-transparent print:p-0">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl print:border-0 print:p-0 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">လေဘယ် ထုတ်ယူရန်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 print:hidden">
          {(["qr", "barcode"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-all active:scale-95",
                mode === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {key === "qr" ? <QrCode className="h-4 w-4" /> : <BarcodeIcon className="h-4 w-4" />}
              {key === "qr" ? "QR ကုဒ်" : "ဘာကုဒ်"}
            </button>
          ))}
        </div>

        <div className="mb-4 space-y-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["name", "အမည်"],
                ["price", "ဈေးနှုန်း"],
                ["code", "SKU / ကုဒ်"],
                ["shop", "ဆိုင်အမည်"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-medium",
                  show[key] ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["40x30", "50x25"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  "min-h-9 rounded-md border px-3 text-xs font-medium",
                  size === s ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {s.replace("x", "mm x ")}mm
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              အရေအတွက်
              <input
                type="number"
                min={1}
                max={200}
                value={qty}
                onChange={(e) =>
                  setQty(Math.min(200, Math.max(1, Math.trunc(Number(e.target.value) || 1))))
                }
                className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div
          className="print-area label-grid sheet-a4 max-h-[46vh] overflow-y-auto print:max-h-none print:overflow-visible"
          style={{ ["--label-w" as string]: w, ["--label-h" as string]: h }}
        >
          {Array.from({ length: qty }).map((_, index) => (
            <div key={index} className="label-cell">
              {show.shop && (
                <p className="w-full truncate text-[8px] font-semibold uppercase">{store?.name}</p>
              )}
              {show.name && (
                <p className="w-full truncate text-[9px] font-semibold leading-tight">{item.name}</p>
              )}
              {mode === "qr" ? (
                <QRCodeCanvas value={codeValue} size={54} level="M" />
              ) : (
                <Barcode
                  value={codeValue}
                  format="CODE128"
                  width={1}
                  height={26}
                  fontSize={8}
                  margin={0}
                  displayValue={show.code}
                />
              )}
              {show.code && mode === "qr" && (
                <p className="w-full truncate text-[8px]">{codeValue}</p>
              )}
              {show.price && (
                <p className="text-[11px] font-bold tabular-nums leading-tight">
                  {money(item.price)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95"
          >
            <Printer className="h-4 w-4" /> {qty} ခု ပရင်ထုတ်မည်
          </button>
          <button
            onClick={onClose}
            className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent active:scale-95"
          >
            ပိတ်မည်
          </button>
        </div>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedItemRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseItemsCsv(text, items.map((i) => i.sku));
    setRows(result.rows);
    setErrors(result.errors);
    setFileName(file.name);
    if (result.rows.length === 0) toast.error("ထည့်သွင်းနိုင်သည့် စာကြောင်း မတွေ့ပါ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileSpreadsheet className="h-4 w-4" /> ကုန်ပစ္စည်း အစုလိုက် ထည့်သွင်းခြင်း
          </h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isPro && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Crown className="h-4 w-4 text-amber-500" />
            အစုလိုက် ထည့်သွင်းခြင်းသည် Pro Plan အင်္ဂါရပ် ဖြစ်သည်။
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          ကော်လံများ: Name, SKU, Selling_Price, Cost_Price, Stock_Quantity, Unit_Name, Category။ SKU
          မထည့်ထားသော စာကြောင်းများအတွက် ၈ လုံး SKU အလိုအလျောက် ထုတ်ပေးမည်။ Excel ဖိုင်ကို CSV အဖြစ်
          သိမ်းပြီး တင်ပါ။
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => downloadCsv("items-template.csv", SAMPLE_CSV_ROWS)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> နမူနာ CSV ရယူမည်
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" /> ဖိုင် ရွေးမည်
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {fileName && (
          <p className="mt-3 text-xs text-muted-foreground">
            {fileName} — စာကြောင်း {rows.length} ခု ဖတ်ပြီးပါပြီ
          </p>
        )}

        {errors.length > 0 && (
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            {errors.slice(0, 20).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5">အမည်</th>
                  <th className="px-2 py-1.5">SKU</th>
                  <th className="px-2 py-1.5 text-right">စျေးနှုန်း</th>
                  <th className="px-2 py-1.5 text-right">လက်ကျန်</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row) => (
                  <tr key={row.sku} className="border-t border-border">
                    <td className="px-2 py-1.5">{row.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.sku}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{money(row.price)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{row.stock_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          disabled={busy || rows.length === 0 || !isPro}
          onClick={() => {
            setBusy(true);
            void onImport(rows)
              .then(({ created, updated }) => {
                toast.success(`အသစ် ${created} ခု၊ ပြင်ဆင် ${updated} ခု ထည့်သွင်းပြီးပါပြီ`);
                onClose();
              })
              .catch(() => toast.error("ထည့်သွင်း၍ မရပါ"))
              .finally(() => setBusy(false));
          }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} ထည့်သွင်းမည်
        </button>
      </div>
    </div>
  );
}
