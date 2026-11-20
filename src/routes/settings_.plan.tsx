import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  Loader2,
  Mail,
  Phone,
  Send,
  Smartphone,
} from "lucide-react";
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
  "အရောင်းမှတ်တမ်း (ဒီနေ့ နှင့် မနေ့က ၂ ရက်သာ)",
];

const PRO_FEATURES = [
  "Standard ပါ အချက်များ အားလုံး အပြင် -",
  "ရက်စွဲအစုံ အရောင်းမှတ်တမ်းနှင့် အသေးစိတ် ရှာဖွေခြင်း",
  "ထုပ်ပိုးမှု အရွယ်အစား (Multi-unit: ဗူး/ဖာ/တွဲ) ရောင်းချခြင်း",
  "ဝန်ထမ်း အများအပြားအတွက် PIN အကောင့်များနှင့် လုံခြုံရေး စည်းမျဉ်းများ",
  "အသားတင် အမြတ်အစွန်း (Net Profit) နှင့် EOD အသေးစိတ် အစီရင်ခံစာ",
  "ကုန်ပစ္စည်း လက်ကျန်နည်း လျှင် သတိပေးသည့် စနစ် (Low Stock Alert)",
  "ဝယ်သူ / ကုန်သည် အကြွေး စီမံခန့်ခွဲမှု စနစ်",
  "ကုန်ပစ္စည်း ဓာတ်ပုံ တင်ခြင်း",
  "Master CSV အပြည့်အစုံ ထုတ်ယူခြင်း",
];

interface AdminContactInfo {
  telegram: string;
  phone: string;
  email: string;
  kbzpay: string;
  wavepay: string;
  payment_note: string;
}

const DEFAULT_ADMIN_CONTACT: AdminContactInfo = {
  telegram: "@smtpos_support",
  phone: "09-45xxxxxxx",
  email: "khamornthapo9@gmail.com",
  kbzpay: "09-45xxxxxxx (SMT POS)",
  wavepay: "09-97xxxxxxx (SMT POS)",
  payment_note:
    "ငွေလွှဲပြီးပါက ပြေစာ (screenshot) ကို Telegram သို့မဟုတ် Viber သို့ ပို့ပေးပါ။ ၂၄ နာရီအတွင်း Pro ဖွင့်ပေးပါမည်။",
};

function PlanSettingsPage() {
  const { store } = useAuth();
  const { isPro } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", telegram: "", viber: "", email: "", note: "" });

  // Dynamic official contact fetched from platform_settings
  const [adminContact, setAdminContact] = useState<AdminContactInfo>(DEFAULT_ADMIN_CONTACT);

  useEffect(() => {
    let active = true;

    // 1. Fetch user's submitted contact info
    if (store?.id) {
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
    }

    // 2. Fetch official admin contact & payment info from platform_settings
    void (async () => {
      try {
        const { data } = await (supabase as any)
          .from("platform_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();
        if (active && data) {
          setAdminContact({
            telegram: data.telegram || DEFAULT_ADMIN_CONTACT.telegram,
            phone: data.phone || DEFAULT_ADMIN_CONTACT.phone,
            email: data.email || DEFAULT_ADMIN_CONTACT.email,
            kbzpay: data.kbzpay || DEFAULT_ADMIN_CONTACT.kbzpay,
            wavepay: data.wavepay || DEFAULT_ADMIN_CONTACT.wavepay,
            payment_note: data.payment_note || DEFAULT_ADMIN_CONTACT.payment_note,
          });
        }
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [store?.id]);

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

  const contactRows = [
    {
      label: "Telegram",
      value: adminContact.telegram,
      icon: Send,
      href: adminContact.telegram.startsWith("@")
        ? `https://t.me/${adminContact.telegram.slice(1)}`
        : undefined,
    },
    {
      label: "Viber / ဖုန်း",
      value: adminContact.phone,
      icon: Phone,
      href: `tel:${adminContact.phone.replace(/[^0-9+]/g, "")}`,
    },
    {
      label: "အီးမေးလ်",
      value: adminContact.email,
      icon: Mail,
      href: `mailto:${adminContact.email}`,
    },
    {
      label: "KBZ Pay",
      value: adminContact.kbzpay,
      icon: Smartphone,
    },
    {
      label: "Wave Pay",
      value: adminContact.wavepay,
      icon: CreditCard,
    },
  ];

  return (
    <PosShell title="Plan နှင့် အဆင့်မြှင့်ခြင်း" subtitle={store?.name ?? ""}>
      <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-4">
        {/* Back Link */}
        <Link
          to="/settings"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> ပြင်ဆင်ချက်များသို့
        </Link>

        {/* Current Active Plan Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">လက်ရှိ အသုံးပြုနေသော Plan:</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                isPro
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isPro && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              {isPro ? "Pro Plan (လုပ်ငန်းသုံး)" : "Standard (အခမဲ့)"}
            </span>
          </div>
          {isPro && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Pro စနစ် အသုံးပြုခွင့် ဖွင့်ထားပါသည်
            </span>
          )}
        </div>

        {/* Plans Comparison */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Standard Free Plan */}
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Standard (အခမဲ့)</h2>
            <p className="mt-1 text-2xl font-bold tabular-nums">Ks 0</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="rounded-md border-2 border-amber-500/60 bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-500" /> Pro Plan (လုပ်ငန်းသုံး)
            </h2>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              Ks 30,000 <span className="text-xs font-normal text-muted-foreground">/ တစ်လ</span>
            </p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Official Admin Contact & Payment Info (Dynamic from Backend) */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">စီမံခန့်ခွဲသူထံ ဆက်သွယ်ရန်နှင့် ငွေပေးချေရန်</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pro Plan အဆင့်မြှင့်တင်ရန် အောက်ပါ အချက်အလက်များဖြင့် တိုက်ရိုက် ဆက်သွယ်နိုင်ပါသည်။
          </p>

          <div className="mt-3 space-y-2">
            {contactRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2 text-muted-foreground font-medium">
                  <row.icon className="h-3.5 w-3.5" />
                  {row.label}
                </span>
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {row.value}
                  </a>
                ) : (
                  <span className="font-semibold tabular-nums text-foreground">{row.value}</span>
                )}
              </div>
            ))}
          </div>

          {adminContact.payment_note && (
            <p className="mt-3 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
              💡 {adminContact.payment_note}
            </p>
          )}
        </div>

        {/* User Contact Submission Form */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">သင့်ဆိုင်၏ ဆက်သွယ်ရန် အချက်အလက် ဖြည့်ပါ</h2>
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
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
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
              placeholder="ငွေလွှဲပြေစာ အချက်အလက် သို့မဟုတ် မေးမြန်းလိုသည်များ..."
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs text-foreground"
            />
          </label>

          <button
            disabled={saving}
            onClick={() => void save()}
            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} သိမ်းဆည်းမည်
          </button>
        </div>
      </div>
    </PosShell>
  );
}
