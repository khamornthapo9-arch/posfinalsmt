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
      { title: "Store Settings — SMT POS" },
      {
        name: "description",
        content:
          "Configure store branding, currency, sales tax, business mode, account email, subscription plan and support for your SMT POS store.",
      },
      { property: "og:title", content: "Store Settings — SMT POS" },
      {
        property: "og:description",
        content: "Branding, tax, business mode, account and subscription settings for SMT POS.",
      },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["$", "€", "£", "¥", "₹", "K"];

const PLANS = [
  {
    name: "Free Starter",
    price: "$0",
    period: "forever",
    features: ["1 store", "Up to 50 products", "Offline checkout", "Basic analytics"],
    current: true,
  },
  {
    name: "Pro Cashier",
    price: "$19",
    period: "per month",
    features: ["Unlimited products", "Restaurant mode", "Kitchen tickets", "CSV exports"],
    current: false,
  },
  {
    name: "Multi-Store Enterprise",
    price: "$79",
    period: "per month",
    features: ["Unlimited stores", "Staff accounts", "Priority support", "Custom reports"],
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
  }, [store]);

  useEffect(() => {
    setEmail(session?.user.email ?? "");
  }, [session]);

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error("Store name is required");
      return;
    }
    setSavingProfile(true);
    try {
      await updateStore({
        name: name.trim(),
        currency_symbol: symbol.trim() || "$",
        tax_rate: Number(tax) || 0,
      });
      toast.success("Store profile saved");
    } catch {
      toast.error("Could not save store profile");
    } finally {
      setSavingProfile(false);
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
      toast.success("Logo updated");
    } catch {
      toast.error("Could not upload the logo");
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
      toast.success("Confirmation email sent to the new address");
    } catch {
      toast.error("Could not update the email address");
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
      nextMode === "RESTAURANT" ? "Switched to Restaurant mode" : "Switched to Retail mode",
    );
  };

  const isRestaurant = store?.business_type === "RESTAURANT";

  return (
    <PosShell title="Store Settings" subtitle="Branding, tax, business mode and account">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Section
          title="Store profile & branding"
          description="Shown on your receipts, labels and sidebar."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="Store logo" className="h-full w-full object-contain" />
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
                Upload logo
              </button>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="store-name">
                  Store name
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
                  Currency symbol
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
                  Default sales tax (%)
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
                <button
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Business mode"
          description="Retail rings up items directly. Restaurant adds a table floor plan and kitchen tickets."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "RETAIL", label: "Retail Store Mode", icon: Store, copy: "Fast counter checkout" },
              {
                key: "RESTAURANT",
                label: "Restaurant / Cafe Mode",
                icon: UtensilsCrossed,
                copy: "Tables, open tabs, kitchen tickets",
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
            Currently running in {isRestaurant ? "Restaurant / Cafe" : "Retail Store"} mode.
          </p>
        </Section>

        <Section title="Account" description="Sign-in email for this store owner.">
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
              {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} Update email
            </button>
          </div>
        </Section>

        <Section title="Subscription" description="You are on the Free Starter plan.">
          <button
            onClick={() => setPlansOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" /> View plans
          </button>
        </Section>

        <Section title="Support" description="Need help? Contact SMT POS Support.">
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

        <Section title="Session" description="Signs out and clears the local offline cache.">
          <button
            onClick={() => {
              void (async () => {
                await signOut();
                void navigate({ to: "/login", replace: true });
              })();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="h-4 w-4" /> Sign out
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
          <h2 className="text-sm font-semibold">Subscription plans</h2>
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
                onClick={() => toast.info("Billing is coming soon — contact support to upgrade.")}
                className={cn(
                  "mt-4 h-10 rounded-md text-sm font-medium",
                  plan.current
                    ? "border border-border text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {plan.current ? "Current plan" : "Upgrade plan"}
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
            Switch to {target === "RESTAURANT" ? "Restaurant / Cafe" : "Retail Store"} mode
          </h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            Warning: Switching business modes resets current store inventory and sales tables to
            prevent schema conflict. Type CONFIRM to wipe data and switch.
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
              Cancel
            </button>
            <button
              disabled={text !== "CONFIRM" || busy}
              onClick={() => {
                setBusy(true);
                void onConfirm().finally(() => setBusy(false));
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Wipe data & switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
