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

// Payment options in Myanmar
const PAYMENTS = ["ငွေသား", "ကတ်", "QR ခုတ်"] as const;
const TABLE_COUNT = 12;

function RegisterPage() {
  const { items, recordSale, openTabs, holdTab, closeTab } = usePos();
  const { fmt, taxRate, taxPercent, isRestaurant, store } = useStoreSettings();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("ငွေသား");
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
        toast.error(`"${code}" အတွက် ပစ္စည်း မတွေ့ပါ`);
        return;
      }
      addToCart(match);
      toast.success(`${match.name} ထည့်ပြီးပါပြီ`);
    },
    [addToCart],
  );

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
        toast.error(`${line.name} အတွက် ပစ္စည်း လက်ကျန် မလုံလောက်ပါ`);
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
      toast.success(offline ? "အရောင်းကို အော့ဖ်လိုင်း မှတ်ထားသည်" : "ရောင်းချမှု အောင်မြင်သည်");
    } catch {
      toast.error("အရောင်းစာရင်း မသိမ်းဆည်းနိုင်ပါ");
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
      toast.success(`စားပွဲ ${activeTable} စာရင်း ခေတ္တသိမ်းထားသည်`);
      leaveTable();
    } catch {
      toast.error("စာရင်း မသိမ်းဆည်းနိုင်ပါ");
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
      toast.success(`စားပွဲ ${activeTable} စာရင်း ပိတ်ပြီးပါပြီ`);
      leaveTable();
    } catch {
      toast.error("စားပွဲ မပိတ်နိုင်ပါ");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Restaurant floor plan ----------
  if (isRestaurant && activeTable == null) {
    return (
      <PosShell title="စားပွဲများ မြေပုံ" subtitle={`ဖွင့်ထားသော စားပွဲ ${openTabs.length} ခု`}>
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
                  <span className="text-sm font-semibold">စားပွဲ {num}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      occupied
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {occupied ? "လူရှိသည်" : "အားသည်"}
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
      title={isRestaurant ? `စားပွဲ ${activeTable}` : "POS စာရင်းကိုင်"}
      subtitle={isRestaurant ? (activeTab ? "ဖွင့်ထားသော စာရင်း" : "အော်ဒါအသစ်") : store?.name}
      actions={
        isRestaurant ? (
          <button
            onClick={leaveTable}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> စားပွဲများ မြေပုံ
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
                placeholder="အမည် (သို့) SKU ဖြင့် ရှာပါ၊ သို့မဟုတ် ဘားကုဒ် ဖတ်ပါ"
                className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Camera className="h-4 w-4" /> စကင်န်ဖတ်ရန်
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
                      {status === "out" ? "ကုန်နေသည်" : `${item.stock_quantity} ကျန်`}
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
                      ကုန်ပစ္စည်း စာရင်းမရှိသေးပါ။ ပစ္စည်းအသစ် ထည့်သွင်းပါ။
                    </p>
                    <Link
                      to="/inventory"
                      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      ကုန်ပစ္စည်းစာရင်းသို့ သွားရန်
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex h-fit flex-col rounded-lg border border-border bg-card shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {isRestaurant ? `စားပွဲ ${activeTable} အော်ဒါ` : "လက်ရှိ ရောင်းချမှု"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {cart.length} မျိုး
            </span>
          </div>
          <div className="max-h-[46vh] overflow-y-auto">
            {cart.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                ဈေးဝယ်ခြင်းတောင်း လွတ်နေပါသည်။ ပစ္စည်းတစ်ခုကို နှိပ်ပါ သို့မဟုတ် စကင်န်ဖတ်ပါ။
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
                      {fmt(line.unit_price)} တစ်ခု
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(line.item_id, -1)}
                      aria-label="အရေအတွက် လျှော့ရန်"
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent sm:h-9 sm:w-9"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      onClick={() => changeQty(line.item_id, 1)}
                      aria-label="အရေအတွက် တိုးရန်"
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
                    aria-label={`${line.name} ကို ဖျက်ရန်`}
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
                မီးဖိုချောင် မှတ်ချက်
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ကြက်သွန်မပါ၊ အစပ်ကဲ…"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>စုစုပေါင်း</span>
              <span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>အခွန် ({taxPercent}%)</span>
              <span className="tabular-nums">{fmt(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>ကျသင့်ငွေ</span>
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
                  <ChefHat className="h-4 w-4" /> ခေတ္တသိမ်း / မီးဖိုချောင်သို့ပို့ရန်
                </button>
                <button
                  onClick={() => void payAndClose()}
                  disabled={cart.length === 0 || busy}
                  className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "လုပ်ဆောင်နေသည်…" : `ငွေရှင်းပြီး စားပွဲပိတ်မည် · ${fmt(total)}`}
                </button>
              </>
            ) : (
              <button
                onClick={() => void completeSale()}
                disabled={cart.length === 0 || busy}
                className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "လုပ်ဆောင်နေသည်…" : `အရောင်းအပြီးသတ်မည် · ${fmt(total)}`}
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
          <h2 className="text-sm font-semibold">ပြေစာ</h2>
          <button onClick={onClose} aria-label="ပြေစာ ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{storeName}</p>
          <p className="text-xs text-muted-foreground">{receipt.timestamp}</p>
          {receipt.tableNumber != null && (
            <p className="text-xs font-medium">စားပွဲ {receipt.tableNumber}</p>
          )}
          {receipt.offline && (
            <p className="mt-1 text-xs font-medium text-amber-600">အော့ဖ်လိုင်း အရောင်း — ချိတ်ဆက်ရန် စောင့်ဆိုင်းနေသည်</p>
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
            <span>စုစုပေါင်း</span>
            <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>အခွန်</span>
            <span className="tabular-nums">{fmt(receipt.tax)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>ကျသင့်ငွေ</span>
            <span className="tabular-nums">{fmt(receipt.total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">ပေးချေသည့် နည်းလမ်း: {receipt.paymentMethod}</p>
        </div>
        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> ပရင့်ထုတ်ရန်
          </button>
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            ပြီးပြီ
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
          <h2 className="text-sm font-semibold">မီးဖိုချောင် အော်ဒါလတ်မှတ်</h2>
          <button onClick={onClose} aria-label="လက်မှတ် ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">စားပွဲ {ticket.tableNumber}</p>
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
            <p className="text-sm">မှတ်ချက်: {ticket.notes}</p>
          </>
        )}
        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> ပရင့်ထုတ်ရန်
          </button>
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            ပြီးပြီ
          </button>
        </div>
      </div>
    </div>
  );
}
