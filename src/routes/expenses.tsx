import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Ban, Download, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ProLockButton } from "@/components/pos/pro-lock";
import { PosShell } from "@/components/pos/pos-shell";
import { useAccountingStore, type Expense } from "@/lib/accounting-store";
import { useRole } from "@/lib/roles";
import { useShift } from "@/lib/shift-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";
import { PAY_METHODS } from "@/lib/pay-methods";

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
  const { enabled, expenses, totalExpenses, saveExpense, voidExpense, correctExpense } =
    useAccountingStore();
  const { fmt, isPro } = useStoreSettings();
  const { canApprove } = useRole();
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState<Expense | null>(null);
  const [voiding, setVoiding] = useState<Expense | null>(null);

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
              {expenses.map((expense) => {
                const voided = Boolean(expense.voided_at);
                return (
                  <tr
                    key={expense.id}
                    className={cn(
                      "border-b border-border last:border-0",
                      voided && "text-muted-foreground line-through opacity-60",
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {expense.spent_at.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-medium">{expense.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {expense.note ?? "—"}
                      {voided && expense.void_reason ? ` (ပယ်ဖျက်: ${expense.void_reason})` : ""}
                      {expense.replaces_expense_id ? " (ပြင်ဆင်ထားသော စာရင်း)" : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{expense.paid_with}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(expense.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      {!voided && canApprove && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setCorrecting(expense)}
                            aria-label="ပြင်ဆင်ရန်"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setVoiding(expense)}
                            aria-label="ပယ်ဖျက်ရန်"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            try {
              await saveExpense(values);
              setOpen(false);
              toast.success("အသုံးစရိတ်ကို မှတ်တမ်းတင်ပြီးပါပြီ");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "သိမ်း၍ မရပါ");
            }
          }}
        />
      )}
      {(correcting || voiding) && (
        <ReasonModal
          title={correcting ? "အသုံးစရိတ် ပြင်ဆင်ရန်" : "အသုံးစရိတ် ပယ်ဖျက်ရန်"}
          initial={correcting}
          onClose={() => {
            setCorrecting(null);
            setVoiding(null);
          }}
          onConfirm={async (reason, values) => {
            try {
              if (correcting && values) {
                await correctExpense({
                  expenseId: correcting.id,
                  reason,
                  fromDrawer: Boolean(correcting.shift_id),
                  ...values,
                });
                toast.success("ပြင်ဆင်ပြီးပါပြီ");
              } else if (voiding) {
                await voidExpense({ expenseId: voiding.id, reason });
                toast.success("ပယ်ဖျက်ပြီးပါပြီ");
              }
              setCorrecting(null);
              setVoiding(null);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "မအောင်မြင်ပါ");
            }
          }}
        />
      )}
    </PosShell>
  );
}

/** Void or correct an expense. A reason is mandatory; the original row is never deleted. */
function ReasonModal({
  title,
  initial,
  onClose,
  onConfirm,
}: {
  title: string;
  initial: Expense | null;
  onClose: () => void;
  onConfirm: (
    reason: string,
    values: {
      category: string;
      amount: number;
      note: string;
      paidWith: string;
      spentAt: string;
    } | null,
  ) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(initial?.category ?? (CATEGORIES[0] as string));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [paidWith, setPaidWith] = useState(initial?.paid_with ?? (PAY_METHODS[0] as string));
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length > 0 && (!initial || Number(amount) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {initial && (
            <>
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
              <input
                type="number"
                step="0.01"
                min="0"
                aria-label="ပမာဏ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="မှတ်ချက်"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
              />
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
            </>
          )}
          <div>
            <label className={labelClass} htmlFor="e-reason">
              အကြောင်းပြချက် (မဖြစ်မနေ)
            </label>
            <input
              id="e-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          disabled={busy || !valid}
          onClick={() => {
            setBusy(true);
            void onConfirm(
              reason.trim(),
              initial
                ? {
                    category,
                    amount: Number(amount),
                    note: note.trim(),
                    paidWith,
                    spentAt: initial.spent_at,
                  }
                : null,
            ).finally(() => setBusy(false));
          }}
          className="mt-5 h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          အတည်ပြုမည်
        </button>
      </div>
    </div>
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
    fromDrawer: boolean;
    requestId: string;
  }) => Promise<void>;
}) {
  const { activeShift } = useShift();
  const [category, setCategory] = useState(CATEGORIES[0] as string);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidWith, setPaidWith] = useState(PAY_METHODS[0] as string);
  const [busy, setBusy] = useState(false);
  const [fromDrawer, setFromDrawer] = useState(true);
  const isCash = paidWith === PAY_METHODS[0];
  const drawerApplies = Boolean(activeShift) && isCash && fromDrawer;

  // One idempotency key per attempt: a retry of the same form can never record the expense twice,
  // and changing any field starts a new attempt.
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    requestId.current = crypto.randomUUID();
  }, [category, amount, note, paidWith, drawerApplies]);

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
          {activeShift && isCash && (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={fromDrawer}
                onChange={(e) => setFromDrawer(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                ဆိုင်အံဆွဲထဲမှ ထုတ်သုံးသည် — ဖွင့်ထားသော အလုပ်ပတ်၏ ရှိရမည့်ငွေသားမှ တစ်ကြိမ်သာ
                နုတ်မည်
              </span>
            </label>
          )}
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
              fromDrawer: drawerApplies,
              requestId: requestId.current,
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
