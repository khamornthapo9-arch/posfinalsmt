import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart2,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  CreditCard,
  Receipt,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
} from "lucide-react";
import smtPosLogo from "@/assets/smt-pos-logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMT POS — မြန်မာဆိုင်များအတွက် POS စနစ်" },
      {
        name: "description",
        content:
          "အင်တာနက်မရှိလည်း ရောင်းချနိုင်သော ခေတ်မီ POS စနစ်။ ဘားကုဒ်စကင်၊ ကုန်ပစ္စည်းလက်ကျန်၊ အကြွေးစာရင်းနှင့် အမြတ်ငွေတွက်ချက်မှု။",
      },
      { property: "og:title", content: "SMT POS — မြန်မာဆိုင်များအတွက် POS စနစ်" },
      {
        property: "og:description",
        content: "အော့ဖ်လိုင်းရောင်းချနိုင်သော POS၊ ကုန်ပစ္စည်း၊ ဖောက်သည်နှင့် အမြတ်စာရင်းစနစ်။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <img
                src={smtPosLogo}
                alt="SMT POS"
                className="h-7 w-7 rounded-md border border-border object-contain"
              />
              <span className="text-sm font-semibold tracking-tight">SMT POS</span>
            </Link>
            <div className="hidden items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              v1.2 Live
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-medium">
              <Link to="/login">အကောင့်ဝင်ရန်</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"
            >
              <Link to="/login" search={{ mode: "signup" }}>
                အခမဲ့ စတင်ရန်
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section: Asymmetric & High Contrast */}
        <section className="relative overflow-hidden border-b border-border py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              {/* Left Column: Headline & Direct CTAs */}
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 stroke-[1.5]" />
                  <span>အင်တာနက်မရှိလည်း အပြည့်အဝရောင်းချနိုင်သည်</span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.15]">
                  မြန်မာဆိုင်များအတွက် <br className="hidden sm:inline" />
                  အလွယ်ကူဆုံး POS စနစ်
                </h1>

                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  ဘားကုဒ်စကင်၊ ကုန်ပစ္စည်းလက်ကျန်၊ အကြွေးစာရင်းနှင့် နေ့စဉ်အသားတင်အမြတ်ကို
                  စက္ကန့်ပိုင်းအတွင်း တိကျစွာ စီမံတွက်ချက်နိုင်ပါသည်။
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 bg-foreground px-5 text-sm font-medium text-background hover:bg-foreground/90"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      အခမဲ့ အကောင့်ဖွင့်ရန်
                      <ArrowRight className="ml-1.5 h-4 w-4 stroke-[1.5]" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 border-border px-5 text-sm font-medium hover:bg-muted"
                  >
                    <Link to="/login">အကောင့်ဝင်ရန်</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-600" />
                    <span>ဖုန်း/တက်ဘလက် အားလုံးသုံးနိုင်</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-600" />
                    <span>အော့ဖ်လိုင်း အဆင်သင့်</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-600" />
                    <span>Credit Card မလိုပါ</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic UI Terminal Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-lg border border-border bg-card p-5 shadow-sm">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold tracking-tight">SMT Register #01</span>
                    </div>
                    <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      OFFLINE READY
                    </span>
                  </div>

                  {/* Terminal Recent Sale Preview */}
                  <div className="my-4 space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>ပြေစာအမှတ်</span>
                      <span>#1042</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Nescafe 3-in-1 (x၂)</span>
                      <span>၈,၀၀၀ Ks</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">ဆီသန့် ၁ လီတာ (x၁)</span>
                      <span>၁၄,၅၀၀ Ks</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Royal Milk Tea (x၁)</span>
                      <span>၆,၅၀၀ Ks</span>
                    </div>
                    <div className="border-t border-border pt-2 text-muted-foreground">
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>စုစုပေါင်းကျသင့်ငွေ</span>
                        <span className="text-sm font-bold">၂၉,၀၀၀ Ks</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span>ရှင်းပြီးပုံစံ</span>
                        <span className="text-emerald-600">KBZPay (အတည်ပြုပြီး)</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Metric Badge */}
                  <div className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">ယနေ့ အသားတင်အမြတ်</span>
                    <span className="font-semibold text-foreground">+၄၂,၈၀၀ Ks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 3-Step Process Bridge */}
        <section className="border-b border-border bg-muted/20 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-background text-xs font-mono font-semibold">
                  ၁
                </span>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    စကင်ဖတ်ပါ
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ဘားကုဒ်ဖတ်စက် သို့မဟုတ် ဖုန်းကင်မရာဖြင့် ပစ္စည်းထည့်ပါ။
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-background text-xs font-mono font-semibold">
                  ၂
                </span>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    ဘောက်ချာထုတ်ပါ
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ငွေသား (သို့) KPay, WavePay ဖြင့် စက္ကန့်ပိုင်းအတွင်း ရှင်းပါ။
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-background text-xs font-mono font-semibold">
                  ၃
                </span>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    အမြတ်ကြည့်ပါ
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ကုန်ကျစရိတ်နုတ်ပြီး အသားတင်အမြတ်ကို ချက်ချင်း စစ်ဆေးပါ။
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Asymmetric Bento Grid Features */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 max-w-xl">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                ဆိုင်တစ်ဆိုင်အတွက် လိုအပ်သော ကိရိယာအားလုံး
              </h2>
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                ရှုပ်ထွေးမှုမရှိဘဲ ရိုးရှင်းတိကျသော စာရင်းကိုင်နှင့် အရောင်းစနစ်။
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Featured Bento: Offline-First Capability (Spans 2 cols on lg) */}
              <div className="rounded-lg border border-border bg-card p-6 sm:col-span-2">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/40">
                  <WifiOff className="h-4 w-4 stroke-[1.5] text-foreground" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-base font-semibold">အင်တာနက်မရှိလည်း အလုပ်လုပ်သည်</h3>
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Local-First
                  </span>
                </div>
                <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  အင်တာနက်လိုင်းကျနေချိန်တွင်လည်း အရောင်းရပ်တန့်ခြင်းမရှိဘဲ ဆက်လက်ရောင်းချနိုင်ပြီး
                  လိုင်းပြန်ရချိန်တွင် ဒေတာများကို အလိုအလျောက် သိမ်းဆည်းပေးပါသည်။
                </p>
              </div>

              {/* Bento Card 2: Barcode & Quick Sales */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/40">
                  <ScanLine className="h-4 w-4 stroke-[1.5] text-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">မြန်ဆန်သော ငွေရှင်းစနစ်</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  ဘားကုဒ်ဖတ်ပြီး ဘောက်ချာထုတ်ယူနိုင်ကာ ငွေရှင်းချိန်ကို အမြန်ဆုံး လျှော့ချပေးသည်။
                </p>
              </div>

              {/* Bento Card 3: Inventory */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/40">
                  <Boxes className="h-4 w-4 stroke-[1.5] text-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">ကုန်ပစ္စည်း လက်ကျန်ထိန်း</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  ဝယ်ဈေး၊ ရောင်းဈေးနှင့် ပစ္စည်းကုန်နည်း သတိပေးချက်များကို တိကျစွာကြည့်နိုင်သည်။
                </p>
              </div>

              {/* Bento Card 4: Profit & Analytics */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/40">
                  <BarChart2 className="h-4 w-4 stroke-[1.5] text-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">အမြတ်နှင့် အရောင်းဆန်းစစ်ချက်</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  နေ့စဉ်ရောင်းအားနှင့် အသားတင်အမြတ်ငွေကို တစ်နေရာတည်းတွင် တွက်ချက်ပြသသည်။
                </p>
              </div>

              {/* Bento Card 5: Customers & Credit/Debt */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/40">
                  <Users className="h-4 w-4 stroke-[1.5] text-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">ဖောက်သည်နှင့် အကြွေးစာရင်း</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  အကြွေးရောင်းချမှု၊ ကျန်ငွေနှင့် ပြန်ဆပ်မှတ်တမ်းများကို စနစ်တကျ ထိန်းသိမ်းပါ။
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Minimalist Bottom CTA */}
        <section className="border-t border-border bg-muted/10 py-14 text-center">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              သင့်အရောင်းဆိုင်ကို ယနေ့ပင် စတင်လိုက်ပါ
            </h2>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
              အီးမေးလ်ဖြင့် အကောင့်ဖွင့်ပြီး မိနစ်ပိုင်းအတွင်း ရောင်းချနိုင်ပါသည်။
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                asChild
                className="h-10 bg-foreground px-5 text-xs font-medium text-background hover:bg-foreground/90"
              >
                <Link to="/login" search={{ mode: "signup" }}>
                  အခမဲ့ စတင်ရန်
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© 2026 SMT POS — မြန်မာဆိုင်များအတွက် စနစ်တကျ ဖန်တီးထားသည်။</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="transition-colors hover:text-foreground">
              အကောင့်ဝင်ရန်
            </Link>
            <Link to="/register" className="transition-colors hover:text-foreground">
              အရောင်းကောင်တာ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
