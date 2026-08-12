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
import { useAccountingStore, CREDIT_METHOD, type Customer } from "@/lib/accounting-store";
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
  customerName?: string | null;
  customerPhone?: string | null;
  previousDebt?: number;
  newDebt?: number;
}

interface KitchenTicket {
  tableNumber: number;
  lines: CartLine[];
  notes: string;
  timestamp: string;
}

// Payment options in Myanmar
const PAYMENTS: { id: string; label: string; logo?: string }[] = [
  { id: "ငွေသား", label: "ငွေသား" },
  { id: "kbzpay", label: "KBZ Pay", logo: "/kbzpay.webp" },
  { id: "wavepay", label: "Wave Pay", logo: "/wavepay.webp" },
  { id: CREDIT_METHOD, label: CREDIT_METHOD },
];
const TABLE_COUNT = 12;

function RegisterPage() {
  const { items, recordSale, openTabs, holdTab, closeTab } = usePos();
  const { fmt, taxRate, taxPercent, isRestaurant, store, address, cashierName, phoneNumbers } =
    useStoreSettings();
  const { customers, quickAddCustomer, postSale } = useAccountingStore();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("ငွေသား");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ticket, setTicket] = useState<KitchenTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const cogsFor = (lines: CartLine[]) =>
    lines.reduce(
      (sum, line) =>
        sum + line.quantity * (items.find((i) => i.id === line.item_id)?.cost_price ?? 0),
      0,
    );

  const selectPayment = (method: string) => {
    if (method === CREDIT_METHOD) {
      setPayment(CREDIT_METHOD);
      setPickerOpen(true);
      return;
    }
    setPayment(method);
    setCreditCustomer(null);
  };

  const completeSale = async () => {
    if (cart.length === 0 || !validateStock()) return;
    const isCredit = payment === CREDIT_METHOD;
    if (isCredit && !creditCustomer) {
      setPickerOpen(true);
      toast.error("အကြွေးရောင်းရန် ဖောက်သည် ရွေးပါ");
      return;
    }
    setBusy(true);
    try {
      const { offline, saleId } = await recordSale({
        lines: cart.map(({ stock: _stock, ...line }) => line),
        total,
        paymentMethod: payment,
        customerId: isCredit ? creditCustomer!.id : null,
        status: isCredit ? "UNPAID" : "COMPLETED",
      });
      if (!offline) {
        await postSale({
          saleId,
          subtotal,
          tax,
          cogs: cogsFor(cart),
          paymentMethod: payment,
          customerId: isCredit ? creditCustomer!.id : null,
        });
      }
      const previousDebt = creditCustomer?.balance ?? 0;
      setReceipt({
        lines: cart,
        subtotal,
        tax,
        total,
        paymentMethod: payment,
        timestamp: new Date().toLocaleString(),
        offline,
        ...(isCredit
          ? {
              customerName: creditCustomer!.name,
              customerPhone: creditCustomer!.phone ?? "",
              previousDebt,
              newDebt: previousDebt + total,
            }
          : {}),
      });
      setCart([]);
      setCreditCustomer(null);
      setPayment("ငွေသား");
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

          {lowStockItems.length > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <p className="min-w-0 flex-1 text-xs font-medium">
                လက်ကျန်နည်းနေသော ပစ္စည်း {lowStockItems.length} မျိုး ရှိပါသည်။
              </p>
              <Link
                to="/suppliers"
                className="press shrink-0 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-white"
              >
                ဝယ်ယူမှု ဖန်တီးမည်
              </Link>
            </div>
          )}

          <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {["အားလုံး", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "press shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                  category === cat
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const status = stockStatus(item.stock_quantity, item.min_stock_threshold);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.stock_quantity <= 0}
                  className="press relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-colors hover:border-primary/60 disabled:opacity-50"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="h-20 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center bg-primary/5 text-lg font-bold text-primary">
                      {item.name.slice(0, 2)}
                    </div>
                  )}
                  {status !== "ok" && (
                    <span
                      className={cn(
                        "badge-pop absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold text-white",
                        status === "low" ? "bg-warning" : "bg-destructive",
                      )}
                    >
                      {status === "low" ? "လက်ကျန်နည်း" : "ကုန်နေသည်"}
                    </span>
                  )}
                  <div className="flex flex-1 flex-col px-3 py-2">
                    <span className="line-clamp-2 text-sm font-semibold">{item.name}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-base font-bold tabular-nums text-primary">
                        {fmt(item.price)}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {item.stock_quantity} ကျန်
                      </span>
                    </div>
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

          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-xs font-medium text-muted-foreground">ငွေခွဲပေးမည်</span>
            <button
              role="switch"
              aria-checked={splitMode}
              aria-label="ငွေခွဲပေးမည်"
              onClick={() => {
                setSplitMode((v) => !v);
                setSplits({});
              }}
              className={cn(
                "press relative h-6 w-11 rounded-full transition-colors",
                splitMode ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all",
                  splitMode ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4">
            {PAYMENTS.map((method) => {
              const active = splitMode ? (splits[method.id] ?? 0) > 0 : payment === method.id;
              return (
                <div key={method.id} className="space-y-1">
                  <button
                    onClick={() => (splitMode ? toggleSplit(method.id) : selectPayment(method.id))}
                    className={cn(
                      "press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
                      active
                        ? `${method.tone} text-white border-transparent`
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {method.logo && (
                      <img
                        src={method.logo}
                        alt={`${method.label} logo`}
                        className="h-5 w-5 rounded-xs bg-white object-contain p-px"
                      />
                    )}
                    {method.label}
                  </button>
                  {splitMode && (
                    <input
                      value={splits[method.id] ?? ""}
                      onChange={(e) =>
                        setSplits((prev) => ({ ...prev, [method.id]: Number(e.target.value) || 0 }))
                      }
                      inputMode="numeric"
                      placeholder="0"
                      aria-label={`${method.label} ပမာဏ`}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {splitMode && (
            <div
              className={cn(
                "mx-4 mt-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold",
                remaining === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              <span>ကျန်ငွေ</span>
              <span className="tabular-nums">{fmt(remaining)}</span>
            </div>
          )}

          {payment === CREDIT_METHOD && (
            <div className="mx-4 mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              {creditCustomer ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{creditCustomer.name}</span>{" "}
                    <span className="text-muted-foreground">{creditCustomer.phone ?? ""}</span>
                  </span>
                  <button onClick={() => setPickerOpen(true)} className="shrink-0 text-primary underline">
                    ပြောင်းရန်
                  </button>
                </div>
              ) : (
                <button onClick={() => setPickerOpen(true)} className="text-primary underline">
                  ဖောက်သည် ရွေးပါ
                </button>
              )}
            </div>
          )}

          <div className="space-y-2 p-4">
            {isRestaurant ? (
              <>
                <button
                  onClick={() => void sendToKitchen()}
                  disabled={cart.length === 0 || busy}
                  className="press inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  <ChefHat className="h-4 w-4" /> ခေတ္တသိမ်း / မီးဖိုချောင်သို့ပို့ရန်
                </button>
                <button
                  onClick={() => void payAndClose()}
                  disabled={cart.length === 0 || busy}
                  className="press h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "လုပ်ဆောင်နေသည်…" : `ငွေရှင်းပြီး စားပွဲပိတ်မည် · ${fmt(total)}`}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setHoldNoteOpen(true)}
                  disabled={cart.length === 0 || busy}
                  className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-warning bg-warning/10 text-sm font-semibold text-warning hover:bg-warning/20 disabled:opacity-50"
                >
                  <PauseCircle className="h-4 w-4" /> ခဏဆိုင်းထားမည်
                </button>
                <button
                  onClick={() => void completeSale()}
                  disabled={cart.length === 0 || busy || (splitMode && remaining !== 0)}
                  className="press h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "လုပ်ဆောင်နေသည်…" : `စာရင်းတွက်မည်· ${fmt(total)}`}
                </button>
              </>
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

      {pickerOpen && (
        <CustomerPickerModal
          customers={customers}
          onClose={() => {
            setPickerOpen(false);
            if (!creditCustomer) setPayment("ငွေသား");
          }}
          onPick={(customer) => {
            setCreditCustomer(customer);
            setPayment(CREDIT_METHOD);
            setPickerOpen(false);
          }}
          onQuickAdd={quickAddCustomer}
        />
      )}

      {holdNoteOpen && (
        <HoldNoteModal
          onClose={() => setHoldNoteOpen(false)}
          onConfirm={(note) => {
            setHoldNoteOpen(false);
            void parkOrder(note);
          }}
        />
      )}

      {heldOpen && (
        <HeldOrdersDrawer
          orders={heldOrders}
          fmt={fmt}
          onClose={() => setHeldOpen(false)}
          onResume={(order) => {
            setCart(
              order.lines.map((line) => ({
                ...line,
                stock: items.find((i) => i.id === line.item_id)?.stock_quantity ?? line.quantity,
              })),
            );
            void deleteHeldOrder(order.id);
            setHeldOpen(false);
            toast.success("ဘောက်ချာကို ပြန်ဖွင့်ပြီးပါပြီ");
          }}
          onDelete={(id) => void deleteHeldOrder(id)}
        />
      )}

      {historyOpen && (
        <OrderHistoryDrawer
          orders={recentOrders}
          fmt={fmt}
          canRefund={isOwner}
          onClose={() => setHistoryOpen(false)}
          onRefund={async (orderId, reason, note) => {
            try {
              await refundOrder({ orderId, reason, note });
              toast.success("ဘောက်ချာ ပြန်အမ်းပြီးပါပြီ");
            } catch {
              toast.error("ပြန်အမ်း၍ မရပါ");
            }
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          storeName={store?.name ?? "SMT POS"}
          address={address}
          cashierName={cashierName}
          phoneNumbers={phoneNumbers}
          logoUrl={logoUrl}
          footerNote={receiptSettings.footerNote}
          paperWidth={receiptSettings.paperWidth}
          showLogo={receiptSettings.showLogo}
          fmt={fmt}
          onClose={() => setReceipt(null)}
        />
      )}
      {ticket && <KitchenTicketModal ticket={ticket} onClose={() => setTicket(null)} />}

    </PosShell>
  );
}

function CustomerPickerModal({
  customers,
  onClose,
  onPick,
  onQuickAdd,
}: {
  customers: Customer[];
  onClose: () => void;
  onPick: (customer: Customer) => void;
  onQuickAdd: (input: { name: string; phone: string }) => Promise<Customer>;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const list = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">အကြွေး ဖောက်သည် ရွေးရန်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {adding ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="qa-name">
                အမည်
              </label>
              <input
                id="qa-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="qa-phone">
                ဖုန်းနံပါတ်
              </label>
              <input
                id="qa-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(false)}
                className="h-11 flex-1 rounded-md border border-border text-sm font-medium hover:bg-accent"
              >
                နောက်သို့
              </button>
              <button
                disabled={busy || !name.trim() || !phone.trim()}
                onClick={() => {
                  setBusy(true);
                  void onQuickAdd({ name: name.trim(), phone: phone.trim() })
                    .then((customer) => {
                      toast.success("ဖောက်သည် ထည့်ပြီးပါပြီ");
                      onPick(customer);
                    })
                    .catch(() => toast.error("ဖောက်သည် မထည့်နိုင်ပါ"))
                    .finally(() => setBusy(false));
                }}
                className="h-11 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                သိမ်းပြီး ရွေးမည်
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="အမည် သို့ ဖုန်းဖြင့် ရှာပါ"
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
              {list.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onPick(customer)}
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{customer.name}</span>
                    <span className="block text-xs text-muted-foreground">{customer.phone ?? "—"}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {customer.balance > 0 ? `အကြွေး ${customer.balance}` : "—"}
                  </span>
                </button>
              ))}
              {list.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  ဖောက်သည် မတွေ့ပါ။
                </p>
              )}
            </div>
            <button
              onClick={() => setAdding(true)}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> ဖောက်သည် အမြန်ထည့်မည်
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReceiptModal({
  receipt,
  storeName,
  address,
  cashierName,
  phoneNumbers,
  logoUrl,
  footerNote,
  paperWidth,
  showLogo,
  fmt,
  onClose,
}: {
  receipt: Receipt;
  storeName: string;
  address: string;
  cashierName: string;
  phoneNumbers: string[];
  logoUrl: string | null;
  footerNote: string;
  paperWidth: "58" | "80";
  showLogo: boolean;
  fmt: (n: number) => string;
  onClose: () => void;
}) {
  const isCredit = receipt.paymentMethod === CREDIT_METHOD;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0">
      <div
        className={cn(
          "print-area receipt-sheet my-auto w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg",
          paperWidth === "58" && "receipt-58",
        )}
      >
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold">ပြေစာ</h2>
          <button onClick={onClose} aria-label="ပြေစာ ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center">
          {showLogo && logoUrl && (
            <img src={logoUrl} alt={`${storeName} လိုဂို`} className="mx-auto mb-2 h-12 w-12 rounded-md object-cover" />
          )}
          <p className="text-base font-semibold">{storeName}</p>
          {address && <p className="text-xs text-muted-foreground">{address}</p>}
          {phoneNumbers.length > 0 && (
            <p className="text-xs text-muted-foreground">ဖုန်း — {phoneNumbers.join(" / ")}</p>
          )}
          {cashierName && <p className="text-xs text-muted-foreground">ကောင်တာ — {cashierName}</p>}
          {receipt.tableNumber != null && (
            <p className="text-xs font-medium">စားပွဲ {receipt.tableNumber}</p>
          )}
          {receipt.offline && (
            <p className="mt-1 text-xs font-medium text-warning">
              အော့ဖ်လိုင်း အရောင်း — ချိတ်ဆက်ရန် စောင့်ဆိုင်းနေသည်
            </p>
          )}
        </div>


        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="pb-1 font-medium">ပစ္စည်း</th>
              <th className="pb-1 text-center font-medium">အရေ</th>
              <th className="pb-1 text-right font-medium">နှုန်း</th>
              <th className="pb-1 text-right font-medium">ပေါင်း</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line) => (
              <tr key={line.item_id}>
                <td className="py-0.5 pr-1">{line.name}</td>
                <td className="py-0.5 text-center tabular-nums">{line.quantity}</td>
                <td className="py-0.5 text-right tabular-nums">{fmt(line.unit_price)}</td>
                <td className="py-0.5 text-right tabular-nums">
                  {fmt(line.quantity * line.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
          <p className="mt-2 text-xs text-muted-foreground">
            ပေးချေသည့် နည်းလမ်း: {receipt.paymentMethod}
          </p>
          {receipt.splits && receipt.splits.length > 1 && (
            <div className="mt-1 space-y-0.5 text-xs">
              {receipt.splits.map((split) => (
                <div key={split.method} className="flex justify-between text-muted-foreground">
                  <span>{split.method}</span>
                  <span className="tabular-nums">{fmt(split.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCredit && (
          <>
            <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
            <div className="space-y-0.5 text-xs">
              <p className="text-sm font-semibold">အကြွေး အချက်အလက်</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ဖောက်သည်</span>
                <span>{receipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ဖုန်း</span>
                <span>{receipt.customerPhone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ယခင် အကြွေး</span>
                <span className="tabular-nums">{fmt(receipt.previousDebt ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ယခု ဝယ်ယူမှု</span>
                <span className="tabular-nums">{fmt(receipt.total)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>စုစုပေါင်း အကြွေး</span>
                <span className="tabular-nums">{fmt(receipt.newDebt ?? receipt.total)}</span>
              </div>
            </div>
          </>
        )}

        <div className="print-divider my-3 text-[10px] text-muted-foreground" aria-hidden />
        <div className="text-center text-xs text-muted-foreground">
          <p>{footerNote || "ဝယ်ယူအားပေးမှုကို ကျေးဇူးအထူးတင်ရှိပါသည်။"}</p>
          <p className="mt-1">{receipt.timestamp}</p>
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
