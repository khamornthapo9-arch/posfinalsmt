import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Crown, Loader2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings_/plan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plan နှင့် Pro အဆင့်မြှင့်ခြင်း — SMT POS" },
      {
        name: "description",
        content:
          "Standard နှင့် Pro Plan များကို နှိုင်းယှဉ်ကြည့်ပြီး စီမံခန့်ခွဲသူထံ ဆက်သွယ်၍ Pro သို့ အဆင့်မြှင့်ပါ။",
      },
      { property: "og:title", content: "Plan နှင့် Pro အဆင့်မြှင့်ခြင်း — SMT POS" },
      {
        property: "og:description",
        content: "SMT POS Pro Plan ၏ အင်္ဂါရပ်များနှင့် ဆက်သွယ်ရန် အချက်အလက်များ။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanSettingsPage,
});

const FREE_FEATURES = [
  "အကန့်အသတ်မရှိ အရောင်းစာရင်း (Register)",
  "အော့ဖ်လိုင်း အရောင်းနှင့် ပရင့်ထုတ်ခြင်း",
  "ပြေစာ ခေါင်းစီး / လိုဂို အခြေခံ ပြင်ဆင်ခြင်း",
  "Excel / CSV ဖြင့် ကုန်ပစ္စည်း အုပ်စုလိုက် ထည့်သွင်းခြင်း",
  "ဘားကုဒ် နှင့် QR လေဘယ်လ် ပရင့်ထုတ်ခြင်း",
  "အကောင့် ၁ ခု သာ အသုံးပြုနိုင်ခြင်း (Single Device)",
];

const PRO_FEATURES = [
  "Standard ပါ အချက်များ အားလုံး အပြင် -",
  "ထုပ်ပိုးမှု အရွယ်အစား (Multi-unit: ဗူး/ဖာ/တွဲ) ရောင်းချခြင်း",
  "ဝန်ထမ်း အများအပြားအတွက် PIN အကောင့်များနှင့် လုံခြုံရေး စည်းမျဉ်းများ",
  "အသားတင် အမြတ်အစွန်း (Net Profit) နှင့် EOD အသေးစိတ် အစီရင်ခံစာ",
  "ကုန်ပစ္စည်း လက်ကျန်နည်း လျှင် သတိပေးသည့် စနစ် (Low Stock Alert)",
  "ဝယ်သူ / ကုန်သည် အကြွေး စီမံခန့်ခွဲမှု စနစ်",
  "ကုန်ပစ္စည်း ဓာတ်ပုံ တင်ခြင်း",
  "Master CSV အပြည့်အစုံ ထုတ်ယူခြင်း",
];

const ADMIN_CONTACT = [
  { label: "Telegram", value: "@smtpos_support", icon: Send },
  { label: "Viber / ဖုန်း", value: "09-45xxxxxxx", icon: Phone },
  { label: "အီးမေးလ်", value: "khamornthapo9@gmail.com", icon: Mail },
  { label: "KBZ Pay", value: "09-45xxxxxxx (SMT POS)", icon: MessageCircle },
  { label: "Wave Pay", value: "09-97xxxxxxx (SMT POS)", icon: MessageCircle },
];

function PlanSettingsPage() {
  const { store } = useAuth();
  const { isPro } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", telegram: "", viber: "", email: "", note: "" });

  useEffect(() => {
    if (!store) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("store_contacts")
        .select("phone, telegram, viber, email, note")
        .eq("store_id", store.id)
        .maybeSingle();
      if (active && data) {
        setForm({
          phone: data.phone ?? "",
          telegram: data.telegram ?? "",
          viber: data.viber ?? "",
          email: data.email ?? "",
          note: data.note ?? "",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [store]);

  const save = async () => {
    if (!store) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_contacts")
      .upsert({ store_id: store.id, ...form }, { onConflict: "store_id" });
    setSaving(false);
    if (error) {
      toast.error("သိမ်း၍ မရပါ");
      return;
    }
    toast.success("ဆက်သွယ်ရန် အချက်အလက် သိမ်းပြီးပါပြီ");
  };

  return (
    <PosShell title="Plan နှင့် အဆင့်မြှင့်ခြင်း" subtitle={store?.name ?? ""}>
      <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-4">
        <Link
          to="/settings"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> ပြင်ဆင်ချက်များသို့
        </Link>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-4">
          <span className="text-sm font-medium">လက်ရှိ အသုံးပြုနေသော Plan:</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              isPro
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isPro && <Crown className="h-3.5 w-3.5" />}
            {isPro ? "Pro" : "Standard"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Standard (အခမဲ့)</h2>
            <p className="mt-1 text-2xl font-bold tabular-nums">Ks 0</p>
            <ul className="mt-3 space-y-2 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border-2 border-amber-500/60 bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-500" /> Pro Plan (လုပ်ငန်းသုံး)
            </h2>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              Ks 30,000 <span className="text-xs font-normal text-muted-foreground">/ တစ်လ</span>
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">စီမံခန့်ခွဲသူထံ ဆက်သွယ်ရန် အချက်အလက် ဖြည့်ပါ</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pro Plan ဖွင့်ပေးရန် စီမံခန့်ခွဲသူက ဤအချက်အလက်များဖြင့် ပြန်လည် ဆက်သွယ်ပါမည်။
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["phone", "ဖုန်းနံပါတ်"],
                ["telegram", "Telegram"],
                ["viber", "Viber"],
                ["email", "အီးမေးလ်"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs font-medium text-muted-foreground">
                {label}
                <input
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            ))}
          </div>
          <label className="mt-2 block text-xs font-medium text-muted-foreground">
            မှတ်ချက်
            <textarea
              value={form.note}
              rows={2}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
            />
          </label>
          <button
            disabled={saving}
            onClick={() => void save()}
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} သိမ်းမည်
          </button>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">စီမံခန့်ခွဲသူ ဆက်သွယ်ရန်</h2>
          <div className="mt-3 space-y-2">
            {ADMIN_CONTACT.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <row.icon className="h-4 w-4" />
                  {row.label}
                </span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ငွေလွှဲပြီးပါက ပြေစာ (screenshot) ကို Telegram သို့မဟုတ် Viber သို့ ပို့ပေးပါ။ ၂၄ နာရီအတွင်း Pro
            ဖွင့်ပေးပါမည်။
          </p>
        </div>
      </div>
    </PosShell>
  );
}
