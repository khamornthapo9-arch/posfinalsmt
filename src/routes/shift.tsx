import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/shift")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "အလုပ်ချိန် — SMT POS" },
      { name: "description", content: "ဆိုင်ခွဲ၏ အလုပ်ချိန် အဝင်/အထွက် မှတ်တမ်း။" },
    ],
  }),
  component: ShiftPage,
});

// The `shifts` table isn't in the generated Supabase types yet, so every
// call below goes through an `any`-typed handle of the same client.
const db = supabase as unknown as {
  from: (table: "shifts") => any;
};

interface ShiftRow {
  id: string;
  store_id: string;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("my", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("my", { month: "short", day: "numeric" });
}

function duration(openIso: string, closeIso: string | null) {
  const end = closeIso ? new Date(closeIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - new Date(openIso).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} နာရီ ${m} မိနစ်` : `${m} မိနစ်`;
}

function ShiftPage() {
  const { store } = useAuth();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    const { data, error } = await db
      .from("shifts")
      .select("id, store_id, opened_at, closed_at, opened_by")
      .eq("store_id", store.id)
      .order("opened_at", { ascending: false })
      .limit(20);
    if (!error) setShifts((data ?? []) as ShiftRow[]);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = shifts.find((s) => !s.closed_at);

  const startShift = async () => {
    if (!store) return;
    setBusy(true);
    try {
      const { error } = await db
        .from("shifts")
        .insert({ store_id: store.id, opened_by: store.cashier_name || store.name });
      if (error) throw error;
      toast.success("အလုပ်ချိန် စတင်ပါပြီ");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "မအောင်မြင်ပါ");
    } finally {
      setBusy(false);
    }
  };

  const endShift = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const { error } = await db
        .from("shifts")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", open.id);
      if (error) throw error;
      toast.success("အလုပ်ချိန် ပြီးဆုံးပါပြီ");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "မအောင်မြင်ပါ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PosShell title="အလုပ်ချိန်" subtitle={open ? `${formatTime(open.opened_at)} က စတင်ထားသည်` : "မစတင်ရသေးပါ"}>
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {open ? "အလုပ်ချိန် စတင်ထားသည်" : "အလုပ်ချိန် မစတင်ရသေးပါ"}
            </p>
            {open && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(open.opened_at)} · {formatTime(open.opened_at)} က — {duration(open.opened_at, null)} ကြာပြီ
              </p>
            )}
          </div>
          {open ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void endShift()}
              className="inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> အလုပ်ချိန် ပိတ်မည်
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startShift()}
              className="inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" /> အလုပ်ချိန် စတင်မည်
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ရက်စွဲ</th>
                <th className="px-4 py-3">အဝင်</th>
                <th className="px-4 py-3">အထွက်</th>
                <th className="px-4 py-3 text-right">ကြာချိန်</th>
              </tr>
            </thead>
            <tbody>
              {!loading && shifts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    မှတ်တမ်း မရှိသေးပါ
                  </td>
                </tr>
              )}
              {shifts.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{formatDate(s.opened_at)}</td>
                  <td className="px-4 py-3">{formatTime(s.opened_at)}</td>
                  <td className="px-4 py-3">{s.closed_at ? formatTime(s.closed_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">{duration(s.opened_at, s.closed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PosShell>
  );
}
