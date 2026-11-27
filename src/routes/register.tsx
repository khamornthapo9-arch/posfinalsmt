import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { History, Pause, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ScannerModal } from "@/components/pos/scanner-modal";
import { DenseProductList } from "@/components/pos/dense-product-list";
import { CartPanel, type CartLine } from "@/components/pos/cart-panel";
import { MobileCheckoutBar } from "@/components/pos/mobile-checkout-bar";
import { SaleError } from "@/lib/pos-store";
import { findByCode, baseQuantityFor } from "@/lib/product-lookup";
import { RegisterStatus } from "@/components/pos/register-status";
import { ShiftStatus } from "@/components/pos/shift-status";
import { useProductViewMode } from "@/lib/use-product-view";
import { MobileCheckoutDrawer } from "@/components/pos/mobile-checkout-drawer";
import { usePos, type HeldOrder, type OrderSummary, type PaymentSplit } from "@/lib/pos-store";
import { useAccountingStore, CREDIT_METHOD, type Customer } from "@/lib/accounting-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { ManagerPinModal } from "@/components/pos/manager-pin-modal";
import { useStoreLogo } from "@/lib/use-store-logo";
import { useReceiptSettings } from "@/lib/receipt-settings";
import { useRole } from "@/lib/roles";
import { useAuth } from "@/lib/auth-store";
import type { CachedItem, ItemUnit } from "@/lib/pos-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "POS Register — SMT POS" },
      {
        name: "description",
        content:
          "Retail checkout with barcode and QR scanning, tax totals, receipts and offline sales.",
      },
      { property: "og:title", content: "POS Register — SMT POS" },
      {
        property: "og:description",
        content: "Offline-capable retail checkout with scanning, tax and receipts.",
      },
    ],
  }),
  component: RegisterPage,
});

interface Receipt {
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  splits?: PaymentSplit[];
  timestamp: string;
  offline: boolean;
  tableNumber?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  previousDebt?: number;
  newDebt?: number;
  cashReceived?: number;
  change?: number;
  reference?: string;
}

interface KitchenTicket {
  tableNumber: number;
  lines: CartLine[];
  notes: string;
  timestamp: string;
}

const PAYMENTS: { id: string; label: string; logo?: string; tone: string }[] = [
  { id: "ငွေသား", label: "ငွေသား", tone: "cash" },
  { id: "kbzpay", label: "KBZ Pay", logo: "/kbzpay.webp", tone: "kbz" },
  { id: "wavepay", label: "Wave Pay", logo: "/wavepay.webp", tone: "wave" },
  { id: CREDIT_METHOD, label: CREDIT_METHOD, tone: "credit" },
];

const TABLE_COUNT = 12;

function RegisterPage() {
  const {
    items,
    lowStockItems,
    recordSale,
    openTabs,
    holdTab,
    closeTab,
    heldOrders,
    holdOrder,
    deleteHeldOrder,
    recentOrders,
    refundOrder,
    loading,
    isOnline,
  } = usePos();
  const {
    fmt,
    taxRate,
    taxPercent,
    isRestaurant,
    isPro,
    store,
    symbol,
    address,
    cashierName,
    phoneNumbers,
  } = useStoreSettings();
  const { customers, quickAddCustomer, postSale } = useAccountingStore();
  const { canApprove } = useRole();
  const { isBranchDevice } = useAuth();
  const logoUrl = useStoreLogo();
  const { settings: receiptSettings } = useReceiptSettings();

  const [viewMode, setViewMode] = useProductViewMode();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("အားလုံး");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("ငွေသား");
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ticket, setTicket] = useState<KitchenTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [holdNoteOpen, setHoldNoteOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [digitalConfirmed, setDigitalConfirmed] = useState(false);
  const txnRef = useRef<{ id: string; sig: string } | null>(null);
  const submitLock = useRef(false);
  const [pendingApproval, setPendingApproval] = useState<((ok: boolean) => void) | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const activeTab = useMemo(
    () =>
      activeTable == null ? null : (openTabs.find((t) => t.table_number === activeTable) ?? null),
    [openTabs, activeTable],
  );

  const addToCart = useCallback((item: CachedItem, unit?: ItemUnit) => {
    const unitName = unit?.unit_name;
    const conversion = unit?.conversion ?? 1;
    const unitPrice = unit?.price ?? item.price;
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.item_id === item.id && (line.unit_name ?? "base") === (unitName ?? "base"),
      );
      const nextQty = (existing?.quantity ?? 0) + 1;
      const baseQty = baseQuantityFor(prev, item.id) + conversion;
      if (baseQty > item.stock_quantity) {
        toast.error("ကျန်ရှိသော လက်ကျန်ထက် ပို၍ မရောင်းနိုင်ပါ။");
        return prev;
      }
      if (existing) {
        return prev.map((line) =>
          line.item_id === item.id && (line.unit_name ?? "base") === (unitName ?? "base")
            ? { ...line, quantity: nextQty, stock: item.stock_quantity }
            : line,
        );
      }
      return [
        ...prev,
        {
          item_id: item.id,
          sku: item.sku,
          name: item.name,
          quantity: 1,
          unit_price: unitPrice,
          unit_name: unitName,
          conversion,
          stock: item.stock_quantity,
        },
      ];
    });
  }, []);

  const addBySku = useCallback(
    (rawCode: string) => {
      const result = findByCode(itemsRef.current, rawCode);
      if (result.kind === "none") {
        toast.error(`"${rawCode.trim()}" အတွက် ပစ္စည်း မတွေ့ပါ`);
        return;
      }
      if (result.kind === "ambiguous") {
        toast.error(
          `"${rawCode.trim()}" ကုဒ်နှင့် ပစ္စည်း ${result.items.length} ခု ကိုက်ညီနေသည်။ ရှာဖွေရန်နေရာမှ ရွေးပါ`,
        );
        setQuery(rawCode.trim());
        return;
      }
      if (result.item.stock_quantity <= 0) {
        toast.error(`${result.item.name} — ပစ္စည်းပြတ်နေသည်`);
        return;
      }
      addToCart(result.item);
      toast.success(`${result.item.name} ထည့်ပြီးပါပြီ`);
    },
    [addToCart],
  );

  useEffect(() => {
    if (scannerOpen) return;
    let buffer = "";
    let lastKey = 0;
    let timer: number | undefined;
    const reset = () => {
      buffer = "";
      window.clearTimeout(timer);
    };
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="dialog"],[role="textbox"],[role="combobox"]',
        )
      ) {
        reset();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape") {
        reset();
        return;
      }
      const now = Date.now();
      if (now - lastKey > 120) buffer = "";
      lastKey = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, 300);
      if (event.key === "Enter") {
        if (buffer.length >= 3) {
          event.preventDefault();
          addBySku(buffer);
        }
        reset();
        return;
      }
      if (event.key.length === 1) buffer += event.key;
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("blur", reset);
    return () => {
      reset();
      window.removeEventListener("keydown", handler);
      window.removeEventListener("blur", reset);
    };
  }, [addBySku, scannerOpen]);

  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const splitPaid = Object.values(splits).reduce((sum, n) => sum + n, 0);
  const remaining = Math.round((total - splitPaid) * 100) / 100;
  const creditPortion = splitMode
    ? (splits[CREDIT_METHOD] ?? 0)
    : payment === CREDIT_METHOD
      ? total
      : 0;
  const needsCreditCustomer = creditPortion > 0 && !customer;
  const cents = (n: number) => Math.round(n * 100);
  const CASH_METHOD = "ငွေသား";
  const cashDue = splitMode ? (splits[CASH_METHOD] ?? 0) : payment === CASH_METHOD ? total : 0;
  const digitalDue = splitMode
    ? Object.entries(splits)
        .filter(([method]) => method !== CASH_METHOD && method !== CREDIT_METHOD)
        .reduce((sum, [, amount]) => sum + amount, 0)
    : payment !== CASH_METHOD && payment !== CREDIT_METHOD
      ? total
      : 0;
  const cashTendered = cashReceived.trim() === "" ? null : Number(cashReceived);
  const cashShort = cashDue > 0 && cashTendered != null && cents(cashTendered) < cents(cashDue);
  const changeDue =
    cashDue > 0 && cashTendered != null && cents(cashTendered) > cents(cashDue)
      ? Math.round((cashTendered - cashDue) * 100) / 100
      : 0;

  const digitalCents = cents(digitalDue);
  const totalCents = cents(total);
  useEffect(() => {
    setDigitalConfirmed(false);
  }, [payment, splitMode, digitalCents]);
  useEffect(() => {
    setCashReceived("");
  }, [payment, totalCents]);

  const changeQty = (itemId: string, delta: number, unitName?: string) =>
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.item_id !== itemId) return line;
          if (unitName && (line.unit_name ?? "base") !== unitName) return line;
          const stock = items.find((i) => i.id === itemId)?.stock_quantity ?? line.stock ?? 0;
          const conversion = line.conversion ?? 1;
          const nextQty = line.quantity + delta;
          const others = prev.filter((l) => l !== line);
          if (delta > 0 && baseQuantityFor(others, itemId) + nextQty * conversion > stock) {
            toast.error("ကျန်ရှိသော လက်ကျန်ထက် ပို၍ မရောင်းနိုင်ပါ။");
            return line;
          }
          return { ...line, quantity: nextQty };
        })
        .filter((line) => line.quantity > 0),
    );

  const setQty = (itemId: string, qty: number, unitName?: string) => {
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("အရေအတွက်သည် ၁ နှင့်အထက် ကိန်းပြည့် ဖြစ်ရပါမည်");
      return;
    }
    setCart((prev) => {
      const target = prev.find(
        (line) => line.item_id === itemId && (line.unit_name ?? "base") === (unitName ?? "base"),
      );
      if (!target) return prev;
      const stock = items.find((i) => i.id === itemId)?.stock_quantity ?? target.stock ?? 0;
      const others = prev.filter((l) => l !== target);
      if (baseQuantityFor(others, itemId) + qty * (target.conversion ?? 1) > stock) {
        toast.error("ကျန်ရှိသော လက်ကျန်ထက် ပို၍ မရောင်းနိုင်ပါ။");
        return prev;
      }
      return prev.map((l) => (l === target ? { ...l, quantity: qty } : l));
    });
  };

  const clearCart = () => {
    setCart([]);
    setSplits({});
    setSplitMode(false);
    setNotes("");
    if (payment === CREDIT_METHOD) setPayment(CASH_METHOD);
  };

  const clearCustomer = () => {
    setCustomer(null);
    if (payment === CREDIT_METHOD) setPayment(CASH_METHOD);
    setSplits((prev) => {
      const next = { ...prev };
      delete next[CREDIT_METHOD];
      return next;
    });
  };

  const removeFromCart = (itemId: string, unitName?: string) =>
    setCart((prev) =>
      prev.filter(
        (line) => line.item_id !== itemId || (unitName && (line.unit_name ?? "base") !== unitName),
      ),
    );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return ["အားလုံး", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "အားလုံး" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku ?? "").toLowerCase().includes(q) ||
        (item.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  const checkoutDisabled =
    cart.length === 0 || busy || needsCreditCustomer || cashShort || (digitalDue > 0 && !digitalConfirmed);

  return (
    <PosShell
      title="အရောင်းကောင်တာ"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <RegisterStatus />
          <ShiftStatus />
          <button
            type="button"
            onClick={() => setHeldOpen(true)}
            className="press min-h-9 touch:min-h-11 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent sm:px-3"
          >
            ဆိုင်းငံ့ ({heldOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="press min-h-9 touch:min-h-11 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent sm:px-3"
          >
            <span className="sm:hidden">မှတ်တမ်း</span>
            <span className="hidden sm:inline">အရောင်းမှတ်တမ်း (ပြန်အမ်း)</span>
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ပစ္စည်း ရှာရန် / ဘားကုဒ်"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="press h-10 rounded-md border border-border bg-card px-3 text-sm font-semibold"
            >
              Scan
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <DenseProductList
            items={filtered}
            loading={loading}
            onAdd={addToCart}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            lowStockIds={new Set(lowStockItems.map((i) => i.id))}
          />
        </div>

        <div className="hidden w-full max-w-md shrink-0 lg:block">
          <CartPanel
            cart={cart}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxPercent={taxPercent}
            fmt={fmt}
            payment={payment}
            payments={PAYMENTS}
            onPayment={setPayment}
            onChangeQty={changeQty}
            onSetQty={setQty}
            onRemove={removeFromCart}
            onClear={clearCart}
            busy={busy}
            checkoutDisabled={checkoutDisabled}
            onCheckout={() => setCheckoutOpen(true)}
            customer={customer}
            onPickCustomer={() => setPickerOpen(true)}
            onClearCustomer={clearCustomer}
            splitMode={splitMode}
            splits={splits}
            onToggleSplitMode={() => {
              setSplitMode((v) => !v);
              setSplits({});
            }}
            remaining={remaining}
            cashReceived={cashReceived}
            onCashReceived={setCashReceived}
            changeDue={changeDue}
            digitalConfirmed={digitalConfirmed}
            onDigitalConfirmed={setDigitalConfirmed}
            digitalDue={digitalDue}
            cashDue={cashDue}
          />
        </div>
      </div>

      <MobileCheckoutBar
        cartCount={cart.reduce((s, l) => s + l.quantity, 0)}
        total={total}
        fmt={fmt}
        onOpen={() => setCheckoutOpen(true)}
      />

      <MobileCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        taxPercent={taxPercent}
        fmt={fmt}
        payment={payment}
        payments={PAYMENTS}
        onPayment={setPayment}
        onChangeQty={changeQty}
        onSetQty={setQty}
        onRemove={removeFromCart}
        onClear={clearCart}
        busy={busy}
        checkoutDisabled={checkoutDisabled}
        onCheckout={() => {
          toast.message("Checkout — full flow being restored");
        }}
        customer={customer}
        onPickCustomer={() => setPickerOpen(true)}
        onClearCustomer={clearCustomer}
        splitMode={splitMode}
        splits={splits}
        onToggleSplitMode={() => {
          setSplitMode((v) => !v);
          setSplits({});
        }}
        remaining={remaining}
        cashReceived={cashReceived}
        onCashReceived={setCashReceived}
        changeDue={changeDue}
        digitalConfirmed={digitalConfirmed}
        onDigitalConfirmed={setDigitalConfirmed}
        digitalDue={digitalDue}
        cashDue={cashDue}
      />

      <ScannerModal open={scannerOpen} onOpenChange={setScannerOpen} onScan={addBySku} />

      {pendingApproval && (
        <ManagerPinModal
          open
          onClose={() => {
            pendingApproval(false);
            setPendingApproval(null);
          }}
          onSuccess={() => {
            pendingApproval(true);
            setPendingApproval(null);
          }}
        />
      )}
    </PosShell>
  );
}
