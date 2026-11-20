import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Crown,
  CreditCard,
  Loader2,
  Mail,
  Megaphone,
  Phone,
  Save,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/lib/use-platform-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/admin")({
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

interface PlatformSettings {
  phone: string;
  telegram: string;
  viber: string;
  email: string;
  kbzpay: string;
  wavepay: string;
  payment_note: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  phone: "09-45xxxxxxx",
  telegram: "@smtpos_support",
  viber: "09-45xxxxxxx",
  email: "khamornthapo9@gmail.com",
  kbzpay: "09-45xxxxxxx (SMT POS)",
  wavepay: "09-97xxxxxxx (SMT POS)",
  payment_note: "ငွေလွှဲပြီးပါက ပြေစာ (screenshot) ကို Telegram သို့မဟုတ် Viber သို့ ပို့ပေးပါ။ ၂၄ နာရီအတွင်း Pro ဖွင့်ပေးပါမည်။",
};

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

  // Platform admin contact & payment settings
  const [adminSettings, setAdminSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: storeRows }, { data: contacts }, { data: anns }, { data: pSettings }] =
        await Promise.all([
          supabase.from("stores").select("id, name, is_pro, created_at").order("created_at", { ascending: false }),
          supabase.from("store_contacts").select("store_id, phone, telegram, viber, email, note"),
          supabase.from("announcements").select("id, message, is_active, audience").order("created_at", { ascending: false }),
          (supabase as any).from("platform_settings").select("*").eq("id", "default").maybeSingle(),
        ]);

      const byStore = new Map((contacts ?? []).map((c) => [c.store_id, c]));
      setStores(
        (storeRows ?? []).map((s) => {
          const c = byStore.get(s.id);
          return c ? { ...s, contact: c } : s;
        }),
      );
      setAnnouncements(anns ?? []);

      if (pSettings) {
        setAdminSettings({
          phone: pSettings.phone || DEFAULT_SETTINGS.phone,
          telegram: pSettings.telegram || DEFAULT_SETTINGS.telegram,
          viber: pSettings.viber || DEFAULT_SETTINGS.viber,
          email: pSettings.email || DEFAULT_SETTINGS.email,
          kbzpay: pSettings.kbzpay || DEFAULT_SETTINGS.kbzpay,
          wavepay: pSettings.wavepay || DEFAULT_SETTINGS.wavepay,
          payment_note: pSettings.payment_note || DEFAULT_SETTINGS.payment_note,
        });
      }
    } catch (err) {
      console.error("Admin load error:", err);
    }
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

  const saveAdminSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .upsert(
          { id: "default", ...adminSettings, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
      if (error) throw error;
      toast.success("စီမံခန့်ခွဲသူ ဆက်သွယ်ရန်နှင့် ငွေပေးချေမှု အချက်အလက် သိမ်းပြီးပါပြီ");
    } catch {
      toast.error("ဆက်သွယ်ရန် အချက်အလက် သိမ်း၍မရပါ");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Admin">
        <div className="grid place-items-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell title="Admin" requireLogin>
        <div />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Admin စီမံခန့်ခွဲမှု" subtitle="ဆိုင်များ၊ ငွေပေးချေမှုနှင့် ကြေညာချက်များ">
      <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Master Admin အဖြစ် ဝင်ရောက်ထားသည်။</span>
        </div>

        {/* 1. Official Admin Contact & Payment Settings */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-primary" /> စီမံခန့်ခွဲသူ ဆက်သွယ်ရန်နှင့် ငွေပေးချေမှု အချက်အလက်များ
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ဤနေရာတွင် ဖြည့်စွက်ထားသော အချက်အလက်များကို ဆိုင်များက Pro အဆင့်မြှင့်တင်ရာတွင် မြင်တွေ့ရမည်ဖြစ်ပါသည်။
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telegram Handle / Username</label>
              <div className="relative mt-1">
                <Send className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={adminSettings.telegram}
                  onChange={(e) => setAdminSettings({ ...adminSettings, telegram: e.target.value })}
                  placeholder="@smtpos_support"
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Viber / ဖုန်းနံပါတ်</label>
              <div className="relative mt-1">
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={adminSettings.phone}
                  onChange={(e) => setAdminSettings({ ...adminSettings, phone: e.target.value })}
                  placeholder="09-xxxxxxx"
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">KBZ Pay အကောင့်</label>
              <input
                value={adminSettings.kbzpay}
                onChange={(e) => setAdminSettings({ ...adminSettings, kbzpay: e.target.value })}
                placeholder="09-xxxxxxx (Name)"
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Wave Pay အကောင့်</label>
              <input
                value={adminSettings.wavepay}
                onChange={(e) => setAdminSettings({ ...adminSettings, wavepay: e.target.value })}
                placeholder="09-xxxxxxx (Name)"
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">ဆက်သွယ်ရန် အီးမေးလ်</label>
              <div className="relative mt-1">
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={adminSettings.email}
                  onChange={(e) => setAdminSettings({ ...adminSettings, email: e.target.value })}
                  placeholder="khamornthapo9@gmail.com"
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">ငွေလွှဲ ညွှန်ကြားချက် / မှတ်ချက်</label>
              <textarea
                value={adminSettings.payment_note}
                onChange={(e) => setAdminSettings({ ...adminSettings, payment_note: e.target.value })}
                rows={2}
                placeholder="ငွေလွှဲပြီးပါက ပြေစာ (screenshot) ကို ပို့ပေးပါ..."
                className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
              />
            </div>
          </div>

          <button
            disabled={savingSettings}
            onClick={() => void saveAdminSettings()}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            သိမ်းဆည်းမည်
          </button>
        </div>

        {/* 2. Marquee Announcement Broadcast */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4 text-amber-500" /> ကြေညာချက် (Marquee)
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="ပြသလိုသော စာသား ရိုက်ထည့်ပါ..."
            className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(["ALL", "SELECTED"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={cn(
                  "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
                  audience === a ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-accent",
                )}
              >
                {a === "ALL" ? "ဆိုင်အားလုံး" : "ရွေးချယ်ထားသော ဆိုင်များ"}
              </button>
            ))}
            <button
              disabled={sending || !message.trim()}
              onClick={() => void publish()}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
                      "rounded-full px-2.5 py-0.5 font-semibold text-[11px]",
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

        {/* 3. Stores List and Pro Plan Activation */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ဆိုင်နာမည် / ဖုန်း / အီးမေးလ် ဖြင့် ရှာဖွေရန်..."
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
                      className="h-4 w-4 rounded border-border"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      စတင်သည့်ရက်: {new Date(s.created_at).toLocaleDateString()}
                      {s.contact?.phone ? ` · ဖုန်း: ${s.contact.phone}` : ""}
                      {s.contact?.email ? ` · အီးမေးလ်: ${s.contact.email}` : ""}
                      {s.contact?.telegram ? ` · TG: ${s.contact.telegram}` : ""}
                      {s.contact?.viber ? ` · Viber: ${s.contact.viber}` : ""}
                    </p>
                    {s.contact?.note && (
                      <p className="mt-1 text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                        မှတ်ချက်: {s.contact.note}
                      </p>
                    )}
                  </div>
                  <button
                    disabled={busy === s.id}
                    onClick={() => void togglePro(s)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold disabled:opacity-50 transition-colors",
                      s.is_pro
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {busy === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Crown className={cn("h-3.5 w-3.5", s.is_pro && "text-amber-500")} />
                    )}
                    {s.is_pro ? "Pro အသုံးပြုနေသည်" : "Standard (အခမဲ့)"}
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">ဆိုင် မတွေ့ရှိပါ</li>
            )}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
