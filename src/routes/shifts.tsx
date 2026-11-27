import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useRole } from "@/lib/roles";
import {
  useShift,
  type CashMovement,
  type DrawerMovementType,
  type Shift,
  type ShiftSummary,
} from "@/lib/shift-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shifts")({
  ssr: false,
  head: () => ({
    meta: [{ title: "အလုပ်ပတ် / ငွေသားစစ်ဆေးခြင်း — SMT POS" }],
  }),
  component: ShiftsPage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";
const btnClass =
  "inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50";
const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

const MOVEMENT_LABEL: Record<string, string> = {
  CASH_IN: "ငွေသား ထည့်ခြင်း",
  CASH_OUT: "ငွေသား ထုတ်ခြင်း",
  CASH_DROP: "ငွေသား ဘူးသို့ ပို့ခြင်း (drop)",
  EXPENSE_PAID: "အသုံးစရိတ် (အံဆွဲမှ)",
  REFUND_PAID: "ငွေပြန်အမ်း (ငွေသား)",
};
const MOVEMENT_SIGN: Record<string, 1 | -1> = {
  CASH_IN: 1,
  CASH_OUT: -1,
  CASH_DROP: -1,
  EXPENSE_PAID: -1,
  REFUND_PAID: -1,
};
const REVIEW_LABEL: Record<string, string> = {
  NONE: "ကွာခြားမှု မရှိ",
  PENDING: "စစ်ဆေးရန် စောင့်ဆိုင်းဆဲ",
  APPROVED: "အတည်ပြုပြီး",
  FLAGGED: "အလံပြထားသည်",
};
const EXPENSE_CATEGORIES = ["ဆိုင်ခန်းလခ", "လျှပ်စစ်မီး", "ဝန်ထမ်းလစာ", "ပို့ဆောင်ခ", "အထွေထွေ"];

/** One idempotency key per attempt: retrying the same form can never duplicate; any edit renews it. */
function useAttemptId(key: string) {
  const ref = useRef(crypto.randomUUID());
  useEffect(() => {
    ref.current = crypto.randomUUID();
  }, [key]);
  return ref;
}

const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function ShiftsPage() {
  const { store } = useAuth();
  const { isCashier, isOwner, isManager } = useRole();
  const { fmt } = useStoreSettings();
  const { activeShift, supported, loadShifts } = useShift();
  const [history, setHistory] = useState<Shift[]>([]);
  const [tick, setTick] = useState(0);
  const refreshHistory = useCallback(() => setTick((n) => n + 1), []);
  const canReview = isOwner || isManager;

  useEffect(() => {
    let cancelled = false;
    void loadShifts()
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [loadShifts, tick, activeShift?.id]);

  if (!supported) {
    return (
      <PosShell title="အလုပ်ပတ် / ငွေသားစစ်ဆေးခြင်း">
        <p className="m-4 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          အလုပ်ပတ်စနစ်ကို ဒေတာဘေ့စ်တွင် မတပ်ဆင်ရသေးပါ။ စနစ်စီမံသူထံ ဆက်သွယ်ပါ။
        </p>
      </PosShell>
    );
  }

  const pendingReview = history.filter(
    (s) => s.status === "CLOSED" && s.review_status === "PENDING",
  );

  return (
    <PosShell title="အလုပ်ပတ် / ငွေသားစစ်ဆေးခြင်း" subtitle={store?.name ?? undefined}>
      <div className="space-y-4 p-3 sm:p-4">
        {activeShift ? (
          <ActivePanel shift={activeShift} fmt={fmt} blind={isCashier} onChanged={refreshHistory} />
        ) : (
          <OpenForm onOpened={refreshHistory} />
        )}
        {isOwner && <RequireShiftSetting />}
        {canReview && pendingReview.length > 0 && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            စစ်ဆေးရန် စောင့်ဆိုင်းနေသော အလုပ်ပတ် {pendingReview.length} ခု ရှိသည်
          </p>
        )}
        <section>
          <h2 className="mb-2 text-sm font-semibold">အလုပ်ပတ် မှတ်တမ်း</h2>
          {history.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-xs text-muted-foreground">
              မှတ်တမ်း မရှိသေးပါ
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((shift) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  fmt={fmt}
                  hideExpected={isCashier}
                  canReview={canReview}
                  onChanged={refreshHistory}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PosShell>
  );
}

function OpenForm({ onOpened }: { onOpened: () => void }) {
  const { openShift } = useShift();
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const attempt = useAttemptId(cash);
  const valid = cash.trim() !== "" && Number(cash) >= 0;

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">အလုပ်ပတ် ဖွင့်ရန်</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        အံဆွဲထဲတွင် စတင်ရှိသော ငွေသားကို ရေတွက်ပြီး ထည့်ပါ။
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className={labelClass} htmlFor="open-cash">
            ဖွင့်ငွေသား
          </label>
          <input
            id="open-cash"
            type="number"
            min="0"
            step="0.01"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          className={primaryBtn}
          disabled={busy || !valid}
          onClick={() => {
            setBusy(true);
            void openShift({ openingCash: Number(cash), requestId: attempt.current })
              .then(() => {
                toast.success("အလုပ်ပတ် ဖွင့်ပြီးပါပြီ");
                setCash("");
                onOpened();
              })
              .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "ဖွင့်၍ မရပါ"))
              .finally(() => setBusy(false));
          }}
        >
          အလုပ်ပတ် ဖွင့်မည်
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold", muted && "text-muted-foreground")}>{value}</p>
    </div>
  );
}

function SummaryGrid({
  s,
  fmt,
  hideCash,
}: {
  s: ShiftSummary;
  fmt: (n: number) => string;
  hideCash: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {!hideCash && <Stat label="ရှိရမည့် ငွေသား (expected)" value={fmt(s.expected_cash)} />}
      {!hideCash && <Stat label="ဖွင့်ငွေသား" value={fmt(s.opening_cash)} />}
      {!hideCash && <Stat label="ငွေသား ရောင်းရငွေ" value={fmt(s.cash_sales)} />}
      <Stat label="KBZ Pay ရောင်းရငွေ" value={fmt(s.kbzpay_sales)} />
      <Stat label="Wave Pay ရောင်းရငွေ" value={fmt(s.wavepay_sales)} />
      <Stat label="အကြွေးရောင်းရငွေ" value={fmt(s.credit_sales)} />
      {!hideCash && <Stat label="ငွေသား ထည့်" value={fmt(s.cash_in)} />}
      {!hideCash && <Stat label="ငွေသား ထုတ် + drop" value={fmt(s.cash_out + s.cash_drops)} />}
      {!hideCash && <Stat label="အံဆွဲမှ အသုံးစရိတ်" value={fmt(s.cash_expenses)} />}
      {!hideCash && <Stat label="ငွေသား ပြန်အမ်း" value={fmt(s.cash_refunds)} />}
      <Stat label="အရောင်း အရေအတွက်" value={String(s.sale_count)} />
    </div>
  );
}

function ActivePanel({
  shift,
  fmt,
  blind,
  onChanged,
}: {
  shift: Shift;
  fmt: (n: number) => string;
  blind: boolean;
  onChanged: () => void;
}) {
  const { getSummary, loadMovements } = useShift();
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [modal, setModal] = useState<DrawerMovementType | "EXPENSE" | null>(null);
  const [closing, setClosing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getSummary(shift.id), loadMovements(shift.id)]);
      setSummary(s);
      setMovements(m);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ဒေတာ ရယူ၍ မရပါ");
    }
  }, [getSummary, loadMovements, shift.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">ဖွင့်ထားသော အလုပ်ပတ်</h2>
          <p className="text-xs text-muted-foreground">
            {fmtTime(shift.opened_at)}
            {shift.opened_by_name ? ` · ${shift.opened_by_name}` : ""}
          </p>
        </div>
        <button className={btnClass} onClick={() => setClosing(true)}>
          အလုပ်ပတ် ပိတ်ရန်
        </button>
      </div>
      {summary && <SummaryGrid s={summary} fmt={fmt} hideCash={blind} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className={btnClass} onClick={() => setModal("CASH_IN")}>
          ငွေသား ထည့်
        </button>
        <button className={btnClass} onClick={() => setModal("CASH_OUT")}>
          ငွေသား ထုတ်
        </button>
        <button className={btnClass} onClick={() => setModal("CASH_DROP")}>
          Drop (ဘူးသို့)
        </button>
        <button className={btnClass} onClick={() => setModal("EXPENSE")}>
          အသုံးစရိတ် (အံဆွဲမှ)
        </button>
      </div>
      <MovementList movements={movements} fmt={fmt} />
      {modal && (
        <MovementModal
          kind={modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            void reload();
            onChanged();
          }}
        />
      )}
      {closing && (
        <CloseModal
          shift={shift}
          fmt={fmt}
          onClose={() => setClosing(false)}
          onDone={() => {
            setClosing(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function MovementList({
  movements,
  fmt,
}: {
  movements: CashMovement[];
  fmt: (n: number) => string;
}) {
  if (movements.length === 0) {
    return <p className="text-xs text-muted-foreground">ငွေသားလှုပ်ရှားမှု မရှိသေးပါ</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-md border border-border text-xs">
      {movements.map((m) => {
        const sign = MOVEMENT_SIGN[m.movement_type] ?? -1;
        return (
          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="font-medium">{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}</p>
              <p className="truncate text-muted-foreground">
                {m.reason} · {fmtTime(m.created_at)}
                {m.created_by_name ? ` · ${m.created_by_name}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 font-semibold",
                sign > 0 ? "text-success" : "text-destructive",
              )}
            >
              {sign > 0 ? "+" : "−"}
              {fmt(Number(m.amount))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MovementModal({
  kind,
  onClose,
  onDone,
}: {
  kind: DrawerMovementType | "EXPENSE";
  onClose: () => void;
  onDone: () => void;
}) {
  const { recordMovement, recordDrawerExpense } = useShift();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0] ?? "အထွေထွေ");
  const [busy, setBusy] = useState(false);
  const attempt = useAttemptId(`${kind}|${amount}|${reason}|${category}`);
  const isExpense = kind === "EXPENSE";
  const valid = Number(amount) > 0 && (isExpense || reason.trim() !== "");

  const submit = () => {
    setBusy(true);
    const run = isExpense
      ? recordDrawerExpense({
          category,
          amount: Number(amount),
          note: reason.trim(),
          requestId: attempt.current,
        })
      : recordMovement({
          type: kind,
          amount: Number(amount),
          reason: reason.trim(),
          requestId: attempt.current,
        });
    void run
      .then(() => {
        toast.success("မှတ်တမ်းတင်ပြီးပါပြီ");
        onDone();
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "မှတ်တမ်းတင်၍ မရပါ"))
      .finally(() => setBusy(false));
  };

  return (
    <ModalFrame
      title={isExpense ? "အသုံးစရိတ် (အံဆွဲမှ ငွေသား)" : (MOVEMENT_LABEL[kind] ?? kind)}
      onClose={onClose}
    >
      <div className="space-y-3">
        {isExpense && (
          <div>
            <span className={labelClass}>အမျိုးအစား</span>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
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
        )}
        <div>
          <label className={labelClass} htmlFor="mv-amount">
            ပမာဏ
          </label>
          <input
            id="mv-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="mv-reason">
            {isExpense ? "မှတ်ချက်" : "အကြောင်းရင်း (လိုအပ်သည်)"}
          </label>
          <input
            id="mv-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
        </div>
        <button className={cn(primaryBtn, "w-full")} disabled={busy || !valid} onClick={submit}>
          မှတ်တမ်းတင်မည်
        </button>
      </div>
    </ModalFrame>
  );
}

function CloseModal({
  shift,
  fmt,
  onClose,
  onDone,
}: {
  shift: Shift;
  fmt: (n: number) => string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { closeShift } = useShift();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = counted.trim() !== "" && Number(counted) >= 0;

  return (
    <ModalFrame title="အလုပ်ပတ် ပိတ်ရန်" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          အံဆွဲထဲရှိ ငွေသားကို ရေတွက်ပြီး ထည့်ပါ။ ကွာခြားမှု ရှိပါက မှတ်ချက် လိုအပ်ပြီး မန်နေဂျာ
          စစ်ဆေးမည်။
        </p>
        <div>
          <label className={labelClass} htmlFor="close-counted">
            ရေတွက်ရသော ငွေသား
          </label>
          <input
            id="close-counted"
            type="number"
            min="0"
            step="0.01"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="close-note">
            မှတ်ချက်
          </label>
          <input
            id="close-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          className={cn(primaryBtn, "w-full")}
          disabled={busy || !valid}
          onClick={() => {
            setBusy(true);
            void closeShift({ shiftId: shift.id, countedCash: Number(counted), note: note.trim() })
              .then((r) => {
                if (r.alreadyClosed) toast.info("ဤအလုပ်ပတ်ကို ပိတ်ပြီးသား ဖြစ်သည်");
                else if (r.difference === 0) toast.success("အလုပ်ပတ် ပိတ်ပြီး — ငွေသား ကိုက်ညီသည်");
                else
                  toast.warning(
                    `အလုပ်ပတ် ပိတ်ပြီး — ကွာခြားမှု ${fmt(r.difference)} (မန်နေဂျာ စစ်ဆေးမည်)`,
                  );
                onDone();
              })
              .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "ပိတ်၍ မရပါ"))
              .finally(() => setBusy(false));
          }}
        >
          အလုပ်ပတ် ပိတ်မည်
        </button>
      </div>
    </ModalFrame>
  );
}

function ShiftRow({
  shift,
  fmt,
  hideExpected,
  canReview,
  onChanged,
}: {
  shift: Shift;
  fmt: (n: number) => string;
  hideExpected: boolean;
  canReview: boolean;
  onChanged: () => void;
}) {
  const { getSummary, loadMovements, reviewShift } = useShift();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = shift.status === "CLOSED";
  const diff = shift.cash_difference == null ? null : Number(shift.cash_difference);
  const reviewable = closed && canReview && shift.review_status !== "APPROVED";

  useEffect(() => {
    if (!open) return;
    void Promise.all([getSummary(shift.id), loadMovements(shift.id)])
      .then(([s, m]) => {
        setSummary(s);
        setMovements(m);
      })
      .catch(() => undefined);
  }, [open, getSummary, loadMovements, shift.id]);

  const decide = (decision: "APPROVED" | "FLAGGED") => {
    setBusy(true);
    void reviewShift({ shiftId: shift.id, decision, note: note.trim() })
      .then(() => {
        toast.success("စစ်ဆေးမှု မှတ်တမ်းတင်ပြီးပါပြီ");
        setNote("");
        onChanged();
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "လုပ်ဆောင်၍ မရပါ"))
      .finally(() => setBusy(false));
  };

  return (
    <li className="rounded-md border border-border bg-card">
      <button
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">
              {fmtTime(shift.opened_at)}
              {shift.opened_by_name ? ` · ${shift.opened_by_name}` : ""}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {closed ? REVIEW_LABEL[shift.review_status] : "ဖွင့်ထားဆဲ"}
            </span>
          </span>
        </span>
        {closed && diff != null && (
          <span
            className={cn(
              "shrink-0 text-xs font-semibold",
              diff === 0 ? "text-success" : "text-destructive",
            )}
          >
            {diff > 0 ? "+" : ""}
            {fmt(diff)}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="ဖွင့်ငွေသား" value={fmt(Number(shift.opening_cash))} />
            {closed && !hideExpected && (
              <Stat label="ရှိရမည့်" value={fmt(Number(shift.expected_cash ?? 0))} />
            )}
            {closed && <Stat label="ရေတွက်ရသည့်" value={fmt(Number(shift.counted_cash ?? 0))} />}
            {closed && diff != null && <Stat label="ကွာခြားမှု" value={fmt(diff)} />}
          </div>
          {shift.close_note && <p>ပိတ်ရာတွင် မှတ်ချက်: {shift.close_note}</p>}
          {shift.reviewed_at && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" /> {REVIEW_LABEL[shift.review_status]} ·{" "}
              {fmtTime(shift.reviewed_at)}
              {shift.review_note ? ` · ${shift.review_note}` : ""}
            </p>
          )}
          {summary && (
            <>
              <SummaryGrid s={summary} fmt={fmt} hideCash={hideExpected} />
              {closed && summary.late_adjustment !== 0 && !hideExpected && (
                <p className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-warning">
                  ပိတ်ပြီးနောက် Offline အရောင်း ချိတ်ဆက်သဖြင့် ရှိရမည့်ငွေသား{" "}
                  {fmt(summary.late_adjustment)} ပြောင်းလဲသည် (မူလ စာရင်းမပြောင်းပါ)
                </p>
              )}
            </>
          )}
          <MovementList movements={movements} fmt={fmt} />
          {reviewable && (
            <div className="space-y-2">
              <label className={labelClass} htmlFor={`rv-${shift.id}`}>
                စစ်ဆေးမှု မှတ်ချက်
              </label>
              <input
                id={`rv-${shift.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
              />
              <div className="flex gap-2">
                <button className={primaryBtn} disabled={busy} onClick={() => decide("APPROVED")}>
                  အတည်ပြုမည်
                </button>
                <button className={btnClass} disabled={busy} onClick={() => decide("FLAGGED")}>
                  အလံပြမည်
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function RequireShiftSetting() {
  const { store } = useAuth();
  const [value, setValue] = useState<boolean | null>(null);
  const storeId = store?.id ?? null;

  useEffect(() => {
    if (!storeId) return;
    void supabase
      .from("stores")
      .select("require_shift")
      .eq("id", storeId)
      .maybeSingle()
      .then(({ data }) => setValue(data ? Boolean(data.require_shift) : null));
  }, [storeId]);

  if (value === null || !storeId) return null;
  return (
    <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-3 text-xs">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={value}
        onChange={(e) => {
          const next = e.target.checked;
          void supabase
            .from("stores")
            .update({ require_shift: next })
            .eq("id", storeId)
            .then(({ error }) => {
              if (error) toast.error("ပြောင်း၍ မရပါ");
              else setValue(next);
            });
        }}
      />
      <span>
        ရောင်းချရန် အလုပ်ပတ် (shift) ဖွင့်ထားရမည် — မဖွင့်ထားပါက အွန်လိုင်းအရောင်းကို ပယ်မည်
      </span>
    </label>
  );
}
