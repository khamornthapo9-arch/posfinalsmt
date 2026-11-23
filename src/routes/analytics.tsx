import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const RevenueTrendChart = lazy(() =>
  import("@/components/lazy/analytics-charts").then((m) => ({ default: m.RevenueTrendChart })),
);
const TopProductsChart = lazy(() =>
  import("@/components/lazy/analytics-charts").then((m) => ({ default: m.TopProductsChart })),
);

const chartFallback = <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />;

import {
  DollarSign,
  HandCoins,
  Package,
  PiggyBank,
  Printer,
  Receipt,
  Send,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { ProLock } from "@/components/pos/pro-lock";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/pos-utils";
import { useStoreSettings } from "@/lib/use-store-settings";
import { usePos } from "@/lib/pos-store";
import { cn } from "@/lib/utils";
import { sendStoreTelegramReport } from "@/lib/telegram-report.functions";

export const Route = createFileRoute("/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "အရောင်း စာရင်းဇယား Analysis — Counter Point of Sale" },
      {
        name: "description",
        content: "ကုန်ပစ္စည်းများကို စစ်ဆေးရန်နှင့် CSV ထုတ်ယူရန်။",
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

function AnalyticsPage() {
  const { isPro, fmt, symbol, store } = useStoreSettings();
  const { items } = usePos();
  const [range, setRange] = useState<RangeKey>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eodOpen, setEodOpen] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Fetch sales transactions for active store
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("sales")
          .select("*, sale_items(*)")
          .order("created_at", { ascending: false });
        if (store?.id) {
          query = query.eq("store_id", store.id);
        }
        const { data, error } = await query;
        if (!error && active) {
          setTransactions(data || []);
        }
      } catch (err) {
        console.error("Sales fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [store?.id]);

  // Filter range
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return transactions.filter((t) => {
      const created = new Date(t.created_at).getTime();
      if (range === "today") return created >= startOfToday;
      if (range === "yesterday") {
        const startOfYesterday = startOfToday - 86400000;
        return created >= startOfYesterday && created < startOfToday;
      }
      if (range === "week") {
        const startOfWeek = startOfToday - 7 * 86400000;
        return created >= startOfWeek;
      }
      if (range === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return created >= startOfMonth;
      }
      if (range === "custom" && customStart && customEnd) {
        const s = new Date(customStart).getTime();
        const e = new Date(customEnd).getTime() + 86400000;
        return created >= s && created <= e;
      }
      return true;
    });
  }, [transactions, range, customStart, customEnd]);

  // Aggregate metrics
  const totals = useMemo(() => {
    let grossSales = 0;
    let refunds = 0;
    let costOfGoods = 0;
    let ordersCount = 0;

    for (const t of filtered) {
      const isRefund = t.status === "REFUNDED" || t.is_refund;
      const amount = Number(t.total_amount ?? t.total ?? 0);
      grossSales += amount;
      if (isRefund) {
        refunds += amount;
      } else {
        ordersCount += 1;
        const lineItems = t.sale_items || t.transaction_items || [];
        for (const item of lineItems) {
          const matchedItem = items.find((i) => i.id === item.item_id);
          const buyPrice = matchedItem?.cost_price || 0;
          costOfGoods += buyPrice * (item.quantity || 1);
        }
      }
    }

    const netSales = Math.max(0, grossSales - refunds);
    const netProfit = Math.max(0, netSales - costOfGoods);
    return {
      grossSales,
      refunds,
      netSales,
      costOfGoods,
      netProfit,
      ordersCount,
    };
  }, [filtered, items]);

  // Payment Breakdown
  const paymentBuckets = useMemo(() => {
    let cashIn = 0;
    let kbzIn = 0;
    let waveIn = 0;
    let creditIssued = 0;

    for (const t of filtered) {
      const isRefund = t.status === "REFUNDED" || t.is_refund;
      if (isRefund) continue;
      const amt = Number(t.total_amount ?? t.total ?? 0);
      const method = String(t.payment_method || "").toLowerCase();
      if (method.includes("kbz") || method.includes("kpay")) {
        kbzIn += amt;
      } else if (method.includes("wave")) {
        waveIn += amt;
      } else if (method.includes("credit") || method.includes("အကြွေး")) {
        creditIssued += amt;
      } else {
        cashIn += amt;
      }
    }

    return { cashIn, kbzIn, waveIn, creditIssued };
  }, [filtered]);

  // Chart data formatting
  const trendData = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const t of filtered) {
      const isRefund = t.status === "REFUNDED" || t.is_refund;
      if (isRefund) continue;
      const d = new Date(t.created_at).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
      });
      byDate[d] = (byDate[d] || 0) + Number(t.total_amount ?? t.total ?? 0);
    }
    return Object.entries(byDate).map(([date, revenue]) => ({ date, revenue }));
  }, [filtered]);

  const topProductsData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filtered) {
      const isRefund = t.status === "REFUNDED" || t.is_refund;
      if (isRefund) continue;
      const lineItems = t.sale_items || t.transaction_items || [];
      for (const item of lineItems) {
        const matchedItem = items.find((i) => i.id === item.item_id);
        const name = matchedItem?.name || "ပစ္စည်း";
        counts[name] = (counts[name] || 0) + Number(item.quantity || 1);
      }
    }
    return Object.entries(counts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filtered, items]);

  // Send to Telegram
  const handleSendTelegram = async () => {
    if (!store) return;
    setSendingTelegram(true);
    try {
      const res = await sendStoreTelegramReport({
        data: {
          storeId: store.id,
          storeName: store.name,
          currencySymbol: symbol,
          dateStr: new Date().toLocaleDateString("en-GB"),
          grossSales: totals.grossSales,
          refunds: totals.refunds,
          netSales: totals.netSales,
          estimatedProfit: totals.netProfit,
          ordersCount: totals.ordersCount,
          cashIn: paymentBuckets.cashIn,
          kbzIn: paymentBuckets.kbzIn,
          waveIn: paymentBuckets.waveIn,
          creditIssued: paymentBuckets.creditIssued,
          closedBy: "ကောင်တာ စာရင်းပိတ်",
          isTest: false,
        },
      });
      if (res.success) {
        toast.success("Telegram သို့ နေ့ချုပ်စာရင်း ပို့ပြီးပါပြီ!");
      } else {
        toast.error("ပို့၍မရပါ: " + res.error);
      }
    } catch (e: any) {
      toast.error("ချိတ်ဆက်မှု မအောင်မြင်ပါ: " + e?.message);
    } finally {
      setSendingTelegram(false);
    }
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["ID", "Date", "Total", "Refund", "Payment"],
      ...filtered.map((t) => [
        String(t.id),
        new Date(t.created_at).toLocaleString(),
        Number(t.total_amount ?? t.total ?? 0),
        t.status === "REFUNDED" || t.is_refund ? "Yes" : "No",
        String(t.payment_method || "Cash"),
      ]),
    ];
    downloadCsv(`sales-${range}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("CSV ထုတ်ယူပြီးပါပြီ");
  };

  const ranges = isPro ? PRO_RANGES : FREE_RANGES;
  const telegramChatId = (store as any)?.telegram_chat_id;

  const cards = [
    { label: "စုစုပေါင်း အရောင်း", value: fmt(totals.grossSales), icon: DollarSign },
    { label: "အသားတင် အရောင်း", value: fmt(totals.netSales), icon: TrendingUp },
    { label: "ပြန်အမ်းငွေ", value: `-${fmt(totals.refunds)}`, icon: HandCoins },
    { label: "အော်ဒါ စုစုပေါင်း", value: `${totals.ordersCount} စောင်`, icon: Receipt },
  ];

  const profitCards = [
    { label: "ခန့်မှန်း အသားတင်အမြတ်", value: fmt(totals.netProfit), icon: PiggyBank, pro: true },
    { label: "ကုန်ကျစရိတ် (COGS)", value: fmt(totals.costOfGoods), icon: Package, pro: true },
  ];

  return (
    <PosShell title="အရောင်း စာရင်းဇယား Analysis">
      <div className="min-h-[calc(100dvh-var(--pos-chrome,64px)-var(--pos-bottom-nav,0px))] space-y-4 overflow-y-auto bg-muted/30 p-3 sm:p-5">
        {/* Date Filters + Compact Report Action Menu */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  range === r
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}

            {range === "custom" && isPro && (
              <div className="ml-1 flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                />
              </div>
            )}
          </div>

          {/* Collapsed Actions Dropdown (CSV, Print EOD & Telegram) */}
          <div className="relative ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionMenuOpen((prev) => !prev)}
              className="h-8 gap-1 rounded-sm text-xs"
            >
              အစီရင်ခံစာ ထုတ်ယူရန် ▾
            </Button>

            {actionMenuOpen && (
              <div className="absolute right-0 top-9 z-50 w-52 rounded-md border border-border bg-card p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActionMenuOpen(false);
                    exportCsv();
                  }}
                  className="w-full rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-accent"
                >
                  CSV ထုတ်ယူမည်
                </button>
                {isPro && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false);
                      setEodOpen(true);
                    }}
                    className="flex w-full items-center gap-1.5 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-accent"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    နေ့ချုပ် ပရင့်ထုတ်မည်
                  </button>
                )}
                {telegramChatId && (
                  <button
                    type="button"
                    disabled={sendingTelegram}
                    onClick={() => {
                      setActionMenuOpen(false);
                      void handleSendTelegram();
                    }}
                    className="flex w-full items-center gap-1.5 rounded-sm px-3 py-2 text-left text-xs font-medium text-sky-500 hover:bg-sky-500/10 disabled:opacity-50"
                  >
                    {sendingTelegram ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Telegram နေ့ချုပ်ပို့မည်
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="report-metric rounded-md border border-border bg-card p-4 shadow-xs"
            >
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-lg font-bold tabular-nums text-foreground sm:text-2xl">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Profit Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {profitCards.map((card) => (
            <ProLock key={card.label} locked={card.pro && !isPro}>
              <div className="report-metric rounded-md border border-border bg-card p-4 shadow-xs">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-foreground sm:text-2xl">
                  {card.value}
                </p>
              </div>
            </ProLock>
          ))}
        </div>

        {/* Payment Channels Split */}
        {isPro && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-4 shadow-xs lg:grid-cols-4">
            {[
              { label: "ငွေသား (Cash)", value: paymentBuckets.cashIn },
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

        {/* Lazy Charts */}
        {isPro && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4 shadow-xs">
              <h3 className="mb-4 text-sm font-semibold">အရောင်း ဝင်ငွေ လားရာ</h3>
              <div className="h-64">
                <Suspense fallback={chartFallback}>
                  <RevenueTrendChart data={trendData} fmt={fmt} />
                </Suspense>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4 shadow-xs">
              <h3 className="mb-4 text-sm font-semibold">အရောင်းရဆုံး ပစ္စည်းများ</h3>
              <div className="h-64">
                <Suspense fallback={chartFallback}>
                  <TopProductsChart data={topProductsData} />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {loading && !transactions.length && (
          <p className="text-xs text-muted-foreground">စာရင်းများ ရယူနေသည်...</p>
        )}
      </div>
    </PosShell>
  );
}
