import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Download,
  HandCoins,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import { useAccountingStore, type Customer } from "@/lib/accounting-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/pos/customer-form";
import { PAY_METHODS } from "@/lib/pay-methods";

export const Route = createFileRoute("/customers")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ဖောက်သည်များနှင့် အကြွေးစာရင်း — SMT POS" },
      {
        name: "description",
        content:
          "ဖောက်သည် စာရင်းနှင့် အကြွေးလက်ကျန်များကို စီမံခန့်ခွဲပြီး ပြန်ဆပ်ငွေများကို မှတ်တမ်းတင်ပါ။",
      },
      { property: "og:title", content: "ဖောက်သည်များနှင့် အကြွေးစာရင်း — SMT POS" },
      {
        property: "og:description",
        content: "SMT POS ဖောက်သည် အကြွေးစာရင်း စီမံခန့်ခွဲမှု။",
      },
    ],
  }),
  component: CustomersPage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

type StatusFilter = "active" | "archived" | "all";
type TypeFilter = "all" | "regular" | "quick";

const isQuick = (c: Customer) => c.customer_type === "QUICK";

function CustomersPage() {
  const { enabled, customers, saveCustomer, setCustomerArchived, settleCustomerDebt } =
    useAccountingStore();
  const { fmt, isPro } = useStoreSettings();
  const { isBranchDevice } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [type, setType] = useState<TypeFilter>("all");
  const [debtOnly, setDebtOnly] = useState(false);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [settling, setSettling] = useState<Customer | null>(null);

  const activeCustomers = useMemo(() => customers.filter((c) => !c.archived_at), [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (status === "active" && c.archived_at) return false;
      if (status === "archived" && !c.archived_at) return false;
      if (type === "quick" && !isQuick(c)) return false;
      if (type === "regular" && isQuick(c)) return false;
      if (debtOnly && !(c.balance > 0)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q);
    });
  }, [customers, query, status, type, debtOnly]);

  // Debt totals include archived customers: archiving hides a customer, it does not cancel what they owe.
  const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);
  const debtorCount = customers.filter((c) => c.balance > 0).length;

  // အကြွေးစာရင်း CSV အစီရင်ခံစာ ထုတ်ယူရန်
  const exportDebtCsv = () => {
    const debtors = customers.filter((c) => c.balance > 0);
    if (debtors.length === 0) {
      toast.info("အကြွေးကျန်ရှိသော ဖောက်သည် မရှိပါ");
      return;
    }
    const rows = [
      ["ဖောက်သည်အမည်", "ဖုန်းနံပါတ်", "အကြွေးကျန်ငွေ", "မှတ်ချက်"],
      ...debtors.map((c) => [c.name, c.phone || "-", c.balance.toString(), c.note || "-"]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `debt_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("အကြွေးစာရင်း အစီရင်ခံစာ ထုတ်ယူပြီးပါပြီ");
  };

  const toggleArchive = (customer: Customer) => {
    const archiving = !customer.archived_at;
    if (
      archiving &&
      !window.confirm(
        customer.balance > 0
          ? `${customer.name} တွင် အကြွေးလက်ကျန် ရှိနေသေးသည်။ သိမ်းထားလိုပါသလား? (အရောင်းမှတ်တမ်းများ မပျက်ပါ)`
          : `${customer.name} ကို သိမ်းထားမလား? (အရောင်းမှတ်တမ်းများ မပျက်ပါ)`,
      )
    ) {
      return;
    }
    void setCustomerArchived(customer.id, archiving)
      .then(() =>
        toast.success(
          archiving ? "ဖောက်သည်ကို သိမ်းထားပြီးပါပြီ" : "ဖောက်သည်ကို ပြန်ဖွင့်ပြီးပါပြီ",
        ),
      )
      .catch(() =>
        toast.error(
          "မအောင်မြင်ပါ — database update (customers.archived_at) ကို အရင် သုံးထားရန် လိုနိုင်သည်",
        ),
      );
  };

  if (!enabled) {
    return (
      <PosShell title="ဖောက်သည်များ">
        <div className="p-4">
          <p className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
            ဤမော်ဂျူးကို အသုံးပြုရန် ပြုပြင်ခြင်းတွင် အဆင့်မြင့် စာရင်းကိုင် မုဒ်ကို ဖွင့်ပါ။
          </p>
        </div>
      </PosShell>
    );
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 touch:h-10 items-center rounded-full border px-3 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card hover:bg-accent",
    );

  const rowActions = (customer: Customer) => (
    <div className="flex justify-end gap-1">
      {!customer.archived_at && (
        <button
          onClick={() => setSettling(customer)}
          aria-label="ငွေပြန်ဆပ်ရန်"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
        >
          <HandCoins className="h-3.5 w-3.5" /> ငွေသွင်း
        </button>
      )}
      {/* ဆိုင်ခွဲတွင် ဖောက်သည်အချက်အလက် ပြင်/သိမ်းခြင်းကို ဖျောက်ထားမည် */}
      {!isBranchDevice && (
        <>
          <button
            onClick={() => setEditing(customer)}
            aria-label="ပြင်ရန်"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleArchive(customer)}
            aria-label={customer.archived_at ? "ပြန်ဖွင့်ရန်" : "သိမ်းထားရန်"}
            title={customer.archived_at ? "ပြန်ဖွင့်ရန်" : "သိမ်းထားရန်"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          >
            {customer.archived_at ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </button>
        </>
      )}
    </div>
  );

  const badges = (customer: Customer) => (
    <>
      {isQuick(customer) && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          အမြန်ထည့်
        </span>
      )}
      {customer.archived_at && (
        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
          သိမ်းထား
        </span>
      )}
    </>
  );

  return (
    <PosShell
      title="ဖောက်သည်များနှင့် အကြွေးစာရင်း"
      subtitle={`အကြွေးကျန်သူ ${debtorCount} ဦး · စုစုပေါင်း အကြွေး ${fmt(totalDebt)}`}
    >
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="အမည် သို့ ဖုန်းဖြင့် ရှာပါ"
              aria-label="ဖောက်သည် ရှာဖွေရန်"
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* အကြွေးစာရင်း Report ထုတ်ရန် ခလုတ် */}
          <button
            onClick={exportDebtCsv}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-xs font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" />{" "}
            <span className="max-sm:sr-only">အကြွေးစာရင်း Report (CSV)</span>
            <span className="sm:hidden" aria-hidden="true">
              CSV
            </span>
          </button>

          {/* ဆိုင်ခွဲစက် မဟုတ်သော Owner သာ ဖောက်သည်အသစ် ထည့်သွင်းခွင့်ရှိမည် */}
          {!isBranchDevice && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> ဖောက်သည် အသစ်
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="စစ်ထုတ်ရန်">
          {(
            [
              ["active", "သုံးနေသူ"],
              ["archived", "သိမ်းထား"],
              ["all", "အားလုံး"],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              aria-pressed={status === value}
              className={chip(status === value)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          {(
            [
              ["all", "အမျိုးအစား အားလုံး"],
              ["regular", "ပုံမှန်"],
              ["quick", "အမြန်ထည့်"],
            ] as [TypeFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setType(value)}
              aria-pressed={type === value}
              className={chip(type === value)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <button
            onClick={() => setDebtOnly((v) => !v)}
            aria-pressed={debtOnly}
            className={chip(debtOnly)}
          >
            အကြွေးကျန်သူ
          </button>
        </div>

        {/* ဆိုင်ခွဲစက်များအတွက် သတိပေးချက် Bar */}
        {isBranchDevice && (
          <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            * ဆိုင်ခွဲစက်တွင် ဖောက်သည် အသစ်စာရင်းသွင်းခွင့် မရှိပါ။ စာရင်းရှိပြီး ဖောက်သည်များထံသို့
            အကြွေးရောင်းချခြင်းနှင့် ငွေလက်ခံခြင်းသာ ပြုလုပ်နိုင်ပါသည်။
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "ဖောက်သည် မရှိသေးပါ။"
              : "စစ်ထုတ်ချက်နှင့် ကိုက်ညီသော ဖောက်သည် မတွေ့ပါ။"}
          </p>
        ) : (
          <>
            {/* Phones: stacked cards, no horizontal scrolling */}
            <ul className="space-y-2 md:hidden">
              {filtered.map((customer) => (
                <li key={customer.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: customer.id }}
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-sm font-semibold">{customer.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {customer.phone ?? "—"}
                      </span>
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        customer.balance > 0
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {fmt(customer.balance)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">{badges(customer)}</div>
                    {rowActions(customer)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-md border border-border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">အမည်</th>
                    <th className="px-4 py-3">ဖုန်း</th>
                    <th className="px-4 py-3">အမျိုးအစား / အခြေအနေ</th>
                    <th className="px-4 py-3 text-right">အကြွေး လက်ကျန်</th>
                    <th className="px-4 py-3 text-right">လုပ်ဆောင်ချက်များ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        customer.archived_at && "opacity-70",
                      )}
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: customer.id }}
                          className="hover:text-primary hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">{badges(customer)}</div>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          customer.balance > 0 && "font-semibold text-destructive",
                        )}
                      >
                        {fmt(customer.balance)}
                      </td>
                      <td className="px-4 py-3">{rowActions(customer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {editing && !isBranchDevice && (
        <CustomerForm
          customer={editing === "new" ? null : editing}
          customers={customers}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (!isPro && editing === "new" && activeCustomers.length >= FREE_LIMITS.customers) {
              toast.error(
                `Standard အစီအစဉ်တွင် ဖောက်သည် ${FREE_LIMITS.customers} ဦးသာ သိမ်းနိုင်သည်`,
              );
              return;
            }
            try {
              await saveCustomer(values);
              setEditing(null);
              toast.success("ဖောက်သည် သိမ်းဆည်းပြီးပါပြီ");
            } catch {
              toast.error("ဖောက်သည် မသိမ်းနိုင်ပါ — ထပ်ကြိုးစားပါ");
            }
          }}
        />
      )}
      {settling && isPro && (
        <SettleModal
          title={`${settling.name} — ငွေပြန်ဆပ်ခြင်း`}
          balance={settling.balance}
          fmt={fmt}
          onClose={() => setSettling(null)}
          onConfirm={async (amount, method) => {
            await settleCustomerDebt({ customerId: settling.id, amount, method });
            setSettling(null);
            toast.success("ငွေပြန်ဆပ်မှုကို မှတ်တမ်းတင်ပြီးပါပြီ");
          }}
        />
      )}
    </PosShell>
  );
}

export function SettleModal({
  title,
  balance,
  fmt,
  onClose,
  onConfirm,
}: {
  title: string;
  balance: number;
  fmt: (n: number) => string;
  onClose: () => void;
  onConfirm: (amount: number, method: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [method, setMethod] = useState(PAY_METHODS[0] as string);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-4 py-6">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">လက်ကျန် — {fmt(balance)}</p>
        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="settle-amount">
              ပမာဏ
            </label>
            <input
              id="settle-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <span className={labelClass}>ငွေပေးချေမှု နည်းလမ်း</span>
            <div className="grid grid-cols-3 gap-2">
              {PAY_METHODS.map((m) => (
                <Button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "min-h-11 rounded-md border px-2 text-xs font-medium",
                    method === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button
          disabled={busy || !(Number(amount) > 0)}
          onClick={() => {
            setBusy(true);
            void onConfirm(Number(amount), method).finally(() => setBusy(false));
          }}
          className="mt-5 h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          မှတ်တမ်းတင်မည်
        </Button>
      </div>
    </div>
  );
}
