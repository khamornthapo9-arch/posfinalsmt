import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Barcode as BarcodeIcon, Pencil, Plus, Printer, QrCode, Search, Trash2, X } from "lucide-react";
import Barcode from "react-barcode";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { usePos } from "@/lib/pos-store";
import { money, stockStatus } from "@/lib/pos-utils";
import type { CachedItem } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inventory & Labels — Counter Point of Sale" },
      {
        name: "description",
        content:
          "Manage products, stock levels and low-stock thresholds, and print 2x1 inch QR shelf labels.",
      },
      { property: "og:title", content: "Inventory & Labels — Counter Point of Sale" },
      {
        property: "og:description",
        content: "Product catalog management with QR label generation and printing.",
      },
    ],
  }),
  component: InventoryPage,
});

type Filter = "all" | "low" | "out";

const EMPTY = { sku: "", name: "", price: "", stock_quantity: "", min_stock_threshold: "5" };

function InventoryPage() {
  const { items, saveItem, deleteItem } = usePos();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<CachedItem | "new" | null>(null);
  const [labelItem, setLabelItem] = useState<CachedItem | null>(null);

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
    <PosShell title="Inventory">
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
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
                {f === "all" ? "All" : f === "low" ? "Low stock" : "Out of stock"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                        {status === "ok" ? "In stock" : status === "low" ? "Low" : "Out"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setLabelItem(item)}
                          aria-label={`Generate QR for ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(item)}
                          aria-label={`Edit ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            void deleteItem(item.id).catch(() =>
                              toast.error("Cannot delete a product with recorded sales"),
                            );
                          }}
                          aria-label={`Delete ${item.name}`}
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
                    No products found.
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
                    {status === "ok" ? "In stock" : status === "low" ? "Low" : "Out"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm tabular-nums">
                    <span className="font-semibold">{money(item.price)}</span>
                    <span className="text-muted-foreground"> · {item.stock_quantity} in stock</span>
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setLabelItem(item)}
                      aria-label={`Generate label for ${item.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border active:scale-95"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditing(item)}
                      aria-label={`Edit ${item.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border active:scale-95"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        void deleteItem(item.id).catch(() =>
                          toast.error("Cannot delete a product with recorded sales"),
                        );
                      }}
                      aria-label={`Delete ${item.name}`}
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
            <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No products found.
            </p>
          )}
        </div>
      </div>

      {editing && (
        <ProductModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              await saveItem(values);
              toast.success("Product saved");
              setEditing(null);
            } catch {
              toast.error("Could not save — is the SKU already used?");
            }
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
    stock_quantity: number;
    min_stock_threshold: number;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(
    item
      ? {
          sku: item.sku,
          name: item.name,
          price: String(item.price),
          stock_quantity: String(item.stock_quantity),
          min_stock_threshold: String(item.min_stock_threshold),
        }
      : EMPTY,
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
          <h2 className="text-sm font-semibold">{item ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {field("name", "Name")}
          {field("sku", "SKU")}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {field("price", "Price", "number")}
            {field("stock_quantity", "Stock", "number")}
            {field("min_stock_threshold", "Low at", "number")}
          </div>
        </div>
        <button
          disabled={saving || !form.name.trim() || !form.sku.trim()}
          onClick={() => {
            setSaving(true);
            void onSave({
              ...(item ? { id: item.id } : {}),
              sku: form.sku.trim(),
              name: form.name.trim(),
              price: Number(form.price) || 0,
              stock_quantity: Math.trunc(Number(form.stock_quantity) || 0),
              min_stock_threshold: Math.trunc(Number(form.min_stock_threshold) || 0),
            }).finally(() => setSaving(false));
          }}
          className="mt-5 h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save product"}
        </button>
      </div>
    </div>
  );
}

function LabelModal({ item, onClose }: { item: CachedItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:static print:bg-transparent print:p-0">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl print:border-0 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">Print label</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="print-area mx-auto flex h-[1in] w-[2in] items-center gap-2 rounded border border-border bg-white p-1.5 text-black">
          <QRCodeCanvas value={item.sku} size={72} level="M" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[10px] font-semibold">{item.name}</p>
            <p className="text-[13px] font-bold tabular-nums">{money(item.price)}</p>
            <p className="truncate text-[9px]">{item.sku}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
