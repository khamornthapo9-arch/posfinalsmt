import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  Camera,
  ChefHat,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ScannerModal } from "@/components/pos/scanner-modal";
import { usePos } from "@/lib/pos-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { stockStatus } from "@/lib/pos-utils";
import type { CachedItem, PendingSaleLine } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "POS Register — SMT POS" },
      {
        name: "description",
        content:
          "Ring up sales fast with barcode and QR scanning, table service tabs, tax totals and offline checkout that syncs automatically.",
      },
      { property: "og:title", content: "POS Register — SMT POS" },
      {
        property: "og:description",
        content: "Offline-capable checkout register with scanning, tables, tax and receipts.",
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
  tableNumber?: number | null;
}

interface KitchenTicket {
  tableNumber: number;
  lines: CartLine[];
  notes: string;
  timestamp: string;
}

const PAYMENTS = ["Cash", "Card", "QR Code"] as const;
const TABLE_COUNT = 12;

function RegisterPage() {
  const { items, recordSale, openTabs, holdTab, closeTab } = usePos();
  const { fmt, taxRate, taxPercent, isRestaurant, store } = useStoreSettings();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("Cash");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ticket, setTicket] = useState<KitchenTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const activeTab = useMemo(
    () => (activeTable == null ? null : openTabs.find((t) => t.table_number === activeTable) ?? null),
    [openTabs, activeTable],
  );

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
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const changeQty = (itemId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((line) =>
          line.item_id === itemId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );

  const openTable = (tableNumber: number) => {
    const tab = openTabs.find((t) => t.table_number === tableNumber);
    setActiveTable(tableNumber);
    setNotes(tab?.notes ?? "");
    setCart(
      (tab?.lines ?? []).map((line) => ({
        item_id: line.item_id,
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        stock: items.find((i) => i.id === line.item_id)?.stock_quantity ?? line.quantity,
      })),
    );
  };

  const leaveTable = () => {
    setActiveTable(null);
    setCart([]);
    setNotes("");
  };

  const validateStock = () => {
    for (const line of cart) {
      const current = items.find((item) => item.id === line.item_id);
      const saved = activeTab?.lines.find((l) => l.item_id === line.item_id)?.quantity ?? 0;
      const needed = line.quantity - saved;
      if (needed > 0 && (!current || current.stock_quantity < needed)) {
        toast.error(`Not enough stock for ${line.name}`);
        return false;
      }
    }
    return true;
  };

  const completeSale = async () => {
    if (cart.length === 0 || !validateStock()) return;
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

  const sendToKitchen = async () => {
    if (activeTable == null || cart.length === 0 || !validateStock()) return;
    setBusy(true);
    try {
      await holdTab({
        saleId: activeTab?.id,
        tableNumber: activeTable,
        lines: cart.map(({ stock: _stock, ...line }) => line),
        total,
        notes,
      });
      setTicket({
        tableNumber: activeTable,
        lines: cart,
        notes,
        timestamp: new Date().toLocaleString(),
      });
      toast.success(`Table ${activeTable} tab held`);
      leaveTable();
    } catch {
      toast.error("Could not hold the tab");
    } finally {
      setBusy(false);
    }
  };

  const payAndClose = async () => {
    if (activeTable == null || cart.length === 0 || !validateStock()) return;
    setBusy(true);
    try {
      const resolvedId = await holdTab({
        saleId: activeTab?.id,
        tableNumber: activeTable,
        lines: cart.map(({ stock: _s, ...l }) => l),
        total,
        notes,
      });
      await closeTab({ saleId: resolvedId, total, paymentMethod: payment });
      setReceipt({
        lines: cart,
        subtotal,
        tax,
        total,
        paymentMethod: payment,
        timestamp: new Date().toLocaleString(),
        offline: false,
        tableNumber: activeTable,
      });
      toast.success(`Table ${activeTable} closed`);
      leaveTable();
    } catch {
      toast.error("Could not close the table");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Restaurant floor plan ----------
  if (isRestaurant && activeTable == null) {
    return (
      <PosShell title="Table Floor Plan" subtitle={`${openTabs.length} open tab(s)`}>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map((num) => {
              const tab = openTabs.find((t) => t.table_number === num);
              const occupied = Boolean(tab);
              return (
                <button
                  key={num}
                  onClick={() => openTable(num)}
                  className={cn(
                    "flex min-h-28 flex-col justify-between rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors",
                    occupied
                      ? "border-red-200 bg-red-50 hover:border-red-300"
                      : "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300",
                  )}
                >
                  <span className="text-sm font-semibold">Table {num}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      occupied
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {occupied ? "Occupied" : "Available"}
                  </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {occupied ? fmt(tab!.total_amount) : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PosShell>
    );
  }

  return (
    <PosShell
      title={isRestaurant ? `Table ${activeTable}` : "POS Register"}
      subtitle={isRestaurant ? (activeTab ? "Open tab" : "New order") : store?.name}
      actions={
        isRestaurant ? (
          <button
            onClick={leaveTable}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Floor plan
          </button>
        ) : null
      }
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[65fr_35fr] lg:items-start">
        <section className="min-w-0">
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or SKU, or scan a barcode"
                className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
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
                  className="flex min-h-[112px] flex-col rounded-lg border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/60 disabled:opacity-50"
                >
                  <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{item.sku}</span>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-base font-semibold tabular-nums">{fmt(item.price)}</span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        status === "ok" && "bg-emerald-50 text-emerald-700",
                        status === "low" && "bg-amber-50 text-amber-700",
                        status === "out" && "bg-destructive/10 text-destructive",
                      )}
                    >
                      {status === "out" ? "Out" : `${item.stock_quantity} left`}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
                {items.length === 0 ? (
                  <>
                    <Boxes className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No products in inventory yet. Add your first item in Inventory.
                    </p>
                    <Link
                      to="/inventory"
                      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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

        <section className="flex h-fit flex-col rounded-lg border border-border bg-card shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {isRestaurant ? `Table ${activeTable} order` : "Current sale"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {cart.length} {cart.length === 1 ? "line" : "lines"}
            </span>
          </div>
          <div className="max-h-[46vh] overflow-y-auto">
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
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {fmt(line.unit_price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(line.item_id, -1)}
                      aria-label="Decrease quantity"
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent sm:h-9 sm:w-9"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      onClick={() => changeQty(line.item_id, 1)}
                      aria-label="Increase quantity"
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent sm:h-9 sm:w-9"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">
                    {fmt(line.quantity * line.unit_price)}
                  </span>
                  <button
                    onClick={() => setCart((prev) => prev.filter((l) => l.item_id !== line.item_id))}
                    aria-label={`Remove ${line.name}`}
                    className="flex h-11 w-9 items-center justify-center text-muted-foreground hover:text-destructive sm:h-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {isRestaurant && (
            <div className="border-t border-border px-4 py-3">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Kitchen notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="No onions, extra spicy…"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({taxPercent}%)</span>
              <span className="tabular-nums">{fmt(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{fmt(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-4">
            {PAYMENTS.map((method) => (
              <button
                key={method}
                onClick={() => setPayment(method)}
                className={cn(
                  "min-h-11 rounded-md border px-2 text-xs font-medium transition-colors",
                  payment === method
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {method}
              </button>
            ))}
          </div>

          <div className="space-y-2 p-4">
            {isRestaurant ? (
              <>
                <button
                  onClick={() => void sendToKitchen()}
                  disabled={cart.length === 0 || busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  <ChefHat className="h-4 w-4" /> Hold tab / Send to kitchen
                </button>
                <button
                  onClick={() => void payAndClose()}
                  disabled={cart.length === 0 || busy}
                  className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "Processing…" : `Pay & close table · ${fmt(total)}`}
                </button>
              </>
            ) : (
              <button
                onClick={() => void completeSale()}
                disabled={cart.length === 0 || busy}
                className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Processing…" : `Complete sale · ${fmt(total)}`}
              </button>
            )}
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

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          storeName={store?.name ?? "SMT POS"}
          fmt={fmt}
          onClose={() => setReceipt(null)}
        />
      )}
      {ticket && <KitchenTicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </PosShell>
  );
}

function ReceiptModal({
  receipt,
  storeName,
  fmt,
  onClose,
}: {
  receipt: Receipt;
  storeName: string;
  fmt: (n: number) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="print-area receipt-sheet w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">Receipt</h2>
          <button onClick={onClose} aria-label="Close receipt" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{storeName}</p>
          <p className="text-xs text-muted-foreground">{receipt.timestamp}</p>
          {receipt.tableNumber != null && (
            <p className="text-xs font-medium">Table {receipt.tableNumber}</p>
          )}
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
              <span className="tabular-nums">{fmt(line.quantity * line.unit_price)}</span>
            </div>
          ))}
        </div>
        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <div className="text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">{fmt(receipt.tax)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{fmt(receipt.total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Paid by {receipt.paymentMethod}</p>
        </div>
        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function KitchenTicketModal({
  ticket,
  onClose,
}: {
  ticket: KitchenTicket;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="print-area kitchen-ticket w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">Kitchen order ticket</h2>
          <button onClick={onClose} aria-label="Close ticket" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">TABLE {ticket.tableNumber}</p>
          <p className="text-xs text-muted-foreground">{ticket.timestamp}</p>
        </div>
        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <div className="text-sm">
          {ticket.lines.map((line) => (
            <div key={line.item_id} className="flex justify-between py-0.5">
              <span className="truncate pr-2 font-medium">{line.name}</span>
              <span className="tabular-nums">× {line.quantity}</span>
            </div>
          ))}
        </div>
        {ticket.notes.trim() && (
          <>
            <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
            <p className="text-sm">Notes: {ticket.notes}</p>
          </>
        )}
        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> Print ticket
          </button>
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
