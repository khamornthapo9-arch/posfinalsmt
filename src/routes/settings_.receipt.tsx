import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Printer, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { useAuth } from "@/lib/auth-store";
import { useRole } from "@/lib/roles";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings_/receipt")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ပြေစာ ဒီဇိုင်း ပြင်ဆင်ခြင်း — SMT POS" },
      {
        name: "description",
        content:
          "ဆိုင်အမည်၊ လိပ်စာ၊ ဖုန်းနံပါတ်နှင့် ပြေစာ ခေါင်းစီး/အောက်ခြေ စာသားများကို တိုက်ရိုက် အစမ်းကြည့်ရှုပြီး ပြင်ဆင်ပါ။",
      },
      { property: "og:title", content: "ပြေစာ ဒီဇိုင်း ပြင်ဆင်ခြင်း — SMT POS" },
      {
        property: "og:description",
        content: "Thermal ပြေစာ ပုံစံကို တိုက်ရိုက် အစမ်းကြည့်ရင်း ပြင်ဆင်နိုင်သည်။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReceiptSettingsPage,
});

const SAMPLE_LINES = [
  { name: "ကော်ဖီမစ်", qty: 2, price: 700 },
  { name: "မုန့်ကြော်", qty: 1, price: 1500 },
  { name: "ရေသန့်ဘူး", qty: 3, price: 400 },
];

function ReceiptSettingsPage() {
  const { store, updateStore } = useAuth();
  const { symbol, taxPercent, fmt, isPro } = useStoreSettings();
  const { isOwner, canManageSettings } = useRole();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [width, setWidth] = useState<"58" | "80">("80");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store) return;
    setName(store.name ?? "");
    setAddress(store.address ?? "");
    setPhones(store.phone_numbers ?? []);
    setHeader(isPro ? (store.receipt_header ?? "") : "");
    setFooter(isPro ? (store.receipt_footer ?? "") : "");
  }, [store, isPro]);


  const totals = useMemo(() => {
    const subtotal = SAMPLE_LINES.reduce((sum, l) => sum + l.qty * l.price, 0);
    const tax = (subtotal * taxPercent) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [taxPercent]);

  const addPhone = () => {
    const value = phoneDraft.trim();
    if (!value) return;
    if (phones.includes(value)) {
      setPhoneDraft("");
      return;
    }
    setPhones((prev) => [...prev, value]);
    setPhoneDraft("");
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("ဆိုင်အမည် ထည့်ပါ");
      return;
    }
    setSaving(true);
    try {
      await updateStore({
        name: name.trim(),
        address: address.trim() || null,
        phone_numbers: phones,
        ...(isPro
          ? {
              receipt_header: header.trim() || null,
              receipt_footer: footer.trim() || null,
            }
          : {}),
      });
      toast.success("ပြေစာ ပြင်ဆင်ချက် သိမ်းပြီးပါပြီ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "သိမ်း၍ မရပါ");
    } finally {
      setSaving(false);
    }
  };


  if (!canManageSettings) {
    return (
      <PosShell title="ပြေစာ ဒီဇိုင်း">
        <div className="p-6 text-sm text-muted-foreground">
          ဤစာမျက်နှာကို ဆိုင်ပိုင်ရှင်သာ ကြည့်ရှုနိုင်ပါသည်။
        </div>
      </PosShell>
    );
  }

  return (

    <PosShell
      title="ပြေစာ ဒီဇိုင်း"
      subtitle="ပြင်ဆင်လိုက်တာနှင့်အမျှ ညာဘက်တွင် ချက်ချင်း မြင်ရပါမည်"
      actions={
        <Link
          to="/settings"
          className="no-print inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> ပြင်ဆင်ချက်များ
        </Link>
      }
    >
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="no-print space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">ဆိုင် အချက်အလက်</h2>
            <div className="space-y-3">
              <Field label="ဆိုင်အမည်">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  placeholder="SMT စတိုးဆိုင်"
                />
              </Field>
              <Field label="လိပ်စာ">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="အမှတ် ၁၂၃၊ ဗိုလ်ချုပ်လမ်း၊ ရန်ကုန်"
                />
              </Field>
              <Field label="ဖုန်းနံပါတ်များ">
                <div className="flex gap-2">
                  <input
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPhone();
                      }
                    }}
                    className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                    placeholder="09-xxxxxxxxx"
                  />
                  <button
                    onClick={addPhone}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" /> ထည့်မည်
                  </button>
                </div>
                {phones.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {phones.map((phone) => (
                      <span
                        key={phone}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
                      >
                        {phone}
                        <button
                          onClick={() => setPhones((prev) => prev.filter((p) => p !== phone))}
                          aria-label={`${phone} ဖျက်မည်`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">ပြေစာ စာသားများ</h2>
              {!isPro && (
                <span className="text-xs text-muted-foreground">Pro Plan မှ စမည်</span>
              )}
            </div>
            <div className="space-y-3">
              <Field label="ခေါင်းစီး စာသား">
                <textarea
                  value={header}
                  onChange={(e) => isPro && setHeader(e.target.value)}
                  rows={2}
                  maxLength={160}
                  disabled={!isPro}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  placeholder={isPro ? "ကြိုဆိုပါသည်!" : "Pro Plan သို့ အဆင့်မြှင့်ပါ"}
                />
              </Field>
              <Field label="အောက်ခြေ ကြော်ငြာ စာသား">
                <textarea
                  value={footer}
                  onChange={(e) => isPro && setFooter(e.target.value)}
                  rows={3}
                  maxLength={200}
                  disabled={!isPro}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  placeholder={isPro ? "ကျေးဇူးတင်ပါသည်။ နောက်တစ်ခေါက် ကြွရောက်ပါဦး!" : "Pro Plan သို့ အဆင့်မြှင့်ပါ"}
                />
              </Field>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">စက္ကူအကျယ်</span>
                {(["58", "80"] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWidth(w)}
                    className={cn(
                      "min-h-9 rounded-md border px-3 text-xs font-medium",
                      width === w
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {w}mm
                  </button>
                ))}
              </div>
            </div>
          </section>


          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              သိမ်းမည်
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              <Printer className="h-4 w-4" /> အစမ်း ပရင့်
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <p className="no-print mb-2 text-xs font-medium text-muted-foreground">
            တိုက်ရိုက် အစမ်းကြည့်ရှုမှု
          </p>
          <div className="rounded-xl bg-muted/50 p-3">
            <div
              className={cn(
                "print-area receipt-sheet mx-auto bg-white p-4 font-mono text-[12px] leading-relaxed text-black shadow-sm",
                width === "58" ? "roll-58 max-w-[220px]" : "max-w-[300px]",
              )}
            >
              <div className="text-center">
                <p className="text-sm font-bold uppercase">{name || "ဆိုင်အမည်"}</p>
                {address && <p className="whitespace-pre-line text-[11px]">{address}</p>}
                {phones.length > 0 && <p className="text-[11px]">ဖုန်း — {phones.join(" / ")}</p>}
                {header && <p className="mt-1 whitespace-pre-line text-[11px]">{header}</p>}
              </div>
              <div className="print-divider my-2" />
              <p className="text-[11px]">{new Date().toLocaleString()}</p>
              <div className="print-divider my-2" />
              <div className="space-y-1">
                {SAMPLE_LINES.map((line) => (
                  <div key={line.name} className="flex justify-between gap-2">
                    <span className="truncate">
                      {line.qty} x {line.name}
                    </span>
                    <span className="tabular-nums">{fmt(line.qty * line.price)}</span>
                  </div>
                ))}
              </div>
              <div className="print-divider my-2" />
              <div className="space-y-1">
                <Row label="စုစုပေါင်း" value={fmt(totals.subtotal)} />
                <Row label={`အခွန် (${taxPercent}%)`} value={fmt(totals.tax)} />
                <div className="flex justify-between text-sm font-bold">
                  <span>ကျသင့်ငွေ</span>
                  <span className="tabular-nums">
                    {symbol}
                    {totals.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="print-divider my-2" />
              <p className="whitespace-pre-line text-center text-[11px]">
                {footer || "ကျေးဇူးတင်ပါသည်!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PosShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}