import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Loader2, Megaphone, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/lib/use-platform-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — ဆိုင်များနှင့် Pro စီမံခန့်ခွဲမှု | SMT POS" },
      {
        name: "description",
        content: "SMT POS စီမံခန့်ခွဲသူ စာမျက်နှာ — ဆိုင်များ၏ Pro Plan ဖွင့်/ပိတ်ခြင်းနှင့် ကြေညာချက် ပေးပို့ခြင်း။",
      },
      { property: "og:title", content: "Admin — SMT POS" },
      { property: "og:description", content: "ဆိုင်များ၏ Plan နှင့် ကြေညာချက် စီမံခန့်ခွဲမှု။" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

interface StoreRow {
  id: string;
  name: string;
  is_pro: boolean;
  created_at: string;
  contact?: {
    phone: string | null;
    telegram: string | null;
    viber: string | null;
    email: string | null;
    note: string | null;
  };
}

function AdminPage() {
  const { isAdmin, loading } = usePlatformAdmin();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"ALL" | "SELECTED">("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [announcements, setAnnouncements] = useState<
    { id: string; message: string; is_active: boolean; audience: string }[]
  >([]);

  const load = useCallback(async () => {
    const [{ data: storeRows }, { data: contacts }, { data: anns }] = await Promise.all([
      supabase.from("stores").select("id, name, is_pro, created_at").order("created_at", { ascending: false }),
      supabase.from("store_contacts").select("store_id, phone, telegram, viber, email, note"),
      supabase.from("announcements").select("id, message, is_active, audience").order("created_at", { ascending: false }),
    ]);
    const byStore = new Map((contacts ?? []).map((c) => [c.store_id, c]));
    setStores(
      (storeRows ?? []).map((s) => {
        const c = byStore.get(s.id);
        return c ? { ...s, contact: c } : s;
      }),
    );
    setAnnouncements(anns ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      [s.name, s.contact?.phone, s.contact?.email, s.contact?.telegram, s.contact?.viber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [stores, query]);

  const togglePro = async (store: StoreRow) => {
    setBusy(store.id);
    const { error } = await supabase.from("stores").update({ is_pro: !store.is_pro }).eq("id", store.id);
    setBusy(null);
    if (error) {
      toast.error("Plan ပြောင်း၍ မရပါ");
      return;
    }
    setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, is_pro: !s.is_pro } : s)));
    toast.success(`${store.name} — ${store.is_pro ? "Standard" : "Pro"} သို့ ပြောင်းပြီးပါပြီ`);
  };

  const publish = async () => {
    if (!message.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("announcements")
      .insert({ message: message.trim(), audience, is_active: true })
      .select("id, message, is_active, audience")
      .maybeSingle();
    if (!error && data && audience === "SELECTED" && selected.length > 0) {
      await supabase
        .from("announcement_targets")
        .insert(selected.map((store_id) => ({ announcement_id: data.id, store_id })));
    }
    setSending(false);
    if (error) {
      toast.error("ကြေညာချက် မပို့နိုင်ပါ");
      return;
    }
    setMessage("");
    setSelected([]);
    void load();
    toast.success("ကြေညာချက် ပေးပို့ပြီးပါပြီ");
  };

  const toggleActive = async (id: string, next: boolean) => {
    await supabase.from("announcements").update({ is_active: next }).eq("id", id);
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: next } : a)));
  };

  if (loading) {
    return (
      <PosShell title="Admin">
        <div className="grid place-items-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PosShell>
    );
  }

  if (!isAdmin) {
    return (
      <PosShell title="Admin">
        <div className="p-6 text-sm text-muted-foreground">ဤစာမျက်နှာကို ကြည့်ရှုခွင့် မရှိပါ။</div>
      </PosShell>
    );
  }

  return (
    <PosShell title="Admin စီမံခန့်ခွဲမှု" subtitle="ဆိုင်များ၏ Plan နှင့် ကြေညာချက်">
      <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Master Admin အဖြစ် ဝင်ရောက်ထားသည်။
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4 text-amber-500" /> ကြေညာချက် (Marquee)
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="ပြသလိုသော စာသား..."
            className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(["ALL", "SELECTED"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={cn(
                  "h-9 rounded-md border px-3 text-xs font-medium",
                  audience === a ? "border-primary bg-primary/10 text-primary" : "border-border",
                )}
              >
                {a === "ALL" ? "ဆိုင်အားလုံး" : "ရွေးချယ်ထားသော ဆိုင်များ"}
              </button>
            ))}
            <button
              disabled={sending || !message.trim()}
              onClick={() => void publish()}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} ပေးပို့မည်
            </button>
          </div>
          {announcements.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {announcements.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{a.message}</span>
                  <span className="text-muted-foreground">{a.audience === "ALL" ? "အားလုံး" : "ရွေးချယ်"}</span>
                  <button
                    onClick={() => void toggleActive(a.id, !a.is_active)}
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      a.is_active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.is_active ? "ဖွင့်" : "ပိတ်"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ဆိုင်နာမည် / ဖုန်း / အီးမေးလ် ရှာရန်"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <ul className="mt-3 space-y-2">
            {filtered.map((s) => (
              <li key={s.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {audience === "SELECTED" && (
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        )
                      }
                      className="h-4 w-4"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      စတင်သည့်ရက် {new Date(s.created_at).toLocaleDateString()}
                      {s.contact?.phone ? ` · ${s.contact.phone}` : ""}
                      {s.contact?.email ? ` · ${s.contact.email}` : ""}
                      {s.contact?.telegram ? ` · TG ${s.contact.telegram}` : ""}
                      {s.contact?.viber ? ` · Viber ${s.contact.viber}` : ""}
                    </p>
                    {s.contact?.note && (
                      <p className="mt-1 text-[11px] text-muted-foreground">မှတ်ချက်: {s.contact.note}</p>
                    )}
                  </div>
                  <button
                    disabled={busy === s.id}
                    onClick={() => void togglePro(s)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-3 text-xs font-semibold disabled:opacity-50",
                      s.is_pro
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {busy === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Crown className="h-3.5 w-3.5" />
                    )}
                    {s.is_pro ? "Pro" : "Standard"}
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">ဆိုင် မတွေ့ပါ</li>
            )}
          </ul>
        </div>
      </div>
    </PosShell>
  );
}
