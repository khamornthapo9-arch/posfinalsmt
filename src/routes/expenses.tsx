import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ProLockButton } from "@/components/pos/pro-lock";
import { PosShell } from "@/components/pos/pos-shell";
import { useAccountingStore } from "@/lib/accounting-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";
import { PAY_METHODS } from "./customers";

export const Route = createFileRoute("/expenses")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "အသုံးစရိတ် မှတ်တမ်း — SMT POS" },
      {
        name: "description",
        content:
          "ဆိုင်၏ လည်ပတ်မှု အသုံးစရိတ်များကို မှတ်တမ်းတင်ပြီး အမြတ်တွက်ချက်မှုတွင် ထည့်သွင်းပါ။",
      },
      { property: "og:title", content: "အသုံးစရိတ် မှတ်တမ်း — SMT POS" },
      { property: "og:description", content: "SMT POS အသုံးစရိတ် စီမံခန့်ခွဲမှု။" },
    ],
  }),
  component: ExpensesPage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";
const CATEGORIES = ["ငှားခ", "လျှပ်စစ်", "လစာ", "ပို့ဆောင်စရိတ်", "အခြား"];

function ExpensesPage() {
  const { enabled, expenses, totalExpenses, saveExpense, deleteExpense } = useAccountingStore();
  const { fmt, isPro } = useStoreSettings();
  const [open, setOpen] = useState(false);

  // အသုံးစရိတ် CSV အစီရင်ခံစာ ထုတ်ယူခြင်း
  const exportExpensesCsv = () => {
    if (expenses.length === 0) {
      toast.info("အသုံးစရိတ် မှတ်တမ်း မရှိသေးပါ");
      return;
    }
    const rows = [
      ["ရက်စွဲ", "အမျိုးအစား", "မှတ်ချက်", "ပေးချေမှု နည်းလမ်း", "ပမာဏ"],
      ...expenses.map((e) => [
        e.spent_at ? e.spent_at.slice(0, 10) : "-",
        e.category || "အခြား",
        `"${(e.note || "-").replace(/"/g, '""')}"`,
        e.paid_with || "ငွေသား",
        e.amount.toString(),
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `expenses_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("အသုံးစရိတ် အစီရင်ခံစာ ထုတ်ယူပြီးပါပြီ");
  };

  if (!isPro) {
    return (
      <PosShell title="အသုံးစရိတ်">
        <div className="p-4">
          <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              အသုံးစရိတ် မှတ်တမ်းသည် Pro Plan တွင်သာ ရရှိနိုင်ပါသည်။
            </p>
            <div className="mt-3 flex justify-center">
              <ProLockButton label="Pro Plan သို့ အဆင့်မြှင့်ရန်" />
            </div>
          </div>
        </div>
      </PosShell>
    );
  }

  if (!enabled) {
    return (
      <PosShell title="အသုံးစရိတ်">
        <div className="p-4">
          <p className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
            ဤမော်ဂျူးကို အသုံးပြုရန် ပြုပြင်ခြင်းတွင် အဆင့်မြင့် စာရင်းကိုင် မုဒ်ကို ဖွင့်ပါ။
          </p>
        </div>
      </PosShell>
    );
  }

  return (
    <PosShell title="အသုံးစရိတ် မှတ်တမ်း" subtitle={`စုစုပေါင်း ကုန်ကျငွေ ${fmt(totalExpenses)}`}>
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> အသုံးစရိတ် ထည့်မည်
          </button>

          {/* အသုံးစရိတ် Report ထုတ်ရန် ခလုတ် */}
          <button
            onClick={exportExpensesCsv}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-xs font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" /> အစီရင်ခံစာ ထုတ်ယူရန် (CSV)
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ရက်စွဲ</th>
                <th className="px-4 py-3">အမျိုးအစား</th>
                <th className="px-4 py-3">မှတ်ချက်</th>
                <th className="px-4 py-3">ပေးချေမှု</th>
                <th className="px-4 py-3 text-right">ပမာဏ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {expense.spent_at.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 font-medium">{expense.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{expense.note ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{expense.paid_with}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(expense.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void deleteExpense(expense.id)}
                      aria-label="ဖျက်ရန်"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    အသုံးစရိတ် မှတ်တမ်း မရှိသေးပါ။
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <ExpenseModal
          onClose={() => setOpen(false)}
          onSave={async (values) => {
            await saveExpense(values);
            setOpen(false);
            toast.success("အသုံးစရိတ်ကို မှတ်တမ်းတင်ပြီးပါပြီ");
          }}
        />
      )}
    </PosShell>
  );
}

function ExpenseModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (values: {
    category: string;
    amount: number;
    note: string;
    paidWith: string;
    spentAt: string;
  }) => Promise<void>;
}) {
  const [category, setCategory] = useState(CATEGORIES[0] as string);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidWith, setPaidWith] = useState(PAY_METHODS[0] as string);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">အသုံးစရိတ် အသစ်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <span className={labelClass}>အမျိုးအစား</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-xs font-medium",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="e-amount">
              ပမာဏ
            </label>
            <input
              id="e-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="e-note">
              မှတ်ချက်
            </label>
            <input
              id="e-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <span className={labelClass}>ပေးချေမှု နည်းလမ်း</span>
            <div className="grid grid-cols-3 gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPaidWith(m)}
                  className={cn(
                    "min-h-11 rounded-md border px-2 text-xs font-medium",
                    paidWith === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          disabled={busy || !(Number(amount) > 0)}
          onClick={() => {
            setBusy(true);
            void onSave({
              category,
              amount: Number(amount),
              note: note.trim(),
              paidWith,
              spentAt: new Date().toISOString(),
            }).finally(() => setBusy(false));
          }}
          className="mt-5 h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          သိမ်းဆည်းမည်
        </button>
      </div>
    </div>
  );
}
