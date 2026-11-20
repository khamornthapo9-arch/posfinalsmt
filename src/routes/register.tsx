import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, History, PauseCircle, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ScannerModal } from "@/components/pos/scanner-modal";
import { DenseProductList } from "@/components/pos/dense-product-list";
import { CartPanel, type CartLine } from "@/components/pos/cart-panel";
import { MobileCheckoutBar } from "@/components/pos/mobile-checkout-bar";
import { MobileCheckoutDrawer } from "@/components/pos/mobile-checkout-drawer";
import { usePos, type HeldOrder, type OrderSummary, type PaymentSplit } from "@/lib/pos-store";
import { useAccountingStore, CREDIT_METHOD, type Customer } from "@/lib/accounting-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { ManagerPinModal } from "@/components/pos/manager-pin-modal";
import { FREE_LIMITS } from "@/lib/subscription";
import { useStoreLogo } from "@/lib/use-store-logo";
import { useReceiptSettings } from "@/lib/receipt-settings";
import { useRole } from "@/lib/roles";
import type { CachedItem, ItemUnit, PendingSaleLine } from "@/lib/pos-db";
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
}

interface KitchenTicket {
  tableNumber: number;
  lines: CartLine[];
  notes: string;
  timestamp: string;
}

// Payment options in Myanmar
const PAYMENTS: { id: string; label: string; logo?: string; tone: string }[] = [
  { id: "ငွေသား", label: "ငွေသား", tone: "bg-success" },
  { id: "kbzpay", label: "KBZ Pay", logo: "/kbzpay.webp", tone: "bg-primary" },
  { id: "wavepay", label: "Wave Pay", logo: "/wavepay.webp", tone: "bg-warning" },
  { id: CREDIT_METHOD, label: CREDIT_METHOD, tone: "bg-warning" },
];
const TABLE_COUNT = 12;

function RegisterPage() {
  const {
    items,
    categories,
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
  const logoUrl = useStoreLogo();
  const { settings: receiptSettings } = useReceiptSettings();

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
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [holdNoteOpen, setHoldNoteOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<((ok: boolean) => void) | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const activeTab = useMemo(
    () => (activeTable == null ? null : openTabs.find((t) => t.table_number === activeTable) ?? null),
    [openTabs, activeTable],
  );

  const addToCart = useCallback((item: CachedItem, unit?: ItemUnit) => {
    const unitName = unit?.unit_name;
    const conversion = unit?.conversion ?? 1;
    const unitPrice = unit?.price ?? item.price;
    const lineKey = `${item.id}:${unitName ?? "base"}`;

    setCart((prev) => {
      const existing = prev.find((line) => line.item_id === item.id && (line.unit_name ?? "base") === (unitName ?? "base"));
      const nextQty = (existing?.quantity ?? 0) + 1;
      const baseQty = nextQty * conversion;
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
    return items.filter((item) => {
      if (category !== "အားလုံး" && item.category !== category) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    });
  }, [items, query, category]);

  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const splitPaid = Object.values(splits).reduce((sum, n) => sum + n, 0);
  const remaining = Math.round((total - splitPaid) * 100) / 100;
  const creditPortion = splitMode
    ? splits[CREDIT_METHOD] ?? 0
    : payment === CREDIT_METHOD
      ? total
      : 0;
  const needsCreditCustomer = creditPortion > 0 && !creditCustomer;

  const toggleSplit = (methodId: string) => {
    const enabling = !splits[methodId];
    if (enabling && methodId === CREDIT_METHOD && !creditCustomer) setPickerOpen(true);
    setSplits((prev) => {
      const next = { ...prev };
      if (next[methodId]) {
        delete next[methodId];
      } else {
        next[methodId] = Math.max(remaining, 0);
      }
      return next;
    });
  };

  const changeQty = (itemId: string, delta: number, unitName?: string) =>
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.item_id !== itemId) return line;
          if (unitName && (line.unit_name ?? "base") !== unitName) return line;
          const stock = items.find((i) => i.id === itemId)?.stock_quantity ?? (line.stock ?? 0);
          const conversion = line.conversion ?? 1;
          const nextQty = line.quantity + delta;
          if (delta > 0 && nextQty * conversion > stock) {
            toast.error("ကျန်ရှိသော လက်ကျန်ထက် ပို၍ မရောင်းနိုင်ပါ။");
            return line;
          }
          return { ...line, quantity: nextQty };
        })
        .filter((line) => line.quantity > 0),
    );

  const removeFromCart = (itemId: string, unitName?: string) =>
    setCart((prev) =>
      prev.filter(
        (line) =>
          line.item_id !== itemId || (unitName && (line.unit_name ?? "base") !== unitName),
      ),
    );

  const toggleSplitMode = () => {
    if (!isPro) {
      toast.error("ခွဲ၍ ငွေပေးချေမှုသည် Pro Plan တွင်သာ ရရှိနိုင်ပါသည်");
      return;
    }
    setSplitMode((v) => !v);
    setSplits({});
  };

  const parkOrder = async (note: string) => {
    if (cart.length === 0) return;
    if (!isPro && heldOrders.length >= FREE_LIMITS.heldCarts) {
      toast.error(`Standard အစီအစဉ်တွင် ဆိုင်းငံ့ ဘောက်ချာ ${FREE_LIMITS.heldCarts} ခုသာ ထားနိုင်သည်`);
      return;
    }
    try {
      await holdOrder({
        lines: cart.map(({ stock: _s, ...line }) => line),
        total,
        note,
      });
      setCart([]);
      toast.success("ဘောက်ချာကို ခဏဆိုင်းထားပါပြီ");
    } catch {
      toast.error("ခဏဆိုင်း၍ မရပါ");
    }
  };

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
        toast.error("ကျန်ရှိသော လက်ကျန်ထက် ပို၍ မရောင်းနိုင်ပါ။");
        return false;
      }
    }
    return true;
  };

  const availablePayments = isPro ? PAYMENTS : PAYMENTS.filter((p) => p.id !== CREDIT_METHOD);

  const cogsFor = (lines: CartLine[]) =>
    lines.reduce(
      (sum, line) =>
        sum + line.quantity * (items.find((i) => i.id === line.item_id)?.cost_price ?? 0),
      0,
    );

  const selectPayment = (method: string) => {
    if (method === CREDIT_METHOD && !isPro) {
      toast.error("အကြွေးရောင်းချမှုသည် Pro Plan တွင်သာ ရရှိနိုင်ပါသည်");
      return;
    }
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
    const splitList = splitMode
      ? Object.entries(splits)
          .map(([method, amount]) => ({ method, amount }))
          .filter((split) => split.amount > 0)
      : [{ method: payment, amount: total }];
    const creditAmount = splitList
      .filter((split) => split.method === CREDIT_METHOD)
      .reduce((sum, split) => sum + split.amount, 0);
    const isCredit = creditAmount > 0;
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
        paymentMethod: splitMode ? "SPLIT" : payment,
        paymentBreakdown: splitList,
        customerId: isCredit ? creditCustomer!.id : null,
        status: "COMPLETED",
        paymentStatus: !isCredit
          ? "PAID"
          : creditAmount >= Math.round(total * 100) / 100
            ? "UNPAID"
            : "PARTIAL",
      });
      if (!offline) {
        await postSale({
          saleId,
          subtotal,
          tax,
          cogs: cogsFor(cart),
          paymentMethod: splitMode ? "SPLIT" : payment,
          splits: splitList,
          customerId: isCredit ? creditCustomer!.id : null,
        });
      }
      const previousDebt = creditCustomer?.balance ?? 0;
      setReceipt({
        lines: cart,
        subtotal,
        tax,
        total,
        paymentMethod: splitMode ? "SPLIT" : payment,
        splits: splitList,
        timestamp: new Date().toLocaleString(),
        offline,
        ...(isCredit
          ? {
              customerName: creditCustomer!.name,
              customerPhone: creditCustomer!.phone ?? "",
              previousDebt,
              newDebt: previousDebt + creditAmount,
            }
          : {}),
      });
      setCart([]);
      setCreditCustomer(null);
      setPayment("ငွေသား");
      setSplitMode(false);
      setSplits({});
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
                    "flex min-h-28 flex-col justify-between rounded-md border bg-card px-4 py-3 text-left shadow-sm transition-colors",
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
      subtitle={
        isRestaurant
          ? activeTab
            ? "ဖွင့်ထားသော စာရင်း"
            : "အော်ဒါအသစ်"
          : `${store?.name ?? "Store"} · ${cashierName || "ကောင်တာ"}`
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHeldOpen(true)}
            className="press relative inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <PauseCircle className="h-3.5 w-3.5" /> ဆိုင်းထား
            {heldOrders.length > 0 && (
              <span className="pulse-dot ml-1 rounded-full bg-warning px-1.5 text-[10px] font-bold text-white">
                {heldOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="press inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <History className="h-3.5 w-3.5" /> မှတ်တမ်း
          </button>
          {isRestaurant && (
            <button
              onClick={leaveTable}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> စားပွဲများ မြေပုံ
            </button>
          )}
        </div>
      }
    >
      {/* Desktop/Tablet: fixed 60/40 split */}
      <div className="hidden h-[calc(100vh-64px)] md:grid md:grid-cols-[60fr_40fr]">
        <div className="min-w-0 overflow-hidden">
          <DenseProductList
            items={items}
            query={query}
            onQueryChange={setQuery}
            selectedCategory={category}
            onCategoryChange={setCategory}
            lowStockCount={lowStockItems.length}
            currencySymbol={symbol}
            isPro={isPro}
            onScan={() => setScannerOpen(true)}
            onAdd={addToCart}
          />
        </div>
        <div className="min-w-0 border-l border-border">
          <CartPanel
            cart={cart}
            items={items}
            isRestaurant={isRestaurant}
            activeTable={activeTable}
            notes={notes}
            payment={payment}
            splitMode={splitMode}
            splits={splits}
            creditCustomer={creditCustomer}
            busy={busy}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxPercent={taxPercent}
            remaining={remaining}
            creditPortion={creditPortion}
            needsCreditCustomer={needsCreditCustomer}
            currencySymbol={symbol}
            payments={availablePayments}
            onChangeQty={changeQty}
            onRemove={removeFromCart}
            onNotesChange={setNotes}
            onSelectPayment={selectPayment}
            onToggleSplit={toggleSplit}
            onSplitChange={(methodId: string, amount: number) =>
              setSplits((prev) => ({ ...prev, [methodId]: amount }))
            }
            onToggleSplitMode={toggleSplitMode}
            onPickCustomer={() => setPickerOpen(true)}
            onPark={() => setHoldNoteOpen(true)}
            onComplete={() => void completeSale()}
            onSendToKitchen={() => void sendToKitchen()}
            onPayAndClose={() => void payAndClose()}
          />
        </div>
      </div>

      {/* Mobile: scrollable product list + sticky checkout bar */}
      <div className="flex h-[calc(100vh-64px)] flex-col md:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DenseProductList
            items={items}
            query={query}
            onQueryChange={setQuery}
            selectedCategory={category}
            onCategoryChange={setCategory}
            lowStockCount={lowStockItems.length}
            currencySymbol={symbol}
            isPro={isPro}
            onScan={() => setScannerOpen(true)}
            onAdd={addToCart}
          />
        </div>
        <MobileCheckoutBar
          cart={cart}
          total={total}
          currencySymbol={symbol}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      <MobileCheckoutDrawer
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        items={items}
        isRestaurant={isRestaurant}
        activeTable={activeTable}
        notes={notes}
        payment={payment}
        splitMode={splitMode}
        splits={splits}
        creditCustomer={creditCustomer}
        busy={busy}
        subtotal={subtotal}
        tax={tax}
        total={total}
        taxPercent={taxPercent}
        remaining={remaining}
        creditPortion={creditPortion}
        needsCreditCustomer={needsCreditCustomer}
        currencySymbol={symbol}
        payments={availablePayments}
        onChangeQty={changeQty}
        onRemove={removeFromCart}
        onNotesChange={setNotes}
        onSelectPayment={selectPayment}
        onToggleSplit={toggleSplit}
        onSplitChange={(methodId: string, amount: number) =>
          setSplits((prev) => ({ ...prev, [methodId]: amount }))
        }
        onToggleSplitMode={toggleSplitMode}
        onPickCustomer={() => setPickerOpen(true)}
        onPark={() => setHoldNoteOpen(true)}
        onComplete={() => {
          setCheckoutOpen(false);
          void completeSale();
        }}
        onSendToKitchen={() => {
          setCheckoutOpen(false);
          void sendToKitchen();
        }}
        onPayAndClose={() => {
          setCheckoutOpen(false);
          void payAndClose();
        }}
      />

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
            if (!creditCustomer && !splitMode) setPayment("ငွေသား");
          }}
          onPick={(customer) => {
            setCreditCustomer(customer);
            if (!splitMode) setPayment(CREDIT_METHOD);
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
          canRefund={canApprove}
          isPro={isPro}
          onClose={() => setHistoryOpen(false)}
          onRefund={async (orderId, reason, note) => {
            if (isPro) {
              const approved = await new Promise<boolean>((resolve) => {
                setPendingApproval(() => (ok: boolean) => resolve(ok));
              });
              if (!approved) return;
            }
            try {
              await refundOrder({ orderId, reason, note });
              toast.success("ဘောက်ချာ ပြန်အမ်းပြီးပါပြီ");
            } catch {
              toast.error("ပြန်အမ်း၍ မရပါ");
            }
          }}
        />
      )}

      {pendingApproval && (
        <ManagerPinModal
          title="ပြန်အမ်းရန် မန်နေဂျာ PIN"
          onClose={() => {
            pendingApproval(false);
            setPendingApproval(null);
          }}
          onApproved={() => {
            pendingApproval(true);
            setPendingApproval(null);
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
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-md border border-border bg-card p-5 shadow-lg">
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
          "print-area receipt-sheet my-auto w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-lg",
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
      <div className="print-area kitchen-ticket w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-lg">
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

function HoldNoteModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">ခဏဆိုင်းထားမည်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="hold-note">
          မှတ်ချက် (ဖောက်သည်အမည် / စားပွဲနံပါတ်)
        </label>
        <input
          id="hold-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => onConfirm(note)}
          className="press mt-4 h-11 w-full rounded-md bg-warning text-sm font-semibold text-white"
        >
          ခဏဆိုင်းမည်
        </button>
      </div>
    </div>
  );
}

function HeldOrdersDrawer({
  orders,
  fmt,
  onClose,
  onResume,
  onDelete,
}: {
  orders: HeldOrder[];
  fmt: (n: number) => string;
  onClose: () => void;
  onResume: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">ခဏဆိုင်းထားသော ဘောက်ချာများ ({orders.length})</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {orders.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">ဆိုင်းထားသော ဘောက်ချာ မရှိပါ။</p>
          )}
          {orders.map((order) => (
            <div key={order.id} className="mb-3 rounded-md border border-border p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{order.note || "မှတ်ချက်မရှိ"}</span>
                <span className="text-sm font-bold tabular-nums">{fmt(order.total_amount)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString()} · {order.lines.length} မျိုး
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {order.lines.map((line) => (
                  <li key={line.item_id} className="flex justify-between">
                    <span className="truncate pr-2">{line.name} × {line.quantity}</span>
                    <span className="tabular-nums">{fmt(line.quantity * line.unit_price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onResume(order)}
                  className="press h-10 flex-1 rounded-md bg-success text-xs font-semibold text-white"
                >
                  ပြန်ဖွင့်မည်
                </button>
                <button
                  onClick={() => onDelete(order.id)}
                  aria-label="ဖျက်ရန်"
                  className="flex h-10 w-10 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

const REFUND_REASONS = ["ပစ္စည်း ပြန်အပ်", "ပစ္စည်း ချွတ်ယွင်း", "အမှားရိုက်မိ", "အခြား"];

function isOrderToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isOrderYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

function OrderHistoryDrawer({
  orders,
  fmt,
  canRefund,
  isPro,
  onClose,
  onRefund,
}: {
  orders: OrderSummary[];
  fmt: (n: number) => string;
  canRefund: boolean;
  isPro: boolean;
  onClose: () => void;
  onRefund: (orderId: string, reason: string, note: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<OrderSummary | null>(null);
  const [reason, setReason] = useState(REFUND_REASONS[0]!);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Date filter state: Free gets "today" & "yesterday"; Pro also gets "custom" and "all"
  const [filterMode, setFilterMode] = useState<"today" | "yesterday" | "custom" | "all">("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterMode === "today") return isOrderToday(order.created_at);
      if (filterMode === "yesterday") return isOrderYesterday(order.created_at);
      if (filterMode === "custom") {
        return order.created_at.slice(0, 10) === selectedDate;
      }
      return true; // "all" (Pro only)
    });
  }, [orders, filterMode, selectedDate]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">ဘောက်ချာ မှတ်တမ်း</h2>
            {!isPro && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                အခမဲ့ (၂ ရက်သာ)
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Date Filter Tabs */}
        <div className="border-b border-border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setFilterMode("today");
                setSelected(null);
              }}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                filterMode === "today"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent",
              )}
            >
              ဒီနေ့
            </button>
            <button
              onClick={() => {
                setFilterMode("yesterday");
                setSelected(null);
              }}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                filterMode === "yesterday"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent",
              )}
            >
              မနေ့က
            </button>

            {isPro ? (
              <>
                <button
                  onClick={() => {
                    setFilterMode("custom");
                    setSelected(null);
                  }}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    filterMode === "custom"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent",
                  )}
                >
                  ရက်စွဲရွေးမည်
                </button>
                <button
                  onClick={() => {
                    setFilterMode("all");
                    setSelected(null);
                  }}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    filterMode === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent",
                  )}
                >
                  အားလုံး
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-400 font-medium">
                  PRO
                </span>
                <span>ရက်စွဲအစုံကြည့်ရန်</span>
              </div>
            )}
          </div>

          {/* Custom Date Input for PRO */}
          {isPro && filterMode === "custom" && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ရက်စွဲ:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              className={cn(
                "mb-2 flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left transition-colors",
                selected?.id === order.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent",
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold tabular-nums">
                  {fmt(order.total_amount)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()} · {order.payment_method}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-[11px] font-bold text-white",
                  order.status === "REFUNDED"
                    ? "bg-destructive"
                    : order.status === "OPEN" || order.status === "UNPAID"
                      ? "bg-warning"
                      : "bg-success",
                )}
              >
                {order.status}
              </span>
            </button>
          ))}
          {filteredOrders.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              ရွေးချယ်ထားသော ရက်စွဲတွင် မှတ်တမ်း မရှိပါ။
            </p>
          )}
        </div>

        {/* Voucher Detail and Refund Section */}
        {selected && (
          <div className="border-t border-border p-4 bg-background">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">ဘောက်ချာ အသေးစိတ်</p>
              <span className="text-xs text-muted-foreground">
                {new Date(selected.created_at).toLocaleDateString()}
              </span>
            </div>

            <ul className="mt-2 space-y-1 text-xs text-muted-foreground max-h-32 overflow-y-auto">
              {selected.lines.map((line) => (
                <li key={line.item_id} className="flex justify-between border-b border-border/40 py-1">
                  <span className="truncate pr-2">
                    {line.name} × {line.quantity}
                  </span>
                  <span className="tabular-nums font-medium text-foreground">
                    {fmt(line.quantity * line.unit_price)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Refund Action Section */}
            {canRefund && selected.status !== "REFUNDED" && (
              <div className="mt-3">
                {isOrderToday(selected.created_at) ? (
                  /* Today's voucher: Refund Allowed */
                  <div className="space-y-2">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      aria-label="အကြောင်းရင်း"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {REFUND_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="မှတ်ချက် (ရွေးချယ်နိုင်)"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                    />
                    <button
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void onRefund(selected.id, reason, note).finally(() => {
                          setBusy(false);
                          setSelected(null);
                        });
                      }}
                      className="press h-9 w-full rounded-md border border-destructive text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      ပြန်အမ်း / ဘောက်ချာဖျက်မည်
                    </button>
                  </div>
                ) : (
                  /* Older voucher: Refund Disallowed */
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                    ယနေ့ (ဒီနေ့) ရောင်းချထားသော ဘောက်ချာများတွင်သာ
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
