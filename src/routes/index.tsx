import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Camera, Minus, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ScannerModal } from "@/components/pos/scanner-modal";
import { usePos } from "@/lib/pos-store";
import { money, stockStatus, TAX_RATE } from "@/lib/pos-utils";
import type { CachedItem, PendingSaleLine } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "POS Register — Counter Point of Sale" },
      {
        name: "description",
        content:
          "Ring up sales fast with barcode and QR scanning, cart totals, tax, and offline checkout that syncs automatically.",
      },
      { property: "og:title", content: "POS Register — Counter Point of Sale" },
      {
        property: "og:description",
        content: "Offline-capable checkout register with scanning, tax, and printable receipts.",
      },
    ],
  }),
  component: RegisterPage,
});

type CartLine = PendingSaleLine & { stock: number };

interface Receipt {
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: string;
  offline: boolean;
}

const PAYMENTS = ["Cash", "Card", "QR Code"] as const;

function RegisterPage() {
  const { items, recordSale } = usePos();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("Cash");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addToCart = useCallback((item: CachedItem, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.item_id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item_id === item.id
            ? { ...line, quantity: line.quantity + qty, stock: item.stock_quantity }
            : line,
        );
      }
      return [
        ...prev,
        {
          item_id: item.id,
          sku: item.sku,
          name: item.name,
          quantity: qty,
          unit_price: item.price,
          stock: item.stock_quantity,
        },
      ];
    });
  }, []);

  const addBySku = useCallback(
    (code: string) => {
      const match = itemsRef.current.find(
        (item) => item.sku.toLowerCase() === code.toLowerCase().trim(),
      );
      if (!match) {
        toast.error(`No product found for "${code}"`);
        return;
      }
      addToCart(match);
      toast.success(`Added ${match.name}`);
    },
    [addToCart],
  );

  // USB / hardware barcode scanner: rapid keystrokes terminated by Enter.
  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const now = Date.now();
      if (now - lastKey > 120) buffer = "";
      lastKey = now;
      if (event.key === "Enter") {
        if (buffer.length >= 3) addBySku(buffer);
        buffer = "";
        return;
      }
      if (event.key.length === 1) buffer += event.key;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addBySku]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q),
    );
  }, [items, query]);

  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const changeQty = (itemId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((line) =>
          line.item_id === itemId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );

  const completeSale = async () => {
    if (cart.length === 0) return;
    for (const line of cart) {
      const current = items.find((item) => item.id === line.item_id);
      if (!current || current.stock_quantity < line.quantity) {
        toast.error(`Not enough stock for ${line.name}`);
        return;
      }
    }
    setBusy(true);
    try {
      const { offline } = await recordSale({
        lines: cart.map(({ stock: _stock, ...line }) => line),
        total,
        paymentMethod: payment,
      });
      setReceipt({
        lines: cart,
        subtotal,
        tax,
        total,
        paymentMethod: payment,
        timestamp: new Date().toLocaleString(),
        offline,
      });
      setCart([]);
      toast.success(offline ? "Sale queued offline" : "Sale completed");
    } catch {
      toast.error("Could not complete the sale");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PosShell title="POS Register">
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[65fr_35fr] lg:items-start">
        <section className="min-w-0">
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or SKU, or scan a barcode"
                className="h-12 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-ring sm:h-11 sm:text-sm"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95 sm:h-11"
            >
              <Camera className="h-4 w-4" /> Scan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.stock_quantity <= 0}
                  className="flex min-h-[110px] flex-col rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/60 active:scale-[0.97] active:border-primary disabled:opacity-50"
                >
                  <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{item.sku}</span>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-semibold tabular-nums">
                      {money(item.price)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        status === "ok" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                        status === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                        status === "out" && "bg-destructive/15 text-destructive",
                      )}
                    >
                      {status === "out" ? "Out" : `${item.stock_quantity} left`}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
                {items.length === 0 ? (
                  <>
                    <Boxes className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No products in inventory yet. Add your first item in Inventory.
                    </p>
                    <Link
                      to="/inventory"
                      className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Go to Inventory
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No products match your search.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex h-fit flex-col rounded-xl border border-border bg-card lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Current sale</h2>
            <span className="text-xs text-muted-foreground">
              {cart.length} {cart.length === 1 ? "line" : "lines"}
            </span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto lg:max-h-[45vh]">
            {cart.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Cart is empty. Tap a product or scan to begin.
              </p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.item_id}
                  className="flex items-center gap-2 border-b border-border px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {money(line.unit_price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(line.item_id, -1)}
                      aria-label="Decrease quantity"
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-border transition-transform hover:bg-accent active:scale-90 sm:h-9 sm:w-9"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      onClick={() => changeQty(line.item_id, 1)}
                      aria-label="Increase quantity"
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-border transition-transform hover:bg-accent active:scale-90 sm:h-9 sm:w-9"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">
                    {money(line.quantity * line.unit_price)}
                  </span>
                  <button
                    onClick={() =>
                      setCart((prev) => prev.filter((l) => l.item_id !== line.item_id))
                    }
                    aria-label={`Remove ${line.name}`}
                    className="flex h-11 w-9 items-center justify-center text-muted-foreground hover:text-destructive sm:h-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
              <span className="tabular-nums">{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-4">
            {PAYMENTS.map((method) => (
              <button
                key={method}
                onClick={() => setPayment(method)}
                className={cn(
                  "min-h-11 rounded-lg border px-2 text-xs font-medium transition-all active:scale-95",
                  payment === method
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {method}
              </button>
            ))}
          </div>

          <div className="p-4">
            <button
              onClick={() => void completeSale()}
              disabled={cart.length === 0 || busy}
              className="h-14 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Processing..." : `Complete sale · ${money(total)}`}
            </button>
          </div>
        </section>
      </div>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setScannerOpen(false);
          addBySku(code);
        }}
      />

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </PosShell>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:static print:bg-transparent print:p-0">
      <div className="print-area receipt-sheet w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">Receipt</h2>
          <button onClick={onClose} aria-label="Close receipt" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">Counter POS</p>
          <p className="text-xs text-muted-foreground">{receipt.timestamp}</p>
          {receipt.offline && (
            <p className="mt-1 text-xs font-medium text-amber-600">Offline sale — pending sync</p>
          )}
        </div>
        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <div className="text-sm">
          {receipt.lines.map((line) => (
            <div key={line.item_id} className="flex justify-between py-0.5">
              <span className="truncate pr-2">
                {line.quantity} × {line.name}
              </span>
              <span className="tabular-nums">{money(line.quantity * line.unit_price)}</span>
            </div>
          ))}
        </div>
        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <div className="text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">{money(receipt.tax)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{money(receipt.total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Paid by {receipt.paymentMethod}</p>
        </div>
        <div className="mt-4 flex gap-2 print:hidden">
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
