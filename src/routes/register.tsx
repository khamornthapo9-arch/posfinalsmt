import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Printer, Search, X } from "lucide-react";
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
        content: "Retail checkout with barcode and QR scanning, tax totals, receipts and offline sales.",
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
    setCart((prev) => {
      const existing = prev.find(
        (line) =>
          line.item_id === item.id && (line.unit_name ?? "base") === (unitName ?? "base"),
      );
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
      toast.error(
        `Standard အစီအစဉ်တွင် ဆိုင်းငံ့ ဘောက်ချာ ${FREE_LIMITS.heldCarts} ခုသာ ထားနိုင်သည်`,
      );
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
      (sum, line) => sum + line.quantity * (items.find((i) => i.id === line.item_id)?.cost_price ?? 0),
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
                  type="button"
                  onClick={() => openTable(num)}
                  className={cn(
                    "flex min-h-28 flex-col justify-between rounded-md border bg-card px-4 py-3 text-left shadow-xs transition-colors",
                    occupied
                      ? "border-destructive/40 bg-destructive/5 hover:border-destructive"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <span className="text-sm font-semibold">စားပွဲ {num}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-sm px-2 py-0.5 text-xs font-medium",
                      occupied
                        ? "bg-danger-soft text-destructive"
                        : "bg-success-soft text-success",
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
            ? "ဖွင့်ထားသော စားပွဲ"
            : "အော်ဒါအသစ်"
          : `${store?.name ?? "Store"} · ${cashierName || "ကောင်တာ"}`
      }
    >
      {/* Desktop Split: 60% Catalog + 40% Cart */}
      <div className="hidden h-[calc(100vh-64px)] md:grid md:grid-cols-[60fr_40fr]">
        <div className="min-w-0 overflow-hidden bg-background">
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

        {/* Right Cart Panel with text-only
