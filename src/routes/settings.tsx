import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  CreditCard,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Send,
  Store,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { usePos } from "@/lib/pos-store";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ဆိုင် ပြင်ဆင်ချက်များ — SMT POS" },
      {
        name: "description",
        content:
          "သင့် ဆိုင်အတွက် အသေးစိတ် ပြင်ဆင်မှုများနှင့် အကူအညီများရယူရန်။",
      },
      { property: "og:title", content: "ဆိုင် ပြင်ဆင်ချက်များ — SMT POS" },
      {
        property: "og:description",
        content: "SMT POS မှာ သင့် အမှတ်တံဆိပ်၊ အခွန်၊ လုပ်ငန်းအမျိုးအစား၊ အကောင့်နှင့် စာရင်းသွင်းမှု ပြင်ဆင်ချက်ရန်။",
      },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["$", "€", "£", "¥", "₹", "K"];

const PLANS = [
  {
    name: "အခမဲ့ အသုံပြုနေသည်",
    price: "$0",
    period: "အမြဲတမ်း",
    features: ["ဆိုင် ၁ ဆိုင်", "ကုန်ပစ္စည်း ၅၀ အထိ", "အော့ဖ်လိုင်း ငွေချေစနစ်", "အခြေခံ စာရင်းဇယား Analysis"],
    current: true,
  },
  {
    name: "Pro Casher",
    price: "$19",
    period: "တစ်လ",
    features: ["အကန့်အသတ်မရှိ ကုန်ပစ္စည်းများ", "စားသောက်ဆိုင် မုဒ်", "မီးဖိုချောင် တိုကင်များ", "CSV ထုတ်ယူမှုများ"],
    current: false,
  },
  {
    name: "လက်ခွဲဆိုင်များ",
    price: "$79",
    period: "တစ်လလျှင်",
    features: ["အကန့်အသတ်မရှိ ဆိုင်ခွဲများ", "ဝန်ထမ်း အကောင့်များ", "၂၄/၇ အကူအညီ", " အသေးစိတ် စာရင်း"],
    current: false,
  },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

function SettingsPage() {
  const { store, session, updateStore, refreshStore, signOut } = useAuth();
  const { refreshCatalog, refreshTabs } = usePos();
  const navigate = useNavigate();
  const logoUrl = useStoreLogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("$");
  const [tax, setTax] = useState("5");
  const [address, setAddress] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [modeTarget, setModeTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setSymbol(store.currency_symbol || "$");
    setTax(String(store.tax_rate ?? 5));
    setAddress(store.address ?? "");
    setCashierName(store.cashier_name ?? "");
    setPhones(store.phone_numbers?.length ? store.phone_numbers : [""]);
  }, [store]);

  useEffect(() => {
    setEmail(session?.user.email ?? "");
  }, [session]);

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error("ဆိုင်အမည် ထည့်သွင်းရန် လိုအပ်သည်");
      return;
    }
    setSavingProfile(true);
    try {
      await updateStore({
        name: name.trim(),
        currency_symbol: symbol.trim() || "$",
        tax_rate: Number(tax) || 0,
        address: address.trim() || null,
        cashier_name: cashierName.trim() || null,
        phone_numbers: phones.map((p) => p.trim()).filter(Boolean),
      });
      toast.success("ဆိုင်အချက်အလက်များကို သိမ်းဆည်းပြီးပါပြီ");
    } catch {
      toast.error("ဆိုင်အချက်အလက်များကို သိမ်းဆည်း၍ မရပါ");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleAdvanced = async () => {
    if (!store) return;
    setAdvancedSaving(true);
    try {
      await updateStore({ advanced_accounting_mode: !store.advanced_accounting_mode });
      toast.success(
        store.advanced_accounting_mode
          ? "အဆင့်မြင့် စာရင်းကိုင် မုဒ်ကို ပိတ်လိုက်ပါပြီ"
          : "အဆင့်မြင့် စာရင်းကိုင် မုဒ်ကို ဖွင့်လိုက်ပါပြီ",
      );
    } catch {
      toast.error("မော်ဂျူး ပြင်ဆင်ချက်ကို သိမ်းဆည်း၍ မရပါ");
    } finally {
      setAdvancedSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!session) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${session.user.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-logos").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      await updateStore({ logo_url: path });
      toast.success("လိုဂိုကို အပ်ဒိတ်လုပ်ပြီးပါပြီ");
    } catch {
      toast.error("လိုဂိုကို တင်၍ မရပါ");
    } finally {
      setUploading(false);
    }
  };

  const saveEmail = async () => {
    if (!email.trim()) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      toast.success("အီးမေးလ်လိပ်စာသစ်သို့ အတည်ပြုချက် အီးမေးလ် ပို့ပြီးပါပြီ");
    } catch {
      toast.error("အီးမေးလ်လိပ်စာကို ပြောင်းလဲ၍ မရပါ");
    } finally {
      setSavingEmail(false);
    }
  };

  const switchMode = async (nextMode: string) => {
    if (!store) return;
    const saleIds = await supabase.from("sales").select("id").eq("store_id", store.id);
    const ids = (saleIds.data ?? []).map((row) => row.id);
    if (ids.length > 0) {
      await supabase.from("sale_items").delete().in("sale_id", ids);
      await supabase.from("sales").delete().eq("store_id", store.id);
    }
    await supabase.from("items").delete().eq("store_id", store.id);
    await updateStore({ business_type: nextMode });
    await refreshStore();
    await refreshCatalog();
    await refreshTabs();
    toast.success(
      nextMode === "RESTAURANT" ? "စားသောက်ဆိုင် မုဒ်သို့ ပြောင်းလဲပြီးပါပြီ" : "အရောင်းဆိုင် မုဒ်သို့ ပြောင်းလဲပြီးပါပြီ",
    );
  };

  const isRestaurant = store?.business_type === "RESTAURANT";

  return (
    <PosShell title="ဆိုင် ပြင်ဆင်ချက်များ" subtitle="အမှတ်တံဆိပ်၊ အခွန်၊ လုပ်ငန်းမုဒ်နှင့် အကောင့်">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Section
          title="ဆိုင် အချက်အလက်နှင့် အမှတ်တံဆိပ်"
          description="သင်၏ အရောင်းပြေစာ၊ တံဆိပ်နှင့် ဘေးဘောင်တို့တွင် ပြသပါမည်။"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="ဆိုင် လိုဂို" className="h-full w-full object-contain" />
                ) : (
                  <Store className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                လိုဂို တင်မည်
              </button>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="store-name">
                  ဆိုင်အမည်
                </label>
                <input
                  id="store-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="currency">
                  ငွေကြေး သင်္ကေတ
                </label>
                <div className="flex gap-2">
                  <input
                    id="currency"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    maxLength={3}
                    className={cn(inputClass, "w-20 text-center")}
                  />
                  <div className="flex flex-wrap gap-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSymbol(c)}
                        className={cn(
                          "h-10 w-9 rounded-md border text-sm",
                          symbol === c ? "border-primary bg-primary/10" : "border-border",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="tax">
                  မူလ အရောင်းအခွန် (%)
                </label>
                <input
                  id="tax"
                  type="number"
                  step="0.1"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="store-address">
                  ဆိုင် လိပ်စာ
                </label>
                <input
                  id="store-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="အမှတ်၊ လမ်း၊ မြို့နယ်"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cashier-name">
                  ငွေကိုင် / ဝန်ထမ်း အမည်
                </label>
                <input
                  id="cashier-name"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="ဥပမာ - မမြင့်"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <span className={labelClass}>ဖုန်းနံပါတ်များ</span>
                <div className="space-y-2">
                  {phones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={phone}
                        onChange={(e) =>
                          setPhones((prev) =>
                            prev.map((p, i) => (i === index ? e.target.value : p)),
                          )
                        }
                        inputMode="tel"
                        placeholder="09xxxxxxxxx"
                        className={inputClass}
                      />
                      <button
                        onClick={() =>
                          setPhones((prev) =>
                            prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
                          )
                        }
                        aria-label="ဖုန်းနံပါတ် ဖျက်ရန်"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setPhones((prev) => [...prev, ""])}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" /> ဖုန်းနံပါတ် ထပ်ထည့်မည်
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} ပြောင်းလဲမှုများကို သိမ်းမည်
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="အသုံးပြုမည့် မော်ဂျူးများ"
          description="လိုအပ်သော မော်ဂျူးများကိုသာ ဖွင့်၍ အသုံးပြုနိုင်ပါသည်။"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                အဆင့်မြင့် စာရင်းကိုင် မုဒ် (အကြွေး၊ ဝယ်ယူမှုနှင့် အသုံးစရိတ်)
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ဖောက်သည် အကြွေးစာရင်း၊ ကုန်သွင်းသူ ဝယ်ယူမှုနှင့် အသုံးစရိတ် မှတ်တမ်းများ ပွင့်လာပါမည်။
              </p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(store?.advanced_accounting_mode)}
              aria-label="အဆင့်မြင့် စာရင်းကိုင် မုဒ်"
              disabled={advancedSaving}
              onClick={() => void toggleAdvanced()}
              className={cn(
                "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
                store?.advanced_accounting_mode ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
                  store?.advanced_accounting_mode ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </Section>

        <Section
          title="လုပ်ငန်း အမျိုးအစား"
          description="အရောင်းဆိုင် မုဒ်သည် ပစ္စည်းများကို တိုက်ရိုက် ရောင်းချသည်။ စားသောက်ဆိုင် မုဒ်သည် စားပွဲနေရာချထားမှုနှင့် မီးဖိုချောင် တိုကင်စနစ် ပါဝင်သည်။"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "RETAIL", label: "အရောင်းဆိုင် မုဒ်", icon: Store, copy: "မြန်ဆန်သော ကောင်တာ ငွေချေစနစ်" },
              {
                key: "RESTAURANT",
                label: "စားသောက်ဆိုင် / ကဖေး မုဒ်",
                icon: UtensilsCrossed,
                copy: "စားပွဲများ၊ မပြီးသေးသော ဘေလ်များ၊ မီးဖိုချောင် တိုကင်များ",
              },
            ].map((mode) => {
              const active = (store?.business_type ?? "RETAIL") === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => !active && setModeTarget(mode.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <mode.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {mode.label}
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="block text-xs text-muted-foreground">{mode.copy}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            လက်ရှိတွင် {isRestaurant ? "စားသောက်ဆိုင် / ကဖေး" : "အရောင်းဆိုင်"} မုဒ်ဖြင့် အသုံးပြုနေပါသည်။
          </p>
        </Section>

        <Section title="အကောင့်" description="ဤဆိုင်ပိုင်ရှင်၏ ဝင်ရောက်ရန် အီးမေးလ်။">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className={cn(inputClass, "pl-9")}
              />
            </div>
            <button
              onClick={() => void saveEmail()}
              disabled={savingEmail || email === session?.user.email}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} အီးမေးလ် ပြောင်းမည်
            </button>
          </div>
        </Section>

        <Section title="စာရင်းသွင်းမှု ပလန်" description="သင်သည် အခမဲ့ စတင်သူ ပလန်ကို အသုံးပြုနေပါသည်။">
          <button
            onClick={() => setPlansOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" /> ပလန်များ ကြည့်မည်
          </button>
        </Section>

        <Section title="အကူအညီ" description="အကူအညီ လိုအပ်ပါသလား? SMT POS အကူအညီပေးရေးသို့ ဆက်သွယ်ပါ။">
          <div className="flex flex-wrap gap-2">
            <a
              href="mailto:support@smtpos.app"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              <LifeBuoy className="h-4 w-4" /> support@smtpos.app
            </a>
            <a
              href="https://t.me/smtpos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              <Send className="h-4 w-4" /> Telegram
            </a>
          </div>
        </Section>

        <Section title="အကောင့်အသုံးပြုမှု" description="အကောင့်မှ ထွက်ပြီး သိမ်းဆည်းထားသော အော့ဖ်လိုင်း ဒေတာများကို ရှင်းလင်းပါမည်။">
          <button
            onClick={() => {
              void (async () => {
                await signOut();
                void navigate({ to: "/login", replace: true });
              })();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="h-4 w-4" /> ထွက်မည်
          </button>
        </Section>
      </div>

      {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} />}
      {modeTarget && (
        <ModeSwitchModal
          target={modeTarget}
          onClose={() => setModeTarget(null)}
          onConfirm={async () => {
            await switchMode(modeTarget);
            setModeTarget(null);
          }}
        />
      )}
    </PosShell>
  );
}

function PlansModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">စာရင်းသွင်းမှု ပလန်များ</h2>
          <button onClick={onClose} aria-label="Close plans" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-md border px-4 py-4",
                plan.current ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{plan.price}</p>
              <p className="text-xs text-muted-foreground">{plan.period}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.current}
                onClick={() => toast.info("ငွေပေးချေမှုစနစ် မကြာမီ လာပါမည် — အဆင့်မြှင့်တင်ရန် အကူအညီပေးရေးသို့ ဆက်သွယ်ပါ။")}
                className={cn(
                  "mt-4 h-10 rounded-md text-sm font-medium",
                  plan.current
                    ? "border border-border text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {plan.current ? "လက်ရှိ ပလန်" : "ပလန် အဆင့်မြှင့်မည်"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeSwitchModal({
  target,
  onClose,
  onConfirm,
}: {
  target: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-destructive/40 bg-card shadow-lg">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-destructive">
            {target === "RESTAURANT" ? "စားသောက်ဆိုင် / ကဖေး" : "အရောင်းဆိုင်"} မုဒ်သို့ ပြောင်းလဲမည်
          </h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            သတိပေးချက်- လုပ်ငန်းမုဒ် ပြောင်းလဲခြင်းသည် က်ရှိ ဆိုင်၏ ကုန်ပစ္စည်းနှင့် အရောင်းစာရင်းများကို ပြန်လည် စာရင်းဖျက်ပါမည်။ ဒေတာများကို ဖျက်ပြီး မုဒ်ပြောင်းရန် CONFIRM ဟု ရိုက်ထည့်ပါ။
          </p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="CONFIRM"
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              disabled={text !== "CONFIRM" || busy}
              onClick={() => {
                setBusy(true);
                void onConfirm().finally(() => setBusy(false));
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} ဒေတာများဖျက်၍ ပြောင်းမည်
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
