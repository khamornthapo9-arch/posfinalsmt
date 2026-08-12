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
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/pos-utils";
import { useStoreSettings } from "@/lib/use-store-settings";
import { useAccountingStore, CREDIT_METHOD } from "@/lib/accounting-store";
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

type RangeKey = "today" | "week" | "month" | "custom";

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
  if (range === "week") d.setDate(d.getDate() - 6);
  if (range === "month") d.setDate(d.getDate() - 29);
  return d;
}

function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("week");
  const [from, setFrom] = useState(() => startOf("week").toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt } = useStoreSettings();
  const { customers, expenses } = useAccountingStore();

  const fromDate = range === "custom" ? new Date(`${from}T00:00:00`) : startOf(range);
  const toDate = range === "custom" ? new Date(`${to}T23:59:59`) : new Date();
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  useEffect(() => {
    let active = true;
    setLoading(true);
    void supabase
      .from("sales")
      .select(
        "id,total_amount,payment_method,is_offline_sync,created_at,status,customer_id,customers(name,phone,balance,customer_type),sale_items(quantity,unit_price,items(name,cost_price))",
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at")
      .then(({ data }) => {
        if (!active) return;
        setSales((data ?? []) as unknown as SaleRow[]);
        setLoading(false);
      });
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
    };
  }, [sales]);

  const rangeExpenses = useMemo(
    () =>
      expenses
        .filter((e) => {
          const d = new Date(e.spent_at).getTime();
          return d >= fromDate.getTime() && d <= toDate.getTime();
        })
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, fromIso, toIso],
  );

  const activeDebt = useMemo(
    () => customers.reduce((sum, c) => sum + Math.max(c.balance, 0), 0),
    [customers],
  );
  const grossProfit = metrics.revenue - metrics.cogs;
  const netProfit = grossProfit - rangeExpenses;

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

  const exportCsv = () => {
    const rows: (string | number)[][] = [
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
      ["စုစုပေါင်း ဝင်ငွေ", metrics.revenue.toFixed(2)],
      ["ကုန်ကျစရိတ် (COGS)", metrics.cogs.toFixed(2)],
      ["အကြမ်း အမြတ်", grossProfit.toFixed(2)],
      ["အသုံးစရိတ်", rangeExpenses.toFixed(2)],
      ["အသားတင် အမြတ်", netProfit.toFixed(2)],
      ["လက်ကျန် အကြွေး စုစုပေါင်း", activeDebt.toFixed(2)],
    ];
    downloadCsv(`smt-pos-master-${from}-to-${to}.csv`, rows);
  };

  const cards = [
    { label: "စုစုပေါင်း ဝင်ငွေ", value: fmt(metrics.revenue), icon: DollarSign },
    { label: "အရောင်းပြေစာ အရေအတွက်", value: String(metrics.transactions), icon: Receipt },
    { label: "ရောင်းရသော ပစ္စည်းအရေအတွက်", value: String(metrics.units), icon: Package },
    { label: "ပျမ်းမျှ ဝယ်ယူမှု ပမာဏ", value: fmt(metrics.average), icon: TrendingUp },
  ];

  const profitCards = [
    { label: "လက်ကျန် အကြွေး စုစုပေါင်း", value: fmt(activeDebt), icon: HandCoins },
    { label: "ပြန်အမ်းငွေ", value: fmt(metrics.refundedTotal), icon: Receipt },
    { label: "အသုံးစရိတ်", value: fmt(rangeExpenses), icon: Wallet },
    { label: "အကြမ်း အမြတ်", value: fmt(grossProfit), icon: TrendingUp },
    { label: "အသားတင် အမြတ်", value: fmt(netProfit), icon: PiggyBank },
  ];

  return (
    <PosShell title="အရောင်း စာရင်းဇယား Analysis">
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["today", "week", "month", "custom"] as RangeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-medium capitalize",
                  range === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {key === "today"
                  ? "ဒီနေ့"
                  : key === "week"
                  ? "ဒီတစ်ပတ်"
                  : key === "month"
                  ? "ဒီလ"
                  : "ရှာရန်"}
              </button>
            ))}
          </div>
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
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> CSV ထုတ်ယူမည်
          </button>
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {profitCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 truncate text-xl font-semibold tabular-nums sm:text-2xl">
                {card.value}
              </p>
            </div>
          ))}
        </div>

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
