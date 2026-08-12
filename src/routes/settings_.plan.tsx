import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Crown, Loader2, Phone, Send, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
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
          "Standard နှင့် Pro Plan များကို နှိုင်းယှဉ်ကြည့်ပြီး KBZ Pay သို့မဟုတ် Wave Pay ဖြင့် Pro သို့ အဆင့်မြှင့်ပါ။",
      },
      { property: "og:title", content: "Plan နှင့် Pro အဆင့်မြှင့်ခြင်း — SMT POS" },
      {
        property: "og:description",
        content: "SMT POS Pro Plan ၏ အင်္ဂါရပ်များနှင့် ငွေပေးချေမှု အချက်အလက်များ။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanSettingsPage,
});

const FREE_FEATURES = [
  "အရောင်းစာရင်း (Register) အပြည့်အစုံ",
  "ကုန်ပစ္စည်း စာရင်းနှင့် လက်ကျန် စီမံခန့်ခွဲမှု",
  "အော့ဖ်လိုင်း ရောင်းချမှု",
  "အခြေခံ ဆန်းစစ်ချက်များ",
  "QR / ဘားကုဒ် လေဘယ် ပရင့်ထုတ်ခြင်း",
];

const PRO_FEATURES = [
  "ထုပ်ပိုးမှု အရွယ်အစား (Multi-unit) ရောင်းချခြင်း",
  "ပြေစာ ခေါင်းစီး / လိုဂို စိတ်ကြိုက်ပြင်ဆင်ခြင်း",
  "Master CSV အပြည့်အစုံ ထုတ်ယူခြင်း",
  "Excel / CSV ဖြင့် ကုန်ပစ္စည်း အစုလိုက် ထည့်သွင်းခြင်း",
  "ဝန်ထမ်း အများအပြား PIN အကောင့်များ",
];

const PAYMENT_INFO = [
  { label: "KBZ Pay", value: "09-45xxxxxxx (SMT POS)" },
  { label: "Wave Pay", value: "09-97xxxxxxx (SMT POS)" },
  { label: "Viber", value: "09-45xxxxxxx" },
  { label: "Telegram", value: "@smtpos_support" },
];

function PlanSettingsPage() {
  const { store, updateStore } = useAuth();
  const { isPro } = useStoreSettings();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const togglePro = async (next: boolean) => {
    if (!store) return;
    setSaving(true);
    try {
      await updateStore({ is_pro: next });
      toast.success(next ? "Pro Plan ဖွင့်ပြီးပါပြီ" : "Standard Plan သို့ ပြန်ပြောင်းပြီးပါပြီ");
      setOpen(false);
    } catch {
      toast.error("Plan ပြောင်း၍ မရပါ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosShell title="Plan နှင့် အဆင့်မြှင့်ခြင်း" subtitle={store?.name ?? ""}>
      <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-4">
        <Link
          to="/settings"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> ပြင်ဆင်ချက်များသို့
        </Link>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
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
          <div className="rounded-xl border border-border bg-card p-4">
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

          <div className="rounded-xl border-2 border-amber-500/60 bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-500" /> Pro Plan
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
            <button
              onClick={() => setOpen(true)}
              className="mt-4 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            >
              {isPro ? "ငွေပေးချေမှု အချက်အလက် ကြည့်ရန်" : "Pro Plan အဆင့်မြှင့်ရန်"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">စမ်းသပ်ရန် Pro ဖွင့်ခြင်း</p>
            <p className="text-xs text-muted-foreground">
              ငွေလွှဲပြီးကြောင်း အတည်ပြုပြီးမှသာ ဖွင့်ပေးပါ။
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isPro}
            disabled={saving}
            onClick={() => void togglePro(!isPro)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
              isPro ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-card transition-all",
                isPro ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="h-4 w-4 text-amber-500" /> Pro Plan ငွေပေးချေရန်
              </h2>
              <button onClick={() => setOpen(false)} aria-label="ပိတ်ရန်" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              အောက်ပါ အကောင့်တစ်ခုသို့ Ks 30,000 လွှဲပြီး ငွေလွှဲပြေစာ (screenshot) ကို Viber သို့မဟုတ်
              Telegram သို့ ပို့ပေးပါ။ ၂၄ နာရီအတွင်း Pro ဖွင့်ပေးပါမည်။
            </p>
            <div className="mt-3 space-y-2">
              {PAYMENT_INFO.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {row.label === "Telegram" ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {row.label}
                  </span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <button
              disabled={saving}
              onClick={() => void togglePro(true)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ငွေလွှဲပြီးပါပြီ — Pro ဖွင့်မည်
            </button>
          </div>
        </div>
      )}
    </PosShell>
  );
}
