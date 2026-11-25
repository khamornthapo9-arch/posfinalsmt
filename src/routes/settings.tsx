import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Send,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useStoreLogo } from "@/lib/use-store-logo";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";
import { createTelegramLinkToken, sendStoreTelegramReport } from "@/lib/telegram-report.functions";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ဆိုင် ပြင်ဆင်ချက်များ — SMT POS" },
      {
        name: "description",
        content: "သင့် ဆိုင်အတွက် အသေးစိတ် ပြင်ဆင်မှုများနှင့် အကူအညီများရယူရန်။",
      },
      { property: "og:title", content: "ဆိုင် ပြင်ဆင်ချက်များ — SMT POS" },
      {
        property: "og:description",
        content:
          "SMT POS မှာ သင့် အမှတ်တံဆိပ်၊ အခွန်၊ လုပ်ငန်းအမျိုးအစား၊ အကောင့်နှင့် စာရင်းသွင်းမှု ပြင်ဆင်ချက်ရန်။",
      },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["Ks", "ကျပ်", "$", "€", "£", "¥", "₹"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsPage() {
  const { session, store, updateStore, signOut, isBranchDevice } = useAuth();
  const { isPro, symbol } = useStoreSettings();
  const logoUrl = useStoreLogo();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [storeSymbol, setStoreSymbol] = useState("Ks");
  const [tax, setTax] = useState("5");
  const [address, setAddress] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setStoreSymbol(store.currency_symbol || "Ks");
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
        currency_symbol: storeSymbol.trim() || "Ks",
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
    if (!session || !isPro) return;
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

  const sendTestTelegram = async () => {
    if (!store) return;
    setTestingTelegram(true);
    try {
      const res = await sendStoreTelegramReport({
        data: {
          storeId: store.id,
          storeName: store.name,
          currencySymbol: symbol,
          dateStr: new Date().toLocaleDateString("en-GB"),
          grossSales: 150000,
          refunds: 0,
          netSales: 150000,
          estimatedProfit: 45000,
          ordersCount: 12,
          cashIn: 100000,
          kbzIn: 50000,
          waveIn: 0,
          creditIssued: 0,
          closedBy: "ဆိုင်ရှင် (စမ်းသပ်)",
          isTest: true,
        },
      });
      if (res.success) {
        toast.success("Telegram သို့ စမ်းသပ်စာရင်း ရောက်ရှိသွားပါပြီ!");
      } else {
        toast.error(res.error || "ပို့၍မရပါ");
      }
    } catch (e) {
      toast.error((e as { message?: string } | null)?.message || "မအောင်မြင်ပါ");
    } finally {
      setTestingTelegram(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!store) return;
    try {
      await supabase
        .from("stores")
        .update({
          telegram_chat_id: null,
          telegram_username: null,
        })
        .eq("id", store.id);
      toast.success("Telegram ချိတ်ဆက်မှု ဖြုတ်လိုက်ပါပြီ");
      window.location.reload();
    } catch {
      toast.error("ချိတ်ဆက်မှု ဖြုတ်၍ မရပါ");
    }
  };

  const inputClass =
    "h-10 w-full rounded-sm border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const telegramChatId = store?.telegram_chat_id;
  const telegramUsername = store?.telegram_username;
  const botUsername = import.meta.env["VITE_TELEGRAM_BOT_USERNAME"] || "Smtpos_bot";

  // ဆိုင်ခွဲစက်ဖြစ်ပါက ဘောက်ချာပုံစံနှင့် Support သာ ပြသမည်
  if (isBranchDevice) {
    return (
      <PosShell title="ဆိုင်ခွဲ ပြင်ဆင်ချက်များ">
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ဆိုင်ခွဲ ပြင်ဆင်ချက်များ</h1>
              <p className="text-sm text-muted-foreground">{store?.name ?? "ဆိုင်ခွဲစက်"}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/", replace: true });
              }}
              className="inline-flex h-9 items-center gap-1.5 self-start rounded-sm border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 sm:self-auto"
            >
              <LogOut className="h-3.5 w-3.5" /> အကောင့်ထွက်မည်
            </button>
          </div>

          <div className="divide-y divide-border border-y border-border">
            <Link
              to="/settings/receipt"
              className="flex items-center justify-between py-3.5 text-sm font-medium hover:bg-accent/40"
            >
              <span>ဘောက်ချာ စာရွက်ပုံစံ ပြင်ဆင်ရန်</span>
              <Store className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <Section title="အကူအညီနှင့် ဆက်သွယ်ရန်">
            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:support@smtpos.app"
                className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                <LifeBuoy className="h-4 w-4" /> support@smtpos.app
              </a>
              <a
                href="https://t.me/smtpos"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                <Send className="h-4 w-4" /> Telegram
              </a>
            </div>
          </Section>
        </div>
      </PosShell>
    );
  }

  // ပင်မ Owner အတွက် အပြည့်အစုံ ပြသမည်
  return (
    <PosShell title="ဆိုင် ပြင်ဆင်ချက်များ">
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ဆိုင် ပြင်ဆင်ချက်များ</h1>
            <p className="text-sm text-muted-foreground">{store?.name ?? "သင့်ဆိုင်"}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/", replace: true });
            }}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-sm border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" /> အကောင့်ထွက်မည်
          </button>
        </div>

        {/* Navigation Rows */}
        <div className="divide-y divide-border border-y border-border">
          <Link
            to="/settings/staff"
            className="flex items-center justify-between py-3.5 text-sm font-medium hover:bg-accent/40"
          >
            <span>ဝန်ထမ်းများနှင့် ဆိုင်ခွဲများ</span>
            <Store className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            to="/settings/receipt"
            className="flex items-center justify-between py-3.5 text-sm font-medium hover:bg-accent/40"
          >
            <span>ဘောက်ချာ စာရွက်ပုံစံ</span>
            <Store className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            to="/settings/plan"
            className="flex items-center justify-between py-3.5 text-sm font-medium hover:bg-accent/40"
          >
            <span>အဆင့်မြှင့်တင်မှု (Pro Plan)</span>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Shop Info Section */}
        <Section title="ဆိုင် အချက်အလက်များ">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="Store logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadLogo(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !isPro}
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "လိုဂို ပြောင်းမည်"}
                </button>
                {!isPro && (
                  <p className="text-[11px] text-muted-foreground">လိုဂိုတင်ရန် Pro Plan လိုအပ်ပါသည်</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">ဆိုင်အမည်</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                  placeholder="SMT စတိုး"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">ငွေကြေး</label>
                <select
                  value={storeSymbol}
                  onChange={(e) => setStoreSymbol(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">အခွန်(%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">ကောင်တာ အရောင်းစာရေး</label>
                <input
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                  placeholder="ကိုမင်းမင်း"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">ဆိုင်လိပ်စာ</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={cn(inputClass, "mt-1")}
                  placeholder="အမှတ် (၁၂)၊ လမ်းမတော်၊ ရန်ကုန်"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">ဖုန်းနံပါတ်များ</label>
                <div className="mt-1 space-y-2">
                  {phones.map((phone, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={phone}
                        onChange={(e) => {
                          const updated = [...phones];
                          updated[idx] = e.target.value;
                          setPhones(updated);
                        }}
                        className={inputClass}
                        placeholder="၀၉-xxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setPhones(phones.filter((_, i) => i !== idx))}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border hover:bg-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPhones((prev) => [...prev, ""])}
                    className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-xs font-medium hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" /> ဖုန်းနံပါတ် ထပ်ထည့်မည်
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                  className="inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} သိမ်းမည်
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Telegram Daily Closing Integration */}
        <Section title="Telegram နေ့ချုပ် အစီရင်ခံစာ">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            {telegramChatId ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                ချိတ်ဆက်ထားသည်: @{telegramUsername || "Telegram Account"}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">ချိတ်ဆက်မထားပါ</span>
            )}

            <div className="flex items-center gap-2">
              {telegramChatId ? (
                <>
                  <button
                    type="button"
                    onClick={() => void sendTestTelegram()}
                    disabled={testingTelegram}
                    className="inline-flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {testingTelegram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    စမ်းသပ် ပို့ကြည့်မည်
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnectTelegram()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    ချိတ်ဆက်မှုဖြုတ်
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!store) return;
                    const win = window.open("", "_blank");
                    if (win) win.opener = null;
                    void createTelegramLinkToken({ data: { storeId: store.id } }).then((r) => {
                      if (!r.token) {
                        win?.close();
                        toast.error("ချိတ်ဆက်၍ မရပါ");
                        return;
                      }
                      const url = `https://t.me/${botUsername}?start=link_${r.token}`;
                      if (win) win.location.href = url;
                      else window.location.href = url;
                    });
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-sm bg-sky-500 px-4 text-xs font-medium text-white transition-colors hover:bg-sky-600"
                >
                  <Send className="h-3.5 w-3.5" />
                  Telegram နှင့် ချိတ်မည်
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* Modules Section */}
        <Section title="စနစ်အားလုံး ဖွင့်သုံးမည်">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">အဆင့်မြင့် စာရင်းကိုင် မုဒ်</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(store?.advanced_accounting_mode)}
              aria-label="အဆင့်မြင့် စာရင်းကိုင် မုဒ်"
              disabled={advancedSaving}
              onClick={() => void toggleAdvanced()}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
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

        {/* Account Section */}
        <Section title="အကောင့်">
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
              type="button"
              onClick={() => void saveEmail()}
              disabled={savingEmail || email === session?.user.email}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} အီးမေးလ် ပြောင်းမည်
            </button>
          </div>
        </Section>

        {/* Support Section */}
        <Section title="အကူအညီနှင့် ဆက်သွယ်ရန်">
          <div className="flex flex-wrap gap-2">
            <a
              href="mailto:support@smtpos.app"
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              <LifeBuoy className="h-4 w-4" /> support@smtpos.app
            </a>
            <a
              href="https://t.me/smtpos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              <Send className="h-4 w-4" /> Telegram
            </a>
          </div>
        </Section>
      </div>
    </PosShell>
  );
}
