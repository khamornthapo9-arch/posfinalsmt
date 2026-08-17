import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  DollarSign,
  HandCoins,
  Package,
  PiggyBank,
  Printer,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ProLock } from "@/components/pos/pro-lock";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/pos-utils";
import { useStoreSettings } from "@/lib/use-store-settings";
import { usePos } from "@/lib/pos-store";
import { useAccountingStore, CREDIT_METHOD, CASH_METHOD } from "@/lib/accounting-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "အရောင်း စာရင်းဇယား Analysis — Counter Point of Sale" },
      {
        name: "description",
        content:
          "ကုန်ပစ္စည်းများကို စစ်ဆေးရန်နှင့် CSV ထုတ်ယူရန်။",
      },
      { property: "og:title", content: "အရောင်း စာရင်းဇယား Analysis — Counter Point of Sale" },
      {
        property: "og:description",
        content: "အရောင်းအဝယ် ခွဲခြမ်းစိတ်ဖြာခြင်းနှင့် အစီရင်ခံစာဌာန",
      },
    ],
  }),
  component: AnalyticsPage,
});

type RangeKey = "today" | "yesterday" | "week" | "month" | "all" | "custom";

const FREE_RANGES: RangeKey[] = ["today", "yesterday"];
const PRO_RANGES: RangeKey[] = ["today", "yesterday", "week", "month", "all", "custom"];
const RANGE_LABEL: Record<RangeKey, string> = {
  today: "ဒီနေ့",
  yesterday: "မနေ့က",
  week: "ဒီတစ်ပတ်",
  month: "ဒီလ",
  all: "စုစုပေါင်း",
  custom: "ရှာရန်",
};

interface SaleRow {
  id: string;
  total_amount: number;
  payment_method: string;
  payment_breakdown: { method: string; amount: number }[] | null;
  is_offline_sync: boolean;
  created_at: string;
  status: string;
  customer_id: string | null;
  customers: {
    name: string;
    phone: string | null;
    balance: number;
    customer_type: string;
  } | null;
  sale_items: {
    quantity: number;
    unit_price: number;
    items: { name: string; cost_price: number } | null;
  }[];
}

interface DebtPaymentRow {
  id: string;
  amount: number;
  method: string;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  amount: number;
  paid_with: string;
  spent_at: string;
}

function startOf(range: RangeKey) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "yesterday") d.setDate(d.getDate() - 1);
  if (range === "week") d.setDate(d.getDate() - 6);
  if (range === "month") d.setDate(d.getDate() - 29);
  if (range === "all") return new Date(2000, 0, 1);
  return d;
}

function endOf(range: RangeKey) {
  if (range === "yesterday") {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setSeconds(d.getSeconds() - 1);
    return d;
  }
  return new Date();
}

function AnalyticsPage() {
  const { fmt, isPro } = useStoreSettings();
  const [range, setRange] = useState<RangeKey>("today");
  const [from, setFrom] = useState(() => startOf("week").toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eodOpen, setEodOpen] = useState(false);
  const { customers, expenses } = useAccountingStore();
  const { items } = usePos();

  const ranges = isPro ? PRO_RANGES : FREE_RANGES;
  useEffect(() => {
    if (!ranges.includes(range)) setRange("today");
  }, [ranges, range]);

  const fromDate = range === "custom" ? new Date(`${from}T00:00:00`) : startOf(range);
  const toDate = range === "custom" ? new Date(`${to}T23:59:59`) : endOf(range);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const [debtPayments, setDebtPayments] = useState<DebtPaymentRow[]>([]);
  const [rangeExpenses, setRangeExpenses] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const [{ data: salesData }, { data: debtData }, { data: expenseData }] = await Promise.all([
        supabase
          .from("sales")
          .select(
            "id,total_amount,payment_method,payment_breakdown,is_offline_sync,created_at,status,customer_id,customers(name,phone,balance,customer_type),sale_items(quantity,unit_price,items(name,cost_price))",
          )
          .gte("created_at", fromIso)
          .lte("created_at", toIso)
          .order("created_at"),
        supabase
          .from("debt_payments")
          .select("id,amount,method,created_at")
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase
          .from("expenses")
          .select("id,amount,paid_with,spent_at")
          .gte("spent_at", fromIso)
          .lte("spent_at", toIso),
      ]);
      if (!active) return;
      setSales((salesData ?? []) as unknown as SaleRow[]);
      setDebtPayments((debtData ?? []) as unknown as DebtPaymentRow[]);
      setRangeExpenses((expenseData ?? []) as unknown as ExpenseRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [fromIso, toIso]);

  const metrics = useMemo(() => {
    const active = sales.filter((s) => s.status !== "REFUNDED");
    const refunded = sales.filter((s) => s.status === "REFUNDED");
    const revenue = active.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const refundedTotal = refunded.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const units = active.reduce(
      (sum, s) => sum + s.sale_items.reduce((q, line) => q + line.quantity, 0),
      0,
    );
    const cogs = active.reduce(
      (sum, s) =>
        sum +
        s.sale_items.reduce(
          (c, line) => c + line.quantity * Number(line.items?.cost_price ?? 0),
          0,
        ),
      0,
    );
    return {
      revenue,
      refundedTotal,
      cogs,
      transactions: active.length,
      units,
      average: active.length ? revenue / active.length : 0,
      completedTotal: revenue + refundedTotal,
      refundedCount: refunded.length,
    };
  }, [sales]);

  /** Gross Sales = all completed sales minus every refunded receipt. */
  const grossSales = metrics.completedTotal - metrics.refundedTotal;

  /** Total value of stock currently on hand, at buy price. */
  const inventoryAssetValue = useMemo(
    () => items.reduce((sum, i) => sum + i.stock_quantity * Number(i.cost_price ?? 0), 0),
    [items],
  );

  const totalExpenses = useMemo(
    () => rangeExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [rangeExpenses],
  );

  const activeDebt = useMemo(
    () => customers.reduce((sum, c) => sum + Math.max(c.balance, 0), 0),
    [customers],
  );
  const grossProfit = metrics.revenue - metrics.cogs;
  const netProfit = grossProfit - totalExpenses;

  const [lifetimeNet, setLifetimeNet] = useState(0);
  useEffect(() => {
    if (!isPro) return;
    let active = true;
    void (async () => {
      const [{ data: allSales }, { data: allExpenses }] = await Promise.all([
        supabase.from("sales").select("total_amount,status,sale_items(quantity,items(cost_price))"),
        supabase.from("expenses").select("amount"),
      ]);
      if (!active) return;
      const rows = (allSales ?? []) as unknown as {
        total_amount: number;
        status: string;
        sale_items: { quantity: number; items: { cost_price: number } | null }[];
      }[];
      const completed = rows.filter((r) => r.status !== "REFUNDED");
      const revenue = completed.reduce((s, r) => s + Number(r.total_amount), 0);
      const cogs = completed.reduce(
        (s, r) =>
          s + r.sale_items.reduce((c, l) => c + l.quantity * Number(l.items?.cost_price ?? 0), 0),
        0,
      );
      const spend = (allExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
      setLifetimeNet(revenue - cogs - spend);
    })();
    return () => {
      active = false;
    };
  }, [isPro]);

  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const sale of sales.filter((s) => s.status !== "REFUNDED")) {
      const key = new Date(sale.created_at).toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(sale.total_amount));
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString("my-MM", {
          month: "short",
          day: "numeric",
        }),
        revenue: Number(revenue.toFixed(2)),
      }));
  }, [sales]);

  const topProducts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sale of sales.filter((s) => s.status !== "REFUNDED")) {
      for (const line of sale.sale_items) {
        const name = line.items?.name ?? "မသိရှိသော ပစ္စည်း";
        totals.set(name, (totals.get(name) ?? 0) + line.quantity);
      }
    }
    return [...totals.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  const paymentBuckets = useMemo(() => {
    const buckets = {
      cashIn: 0,
      kbzIn: 0,
      waveIn: 0,
      creditIssued: 0,
      cashRefunds: 0,
      cashExpenses: 0,
    };
    for (const sale of sales) {
      const breakdown = sale.payment_breakdown?.length ? sale.payment_breakdown : [{ method: sale.payment_method, amount: sale.total_amount }];
      for (const split of breakdown) {
        const method = split.method.toLowerCase();
        const amount = Number(split.amount || 0);
        if (method === CASH_METHOD.toLowerCase()) {
          if (sale.status === "REFUNDED") buckets.cashRefunds += amount;
          else buckets.cashIn += amount;
        } else if (method === CREDIT_METHOD.toLowerCase()) {
          if (sale.status !== "REFUNDED") buckets.creditIssued += amount;
        } else if (method.includes("kbz")) {
          if (sale.status !== "REFUNDED") buckets.kbzIn += amount;
        } else if (method.includes("wave")) {
          if (sale.status !== "REFUNDED") buckets.waveIn += amount;
        }
      }
    }
    for (const dp of debtPayments) {
      const amount = Number(dp.amount);
      if (amount > 0 && dp.method.toLowerCase() === CASH_METHOD.toLowerCase()) {
        buckets.cashIn += amount;
      }
    }
    for (const e of rangeExpenses) {
      if (e.paid_with.toLowerCase() === CASH_METHOD.toLowerCase()) {
        buckets.cashExpenses += Number(e.amount);
      }
    }
    return buckets;
  }, [sales, debtPayments, rangeExpenses]);

  const netCashOnHand = paymentBuckets.cashIn - paymentBuckets.cashRefunds - paymentBuckets.cashExpenses;

  /** FREE tier: simple receipt list. */
  const exportDailySummary = () => {
    const rows: (string | number)[][] = [
      ["Date", "Receipt ID", "Payment Method", "Total Amount"],
      ...sales
        .filter((s) => s.status !== "REFUNDED")
        .map((sale) => [
          new Date(sale.created_at).toLocaleString("my-MM"),
          sale.id,
          sale.payment_method,
          Number(sale.total_amount).toFixed(2),
        ]),
      [],
      ["Gross Sales", grossSales.toFixed(2)],
      ["Refunds", metrics.refundedTotal.toFixed(2)],
    ];
    downloadCsv("Daily_Sales_Summary.csv", rows);
  };

  /** PRO tier: line-item level financial report. */
  const exportMasterFinancial = () => {
    const rows: (string | number)[][] = [
      [
        "Receipt ID",
        "Date",
        "Item Name",
        "Qty",
        "Selling Price",
        "Buy Price",
        "Line Profit",
        "Payment Channel",
        "Refund Status",
      ],
      ...sales.flatMap((sale) => {
        const refunded = sale.status === "REFUNDED";
        return sale.sale_items.map((line) => {
          const buy = Number(line.items?.cost_price ?? 0);
          const lineProfit = refunded ? 0 : line.quantity * (Number(line.unit_price) - buy);
          return [
            sale.id,
            new Date(sale.created_at).toLocaleString("my-MM"),
            line.items?.name ?? "—",
            line.quantity,
            Number(line.unit_price).toFixed(2),
            buy.toFixed(2),
            lineProfit.toFixed(2),
            sale.payment_method,
            refunded ? "REFUNDED" : "COMPLETED",
          ];
        });
      }),
      [],
      ["Operating Expenses", totalExpenses.toFixed(2)],
      ["Net Profit", netProfit.toFixed(2)],
      [],
    ];
    const legacy: (string | number)[][] = [
      [
        "အရောင်း အိုင်ဒီ",
        "ရက်စွဲ",
        "ငွေပေးချေမှု နည်းလမ်း",
        "အခြေအနေ",
        "ဖောက်သည် အမျိုးအစား",
        "ဖောက်သည် အမည်",
        "ဖုန်း",
        "အကြွေး လက်ကျန်",
        "အော့ဖ်လိုင်း စင့်ခ်လုပ်မှု",
        "အရေအတွက်",
        "စုစုပေါင်း",
      ],
      ...sales.map((sale) => {
        const credit = sale.payment_method === CREDIT_METHOD;
        const customer = sale.customers;
        return [
          sale.id,
          new Date(sale.created_at).toLocaleString("my-MM"),
          sale.payment_method,
          sale.status,
          credit
            ? customer?.customer_type === "QUICK"
              ? "Quick-Added"
              : "Registered"
            : "—",
          credit ? customer?.name ?? "—" : "—",
          credit ? customer?.phone ?? "—" : "—",
          credit ? Number(customer?.balance ?? 0).toFixed(2) : "0.00",
          sale.is_offline_sync ? "ဟုတ်ပါသည်" : "မဟုတ်ပါ",
          sale.sale_items.reduce((q, line) => q + line.quantity, 0),
          Number(sale.total_amount).toFixed(2),
        ];
      }),
      [],
      ["အကျဉ်းချုပ်"],
      ["အရောင်း စုစုပေါင်း (ပြန်အမ်း မပါ)", grossSales.toFixed(2)],
      ["ကုန်ကျစရိတ် (COGS)", metrics.cogs.toFixed(2)],
      ["အကြမ်း အမြတ်", grossProfit.toFixed(2)],
      ["အသုံးစရိတ်", totalExpenses.toFixed(2)],
      ["အသားတင် အမြတ်", netProfit.toFixed(2)],
      ["လက်ကျန် အကြွေး စုစုပေါင်း", activeDebt.toFixed(2)],
      ["ကုန်ပစ္စည်း တန်ဖိုး စုစုပေါင်း", inventoryAssetValue.toFixed(2)],
      ["တစ်သက်တာ အသားတင် အမြတ်", lifetimeNet.toFixed(2)],
      [],
      ["ငွေပေးချေမှု ခွဲခြမ်းစိတ်ဖြာချက်"],
      ["ငွေသား ဝင်ငွေ", paymentBuckets.cashIn.toFixed(2)],
      ["KBZ Pay ဝင်ငွေ", paymentBuckets.kbzIn.toFixed(2)],
      ["Wave Pay ဝင်ငွေ", paymentBuckets.waveIn.toFixed(2)],
      ["အကြွေး ထုတ်ပေးထားသော ငွေ", paymentBuckets.creditIssued.toFixed(2)],
      ["အကြွေး ပြန်ဆပ်ငွေ", debtPayments.reduce((sum, dp) => sum + Math.max(Number(dp.amount), 0), 0).toFixed(2)],
      ["ပြန်အမ်းငွေ", metrics.refundedTotal.toFixed(2)],
      ["ငွေသား အသုံးစရိတ်", paymentBuckets.cashExpenses.toFixed(2)],
      ["လက်ကျန် ငွေသား", netCashOnHand.toFixed(2)],
    ];
    downloadCsv("Master_Financial_Report.csv", [...rows, ...legacy]);
  };

  const exportCsv = () => {
    if (sales.length === 0) {
      toast.error("ဤအချိန်ကာလတွင် အရောင်းမှတ်တမ်း မရှိပါ");
      return;
    }
    if (isPro) exportMasterFinancial();
    else exportDailySummary();
  };

  const cards = [
    { label: "စုစုပေါင်း ဝင်ငွေ", value: fmt(metrics.revenue), icon: DollarSign },
    { label: "အရောင်းပြေစာ အရေအတွက်", value: String(metrics.transactions), icon: Receipt },
    { label: "ရောင်းရသော ပစ္စည်းအရေအတွက်", value: String(metrics.units), icon: Package },
    { label: "ပျမ်းမျှ ဝယ်ယူမှု ပမာဏ", value: fmt(metrics.average), icon: TrendingUp },
  ];

  const profitCards = [
    { label: "လက်ကျန် အကြွေး စုစုပေါင်း", value: fmt(activeDebt), icon: HandCoins, pro: false },
    { label: "ပြန်အမ်းငွေ", value: fmt(metrics.refundedTotal), icon: Receipt, pro: false },
    { label: "အသုံးစရိတ်", value: fmt(totalExpenses), icon: Wallet, pro: true },
    { label: "ကုန်ကျစရိတ် (COGS)", value: fmt(metrics.cogs), icon: Wallet, pro: true },
    { label: "အကြမ်း အမြတ်", value: fmt(grossProfit), icon: TrendingUp, pro: true },
    { label: "အသားတင် အမြတ်", value: fmt(netProfit), icon: PiggyBank, pro: true },
    { label: "ကုန်ပစ္စည်း တန်ဖိုး စုစုပေါင်း", value: fmt(inventoryAssetValue), icon: Package, pro: true },
    { label: "တစ်သက်တာ အသားတင် အမြတ်", value: fmt(lifetimeNet), icon: PiggyBank, pro: true },
  ];

  return (
    <PosShell title="အရောင်း စာရင်းဇယား Analysis">
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {ranges.map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-medium capitalize",
                  range === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {RANGE_LABEL[key]}
              </button>
            ))}
          </div>
          {!isPro && (
            <span className="text-[11px] text-muted-foreground">
              အချိန်ကာလ ပိုမို ရွေးချယ်ရန် Pro လိုအပ်သည်
            </span>
          )}
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">မှ</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
              />
            </div>
          )}
          <button
            onClick={exportCsv}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV ထုတ်ယူမည်
            {!isPro && <span className="ml-1 text-[10px] text-muted-foreground">(အခြေခံ)</span>}
          </button>
          {isPro && (
            <button
              onClick={() => setEodOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
            >
              <Printer className="h-4 w-4" /> နေ့ချုပ် ပရင့်
            </button>
          )}

        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 truncate text-xl font-semibold tabular-nums sm:text-2xl">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {profitCards.map((card) => (
            <ProLock key={card.label} locked={card.pro && !isPro}>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 truncate text-xl font-semibold tabular-nums sm:text-2xl">
                {card.value}
              </p>
            </div>
            </ProLock>
          ))}
        </div>

        {isPro && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-4">
            {[
              { label: "ငွေသား", value: paymentBuckets.cashIn },
              { label: "KBZ Pay", value: paymentBuckets.kbzIn },
              { label: "Wave Pay", value: paymentBuckets.waveIn },
              { label: "အကြွေး ထုတ်ပေးငွေ", value: paymentBuckets.creditIssued },
            ].map((b) => (
              <div key={b.label}>
                <p className="text-xs text-muted-foreground">{b.label}</p>
                <p className="mt-1 truncate text-lg font-semibold tabular-nums">{fmt(b.value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">ဝင်ငွေ အခြေအနေ</h2>
            <div className="h-60 lg:h-64">
              {trend.length === 0 ? (
                <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  {loading ? "ရယူနေသည်..." : "ဤရက်စွဲ အကွာအဝေးတွင် အရောင်းမှတ်တမ်း မရှိသေးပါ။"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">အရောင်းရဆုံး ၅ မျိုး</h2>
            <div className="h-60 lg:h-64">
              {topProducts.length === 0 ? (
                <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  {loading ? "ရယူနေသည်..." : "ဤရက်စွဲ အကွာအဝေးတွင် ကုန်ပစ္စည်း အရောင်းမှတ်တမ်း မရှိသေးပါ။"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--foreground)",
                      }}
                    />
                    <Bar dataKey="quantity" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </PosShell>
  );
}
