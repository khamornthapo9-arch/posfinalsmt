import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, HandCoins, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import { useAccountingStore, type Customer } from "@/lib/accounting-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

// ... Routes Head definition stays as is ...

function CustomersPage() {
  const { enabled, customers, saveCustomer, deleteCustomer, settleCustomerDebt } =
    useAccountingStore();
  const { fmt, isPro } = useStoreSettings();
  const { isBranchDevice } = useAuth();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [settling, setSettling] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [customers, query]);

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
      ...debtors.map((c) => [c.name, c.phone || "-", c.balance.toString(), c.notes || "-"]),
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `debt_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("အကြွေးစာရင်း အစီရင်ခံစာ ထုတ်ယူပြီးပါပြီ");
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

  return (
    <PosShell
      title="ဖောက်သည်များနှင့် အကြွေးစာရင်း"
      subtitle={`အကြွေးကျန်သူ ${debtorCount} ဦး · စုစုပေါင်း အကြွေး ${fmt(totalDebt)}`}
    >
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ဖောက်သည် ရှာဖွေရန်"
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* အကြွေးစာရင်း Report ထုတ်ရန် ခလုတ် */}
          <button
            onClick={exportDebtCsv}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-xs font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" /> အကြွေးစာရင်း Report (CSV)
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

        {/* ဆိုင်ခွဲစက်များအတွက် သတိပေးချက် Bar */}
        {isBranchDevice && (
          <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            * ဆိုင်ခွဲစက်တွင် ဖောက်သည် အသစ်စာရင်းသွင်းခွင့် မရှိပါ။ စာရင်းရှိပြီး ဖောက်သည်များထံသို့ အကြွေးရောင်းချခြင်းနှင့် ငွေလက်ခံခြင်းသာ ပြုလုပ်နိုင်ပါသည်။
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">အမည်</th>
                <th className="px-4 py-3">ဖုန်း</th>
                <th className="px-4 py-3 text-right">အကြွေး လက်ကျန်</th>
                <th className="px-4 py-3 text-right">လုပ်ဆောင်ချက်များ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? "—"}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      customer.balance > 0 && "font-semibold text-destructive",
                    )}
                  >
                    {fmt(customer.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setSettling(customer)}
                        aria-label="ငွေပြန်ဆပ်ရန်"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
                      >
                        <HandCoins className="h-3.5 w-3.5" /> ငွေသွင်း
                      </button>
                      {/* ဆိုင်ခွဲတွင် ဖောက်သည်အချက်အလက် ပြင်/ဖျက်ခြင်းကို ဖျောက်ထားမည် */}
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
                            onClick={() => void deleteCustomer(customer.id)}
                            aria-label="ဖျက်ရန်"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* ... SettleModal and Customer edit modal stay as is ... */}
