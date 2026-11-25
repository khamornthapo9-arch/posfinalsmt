import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { CustomerForm } from "@/components/pos/customer-form";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_METHOD, useAccountingStore } from "@/lib/accounting-store";
import { useAuth } from "@/lib/auth-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers_/$customerId")({
  ssr: false,
  head: () => ({
    meta: [{ title: "ဖောက်သည် အချက်အလက် — SMT POS" }, { name: "twitter:card", content: "summary" }],
  }),
  component: CustomerDetailPage,
});

const PAGE_SIZE = 15;
const SUMMARY_CAP = 1000;

interface SummarySale {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_breakdown: unknown;
  created_at: string;
}

interface HistorySale extends SummarySale {
  payment_status: string;
  sale_items:
    | { quantity: number; unit_price: number; items: { name: string; sku: string | null } | null }[]
    | null;
}

/** Credit part of a sale, from its payment breakdown (or the whole sale for a pure-credit sale). */
function creditPortion(sale: SummarySale): number {
  const parts = Array.isArray(sale.payment_breakdown)
    ? (sale.payment_breakdown as { method?: string; amount?: number }[])
    : [];
  if (parts.length > 0) {
    return parts
      .filter((p) => p.method === CREDIT_METHOD)
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  }
  return sale.payment_method === CREDIT_METHOD ? Number(sale.total_amount) : 0;
}

const STATUS_LABEL: Record<string, string> = { COMPLETED: "ပြီးစီး", REFUNDED: "ပြန်အမ်းပြီး" };
const PAYMENT_LABEL: Record<string, string> = {
  PAID: "ပေးပြီး",
  PARTIAL: "တစ်စိတ်တစ်ပိုင်း",
  UNPAID: "အကြွေး",
  REFUNDED: "ပြန်အမ်းပြီး",
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const {
    customers,
    setCustomerArchived,
    saveCustomer,
    loading: accountingLoading,
  } = useAccountingStore();
  const { store, isBranchDevice } = useAuth();
  const { fmt } = useStoreSettings();
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const storeId = store?.id ?? null;

  const [summary, setSummary] = useState<SummarySale[] | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [history, setHistory] = useState<HistorySale[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const historyRequest = useRef(0);

  // Opening a different customer must not keep the previous customer's page or open row.
  useEffect(() => {
    setPage(0);
    setExpanded(null);
  }, [customerId]);

  // Both queries are filtered by store here and again by RLS on the server.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setSummary(null);
    setSummaryError(false);
    void supabase
      .from("sales")
      .select("id,total_amount,status,payment_method,payment_breakdown,created_at")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(SUMMARY_CAP)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setSummaryError(true);
        else setSummary((data ?? []).map((r) => ({ ...r, total_amount: Number(r.total_amount) })));
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, customerId]);

  const loadHistory = useCallback(async () => {
    if (!storeId) return;
    const request = ++historyRequest.current;
    setHistory(null);
    setHistoryError(false);
    const { data, error, count } = await supabase
      .from("sales")
      .select(
        "id,total_amount,status,payment_status,payment_method,payment_breakdown,created_at,sale_items(quantity,unit_price,items(name,sku))",
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    // A newer page/customer was requested while this one loaded: drop the stale answer.
    if (request !== historyRequest.current) return;
    if (error) {
      setHistoryError(true);
      return;
    }
    setTotal(count ?? 0);
    setHistory(
      (data ?? []).map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
      })) as unknown as HistorySale[],
    );
  }, [storeId, customerId, page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Refunded/voided sales are shown in history but never counted as completed purchases.
  const stats = useMemo(() => {
    if (!summary) return null;
    const done = summary.filter((s) => s.status === "COMPLETED");
    const totalSales = done.reduce((sum, s) => sum + s.total_amount, 0);
    const credit = done.reduce((sum, s) => sum + creditPortion(s), 0);
    return {
      count: done.length,
      totalSales,
      credit,
      paid: totalSales - credit,
      last: done[0]?.created_at ?? null,
      capped: summary.length >= SUMMARY_CAP,
    };
  }, [summary]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!customer) {
    return (
      <PosShell title="ဖောက်သည်">
        <div className="space-y-3 p-4 text-center">
          {accountingLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <p className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-sm text-muted-foreground">
                ဖောက်သည် မတွေ့ပါ (သို့) အဆင့်မြင့် စာရင်းကိုင် မုဒ် ပိတ်ထားသည်။
              </p>
              <Link to="/customers" className="text-sm font-medium text-primary hover:underline">
                ဖောက်သည်စာရင်းသို့ ပြန်သွားရန်
              </Link>
            </>
          )}
        </div>
      </PosShell>
    );
  }

  const archived = Boolean(customer.archived_at);

  const toggleArchive = () => {
    if (
      !archived &&
      !window.confirm(`${customer.name} ကို သိမ်းထားမလား? (အရောင်းမှတ်တမ်းများ မပျက်ပါ)`)
    ) {
      return;
    }
    void setCustomerArchived(customer.id, !archived)
      .then(() =>
        toast.success(
          archived ? "ဖောက်သည်ကို ပြန်ဖွင့်ပြီးပါပြီ" : "ဖောက်သည်ကို သိမ်းထားပြီးပါပြီ",
        ),
      )
      .catch(() => toast.error("မအောင်မြင်ပါ — database update ကို အရင် သုံးထားရန် လိုနိုင်သည်"));
  };

  const stat = (label: string, value: string, hint?: string, tone?: string) => (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-base font-semibold tabular-nums", tone)}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <PosShell
      title={customer.name}
      subtitle={archived ? "သိမ်းထားသော ဖောက်သည်" : (customer.phone ?? "")}
      actions={
        !isBranchDevice ? (
          <>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" /> ပြင်ရန်
            </button>
            <button
              onClick={toggleArchive}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent"
            >
              {archived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              <span className="max-sm:sr-only">{archived ? "ပြန်ဖွင့်ရန်" : "သိမ်းထားရန်"}</span>
            </button>
          </>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        {/* Overview */}
        <section
          aria-label="ဖောက်သည် အချက်အလက်"
          className="rounded-md border border-border bg-card p-4"
        >
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-[11px] text-muted-foreground">ဖုန်း</dt>
                <dd>{customer.phone || "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-[11px] text-muted-foreground">အီးမေးလ်</dt>
                <dd className="break-words">{customer.email || "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <dt className="text-[11px] text-muted-foreground">လိပ်စာ</dt>
                <dd className="break-words">{customer.address || "—"}</dd>
              </div>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] text-muted-foreground">မှတ်ချက်</dt>
              <dd className="break-words">{customer.note || "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Purchase summary: only completed sales; the debt balance is the ledger value, not derived here */}
        <section aria-label="ဝယ်ယူမှု အနှစ်ချုပ်">
          {summaryError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              အနှစ်ချုပ် ဖတ်၍ မရပါ။ ချိတ်ဆက်မှု စစ်ပြီး ထပ်ကြိုးစားပါ။
            </p>
          ) : !stats ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {stat("ပြီးစီးသော အရောင်း", String(stats.count), "အကြိမ်")}
                {stat("စုစုပေါင်း ရောင်းရငွေ", fmt(stats.totalSales))}
                {stat("ရောင်းချစဉ် ပေးချေငွေ", fmt(stats.paid), "အကြွေးမပါ")}
                {stat("အကြွေးဖြင့် ရောင်းငွေ", fmt(stats.credit))}
                {stat(
                  "လက်ကျန် အကြွေး",
                  fmt(customer.balance),
                  "လက်ရှိ စာရင်း",
                  customer.balance > 0 ? "text-destructive" : undefined,
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                နောက်ဆုံး ဝယ်ယူသည့်ရက် — {stats.last ? new Date(stats.last).toLocaleString() : "—"}
                {stats.capped && ` · နောက်ဆုံး ${SUMMARY_CAP} ခုအထိသာ တွက်ထားသည်`}
                {
                  " · ပြန်အမ်း/ပယ်ဖျက်ထားသော အရောင်းများ မပါ၊ အော့ဖ်လိုင်း မတင်ရသေးသော အရောင်းများ မပါ"
                }
              </p>
            </>
          )}
        </section>

        {/* Purchase history */}
        <section aria-label="ဝယ်ယူမှု မှတ်တမ်း" className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
            ဝယ်ယူမှု မှတ်တမ်း
          </h2>
          {historyError ? (
            <div className="space-y-2 px-4 py-8 text-center">
              <p className="text-sm text-destructive">မှတ်တမ်း ဖတ်၍ မရပါ။</p>
              <button
                onClick={() => void loadHistory()}
                className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
              >
                ထပ်ကြိုးစားမည်
              </button>
            </div>
          ) : !history ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              ဤဖောက်သည်အတွက် အရောင်းမှတ်တမ်း မရှိသေးပါ။
            </p>
          ) : (
            <ul>
              {history.map((sale) => {
                const open = expanded === sale.id;
                const lines = sale.sale_items ?? [];
                const itemCount = lines.reduce((sum, l) => sum + Number(l.quantity), 0);
                const voided = sale.status !== "COMPLETED";
                return (
                  <li key={sale.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : sale.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                          <span className="tabular-nums">#{shortId(sale.id)}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              voided
                                ? "bg-destructive/10 text-destructive"
                                : "bg-success/10 text-success",
                            )}
                          >
                            {STATUS_LABEL[sale.status] ?? sale.status}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {PAYMENT_LABEL[sale.payment_status] ?? sale.payment_status}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString()} · {itemCount} ခု
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          voided && "line-through opacity-60",
                        )}
                      >
                        {fmt(sale.total_amount)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                    {open && (
                      <div className="bg-muted/30 px-4 pb-3 pt-1">
                        {lines.length === 0 ? (
                          <p className="py-2 text-xs text-muted-foreground">
                            ပစ္စည်း အသေးစိတ် မရှိပါ။
                          </p>
                        ) : (
                          <ul className="divide-y divide-border text-sm">
                            {lines.map((line, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between gap-3 py-1.5"
                              >
                                <span className="min-w-0 truncate">
                                  {line.items?.name ?? "—"}
                                  <span className="text-xs text-muted-foreground">
                                    {" "}
                                    × {Number(line.quantity)}
                                  </span>
                                </span>
                                <span className="shrink-0 tabular-nums">
                                  {fmt(Number(line.unit_price) * Number(line.quantity))}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-9 rounded-md border border-border px-3 font-medium hover:bg-accent disabled:opacity-40"
              >
                နောက်သို့
              </button>
              <span className="tabular-nums text-muted-foreground">
                {page + 1} / {pageCount}
              </span>
              <button
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 rounded-md border border-border px-3 font-medium hover:bg-accent disabled:opacity-40"
              >
                ရှေ့သို့
              </button>
            </div>
          )}
        </section>
      </div>

      {editing && !isBranchDevice && (
        <CustomerForm
          customer={customer}
          customers={customers}
          onClose={() => setEditing(false)}
          onSave={async (values) => {
            try {
              await saveCustomer(values);
              setEditing(false);
              toast.success("ဖောက်သည် သိမ်းဆည်းပြီးပါပြီ");
            } catch {
              toast.error("ဖောက်သည် မသိမ်းနိုင်ပါ — ထပ်ကြိုးစားပါ");
            }
          }}
        />
      )}
    </PosShell>
  );
}
