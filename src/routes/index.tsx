import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LottiePlayer } from "@/components/landing/lottie-player";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMT POS — လက်လီအရောင်းနှင့် စတိုးစီမံမှုစနစ်" },
      {
        name: "description",
        content:
          "Offline လက်လီ POS စနစ်။ ဘားကုဒ် Scan၊ ကုန်ပစ္စည်းလက်ကျန်၊ ဆိုင်ခွဲများချိတ်ဆက်မှုနှင့် နေ့စဉ်အမြတ်စာရင်း။",
      },
      {
        property: "og:title",
        content: "SMT POS — လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်",
      },
      {
        property: "og:description",
        content: "Offline လက်လီ POS၊ ဆိုင်ခွဲစနစ်၊ ကုန်ပစ္စည်းစီမံခြင်းနှင့် အမြတ်စာရင်းစနစ်။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const myanmarSerif = { fontFamily: "'Noto Serif Myanmar', serif" };

const FEATURE_CARDS = [
  {
    title: "ဘားကုဒ်ဖြင့် အမြန်ငွေရှင်း",
    body: "ကုန်ပစ္စည်းကို စကင်န်ဖတ်ပြီး ခြင်းတောင်းထဲ ထည့်ကာ ငွေရှင်းနိုင်သည်။",
  },
  {
    title: "အော့ဖ်လိုင်း ရောင်းချမှု",
    body: "လိုင်းပြတ်ချိန်တွင်လည်း အရောင်းဆက်လုပ်နိုင်ပြီး ပြန်ချိတ်သည့်အခါ ဒေတာ ချိန်ညှိသည်။",
  },
  {
    title: "ကုန်လက်ကျန် စီမံခြင်း",
    body: "SKU၊ ယူနစ်၊ အနိမ့်ဆုံးပမာဏနှင့် လက်ကျန် သတိပေးချက်ကို တစ်နေရာတည်းတွင် ကြည့်နိုင်သည်။",
  },
  {
    title: "ဆိုင်ခွဲ စီမံမှု",
    body: "Pro တွင် ဆိုင်ခွဲကုဒ်နှင့် PIN ဖြင့် ဆိုင်ခွဲများစွာကို ပင်မအကောင့်မှ စီမံနိုင်သည်။",
  },
  {
    title: "အကြွေးနှင့် ဖောက်သည်",
    body: "ဖောက်သည်အကြွေး၊ ငွေလက်ခံမှုနှင့် နေ့ချုပ်စာရင်းကို စနစ်တကျ မှတ်တမ်းတင်သည်။",
  },
  {
    title: "အမြတ်နှင့် အစီရင်ခံစာ",
    body: "နေ့စဉ်အရောင်း၊ ကုန်ကျစရိတ်နှင့် အသားတင်အမြတ်ကို ရှင်းလင်းစွာ ပြသသည်။",
  },
] as const;

const OPS = [
  "ဘားကုဒ် ပြင်ဆင်ခြင်းနှင့် ကုန်ပစ္စည်း ထည့်သွင်းခြင်း",
  "လက်ကား / လက်လီ ယူနစ် စီမံခြင်း",
  "အမြတ်ငွေ နေ့ချုပ် တွက်ချက်ခြင်း",
  "ဆိုင်ခွဲများကို live ကြည့်ခြင်း (Pro)",
  "Excel နှင့် CSV ထုတ်ယူခြင်း",
] as const;

const PRO_POINTS = [
  {
    title: "ဆိုင်ခွဲများ ကွန်ရက်ချိတ်ဆက်ခြင်း",
    body: "ဆိုင်ခွဲကုဒ်နှင့် ၄ လုံး PIN ဖြင့် ဆိုင်ခွဲပေါင်းများစွာကို ပင်မအကောင့်တစ်ခုတည်းကနေ တိုက်ရိုက် စီမံခန့်ခွဲနိုင်သည်။",
  },
  {
    title: "အော့ဖ်လိုင်းစနစ်",
    body: "အင်တာနက်လိုင်းကျချိန်မှာတောင် အရောင်းစာရင်းနှင့် လုပ်ဆောင်ချက်ကို တိကျအောင် လုပ်ပေးနိုင်သည်။",
  },
  {
    title: "ဘောက်ချာဒီဇိုင်း",
    body: "ဆိုင်ရဲ့ ကိုယ်ပိုင် အမှတ်တံဆိပ် Logo၊ ဖုန်းနံပါတ်၊ လိပ်စာနှင့် အောက်ခြေ အမှာစကားများကို စိတ်ကြိုက် ပြင်ဆင်ထည့်သွင်းနိုင်သည်။",
  },
] as const;

const CAPABILITIES_LEFT = [
  "ဘားကုဒ်နှင့် QR ငွေရှင်းစနစ်",
  "အော့ဖ်လိုင်း ရောင်းချမှု",
  "ကုန်ပစ္စည်း လက်ကျန် စီမံ",
  "KBZPay / WavePay ငွေခွဲပေးချေ",
  "ဖောက်သည် အကြွေးစာရင်း",
  "ဝန်ထမ်း အခန်းကဏ္ဍ",
  "ခြင်းတောင်း ခေတ္တထိန်း",
] as const;

const CAPABILITIES_RIGHT = [
  "ဆိုင်ခွဲများ စီမံခန့်ခွဲမှု",
  "ဆိုင်သုံးစရိတ် စာရင်းမှတ်ခြင်း",
  "နေ့ချုပ်စာရင်း ပရင့်ထုတ်ခြင်း",
  "အသားတင်အမြတ်ငွေ အစီရင်ခံစာ",
  "စိတ်ကြိုက် ဆိုင် Logo ဘောက်ချာ",
  "Excel / CSV ထုတ်ယူခြင်း",
  "ကုန်သွင်းသူနှင့် ဝယ်ယူမှု",
] as const;

function Frame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_12px_40px_-16px_rgba(28,25,23,0.18)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] text-stone-900 antialiased selection:bg-amber-200/50">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-[#f4f1ea]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LottiePlayer src="/animations/s-logo.json" className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight text-stone-900">SMT POS</p>
              <p className="text-[11px] font-medium text-stone-500">အရောင်းနှင့် စာရင်းစနစ်</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-stone-600 md:flex">
            <a href="#hero" className="transition-colors hover:text-stone-900">
              မူလ
            </a>
            <a href="#features" className="transition-colors hover:text-stone-900">
              လုပ်ဆောင်ချက်များ
            </a>
            <a href="#pro-capabilities" className="transition-colors hover:text-stone-900">
              ပရိုစနစ်များ
            </a>
            <a href="#plans" className="transition-colors hover:text-stone-900">
              အစီအစဉ်များ
            </a>
            <a href="#contact" className="transition-colors hover:text-stone-900">
              ဆက်သွယ်ရန်
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden h-9 text-stone-700 hover:bg-stone-200/70 sm:inline-flex"
            >
              <Link to="/login">အကောင့်ဝင်ရန်</Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-lg bg-[#1c1917] px-4 text-sm font-semibold text-white hover:bg-stone-800"
            >
              <Link to="/login" search={{ mode: "signup" }}>
                အခမဲ့ စတင်ရန်
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section id="hero" className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-sky-200/25 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ဗားရှင်း ၁.၂ · လက်လီဆိုင်များအတွက်
                </div>

                <h1
                  style={myanmarSerif}
                  className="text-3xl font-bold leading-[1.25] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.28]"
                >
                  ဆိုင်ကောင်တာမှ ရောင်းချ၊ လက်ကျန်စစ်၊ နေ့ချုပ်စာရင်းထုတ် — တစ်စနစ်တည်း
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                  SMT POS သည် မြန်မာလက်လီဆိုင်များအတွက် ရေးသားထားသော အရောင်းနှင့် စာရင်းစနစ်
                  ဖြစ်သည်။ ဘားကုဒ်စကင်န်၊ အော့ဖ်လိုင်းရောင်းချမှု၊ ဆိုင်ခွဲစီမံမှုနှင့်
                  အမြတ်စာရင်းကို တစ်နေရာတည်းတွင် လုပ်ဆောင်နိုင်သည်။
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    asChild
                    className="h-11 rounded-lg bg-[#1c1917] px-6 text-sm font-semibold text-white shadow-md hover:bg-stone-800"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      အခမဲ့ စတင်အသုံးပြုမည်
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-lg border-stone-300 bg-white/70 px-6 text-sm font-semibold text-stone-800 hover:bg-white"
                  >
                    <Link to="/register">ဝင်ရောက်ရန်</Link>
                  </Button>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-stone-200/90 pt-6 sm:grid-cols-4">
                  {[
                    ["Offline", "လိုင်းမရှိလည်း ရောင်းနိုင်"],
                    ["Barcode", "စကင်န်ဖြင့် အမြန်ထည့်"],
                    ["Branches", "Pro တွင် စီမံနိုင်"],
                    ["မြန်မာစာ", "UI အပြည့်အဝ"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm font-bold text-stone-900">{k}</dt>
                      <dd className="mt-0.5 text-xs leading-snug text-stone-500">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="lg:col-span-6">
                <Frame className="mx-auto max-w-lg bg-gradient-to-b from-white to-stone-50 p-4 sm:p-6">
                  <LottiePlayer
                    src="/animations/computer.json"
                    className="mx-auto aspect-square w-full max-w-md"
                  />
                </Frame>
              </div>
            </div>
          </div>
        </section>

        {/* ── Operations banner ─────────────────────────────── */}
        <section className="border-y border-stone-800 bg-[#1c1917] text-stone-100">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <Frame className="border-stone-700 bg-stone-900/50 p-3 sm:p-4">
                  <LottiePlayer
                    src="/animations/Computer_Programming.json"
                    className="mx-auto aspect-square w-full max-w-sm"
                  />
                </Frame>
              </div>

              <div className="order-1 space-y-5 lg:order-2 lg:col-span-7">
                <h2 style={myanmarSerif} className="text-2xl font-bold sm:text-3xl">
                  နေ့စဉ် ဆိုင်လုပ်ငန်းအတွက် လိုအပ်သည်များကို ဖြည့်ဆည်းပေးသည်
                </h2>
                <p className="text-sm leading-relaxed text-stone-300 sm:text-base">
                  ကောင်တာမှ စာရင်းအထိ — ရောင်းချခြင်း၊ လက်ကျန်ထိန်းခြင်းနှင့် နေ့ချုပ်
                  ထုတ်ယူခြင်းကို တစ်ခုတည်းသော စနစ်ဖြင့် စီမံနိုင်သည်။
                </p>
                <ol className="space-y-2.5">
                  {OPS.map((line, i) => (
                    <li
                      key={line}
                      className="flex gap-3 rounded-lg border border-stone-700/80 bg-stone-900/60 px-3.5 py-2.5 text-sm leading-relaxed"
                    >
                      <span className="font-mono text-xs text-amber-400/90">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section id="features" className="bg-[#f4f1ea]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <LottiePlayer
                src="/animations/Open_Excel_at_Cloud.json"
                className="mx-auto mb-4 h-28 w-28 sm:h-32 sm:w-32"
              />
              <h2
                style={myanmarSerif}
                className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
              >
                အဓိက လုပ်ဆောင်ချက်များ
              </h2>
              <p className="mt-2 text-sm text-stone-600 sm:text-base">
                လက်လီဆိုင်များအတွက် လက်တွေ့အသုံးဝင်သော အပိုင်းများကို စုစည်းထားသည်။
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CARDS.map((card, i) => (
                <article
                  key={card.title}
                  className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-mono text-xs font-semibold text-amber-700/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    style={myanmarSerif}
                    className="mt-2 text-base font-bold text-stone-900 sm:text-[17px]"
                  >
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pro capabilities ──────────────────────────────── */}
        <section
          id="pro-capabilities"
          className="border-y border-stone-800 bg-[#1c1917] text-stone-100"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Frame className="border-stone-700 bg-stone-900/40 p-3 sm:p-5">
                  <LottiePlayer
                    src="/animations/OTP_Verification.json"
                    className="mx-auto aspect-square w-full max-w-md"
                  />
                </Frame>
              </div>

              <div className="space-y-6 lg:col-span-7">
                <div className="inline-flex rounded-md border border-stone-600 bg-stone-800/80 px-2.5 py-1 text-xs font-semibold text-stone-200">
                  SMT POS Pro
                </div>
                <h2
                  style={myanmarSerif}
                  className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl lg:leading-snug"
                >
                  ဆိုင်ခွဲရှိသော စတိုးကြီးများအတွက် ပရိုစနစ်များ
                </h2>

                <div className="divide-y divide-stone-700 overflow-hidden rounded-xl border border-stone-700 bg-stone-900/50">
                  {PRO_POINTS.map((p) => (
                    <div key={p.title} className="px-5 py-4">
                      <h3 style={myanmarSerif} className="text-sm font-bold text-white sm:text-base">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-300">{p.body}</p>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 border-stone-500 bg-transparent text-sm font-semibold text-white hover:bg-white hover:text-stone-900"
                >
                  <Link to="/login" search={{ mode: "signup" }}>
                    Pro အစီအစဉ်သို့ အဆင့်မြှင့်တင်ရန်
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 14 capabilities + phone Lottie ────────────────── */}
        <section id="capabilities" className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2
              style={myanmarSerif}
              className="text-center text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
            >
              အဓိက လက်လီလုပ်ဆောင်ချက် ၁၄ ခု
            </h2>
            <p className="mt-2 text-center text-sm text-stone-600">
              လက်လီဆိုင်များအတွက် ဖြည့်ဆည်းပေးထားသည့် အရာများ
            </p>

            <div className="mt-12 grid items-center gap-8 lg:grid-cols-12">
              <ul className="space-y-2.5 lg:col-span-4">
                {CAPABILITIES_LEFT.map((c, i) => (
                  <li
                    key={c}
                    className="flex items-center gap-3 rounded-lg border border-stone-200 bg-[#f4f1ea]/60 px-3.5 py-2.5 text-sm font-medium text-stone-800"
                  >
                    <span className="w-5 shrink-0 font-mono text-[11px] text-stone-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {c}
                  </li>
                ))}
              </ul>

              <div className="flex justify-center lg:col-span-4">
                <Frame className="w-full max-w-[280px] bg-gradient-to-b from-white to-stone-50 p-3">
                  <LottiePlayer
                    src="/animations/phone.json"
                    className="mx-auto aspect-square w-full"
                  />
                </Frame>
              </div>

              <ul className="space-y-2.5 lg:col-span-4">
                {CAPABILITIES_RIGHT.map((c, i) => (
                  <li
                    key={c}
                    className="flex items-center gap-3 rounded-lg border border-stone-200 bg-[#f4f1ea]/60 px-3.5 py-2.5 text-sm font-medium text-stone-800"
                  >
                    <span className="w-5 shrink-0 font-mono text-[11px] text-stone-400">
                      {String(i + 8).padStart(2, "0")}
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Plans ─────────────────────────────────────────── */}
        <section id="plans" className="border-t border-stone-200 bg-[#f4f1ea]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2
              style={myanmarSerif}
              className="text-center text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
            >
              သင့်ဆိုင်နှင့် ကိုက်ညီသော အစီအစဉ်
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-stone-600">
              အခမဲ့ စတင်သုံးစွဲနိုင်ပြီး ဆိုင်ခွဲနှင့် အဆင့်မြင့် စီမံမှုအတွက် Pro သို့
              မြှင့်တင်နိုင်သည်။
            </p>

            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {/* Free */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-200 bg-stone-50 px-6 py-5">
                  <p className="text-xs font-medium text-stone-500">စတင်သူများအတွက်</p>
                  <p style={myanmarSerif} className="mt-1 text-2xl font-bold text-stone-900">
                    အခမဲ့ (Free)
                  </p>
                  <p className="mt-1 text-sm text-stone-500">ဆိုင်ငယ်တစ်ဆိုင်အတွက် သင့်တော်သည်</p>
                </div>
                <ul className="flex-1 space-y-2.5 px-6 py-5 text-sm text-stone-700">
                  {[
                    "ကုန်ပစ္စည်း ၃၀၀ အထိ သိမ်းဆည်းနိုင်",
                    "အင်တာနက်မလိုဘဲ အော့ဖ်လိုင်း ရောင်းချနိုင်",
                    "ဖောက်သည်နှင့် ကုန်သွင်းသူ ၂၀ ဦး",
                    "အရောင်းကောင်တာ ခြင်းတောင်း ၁ ခု ခေတ္တထိန်းနိုင်",
                    "နေ့စဉ် အရောင်းအကျဉ်းချုပ် အစီရင်ခံစာ",
                    "စံသတ်မှတ်ချက် ဘောက်ချာထုတ်ယူမှု",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-stone-400">–</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-lg border-stone-300 text-sm font-semibold"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      အခမဲ့ စတင်အသုံးပြုမည်
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Pro */}
              <div className="flex flex-col overflow-hidden rounded-xl border-2 border-stone-900 bg-white shadow-md">
                <div className="border-b border-stone-800 bg-[#1c1917] px-6 py-5 text-white">
                  <p className="text-xs font-medium text-stone-300">စီးပွားရေးဆိုင်များအတွက်</p>
                  <p style={myanmarSerif} className="mt-1 text-2xl font-bold">
                    Pro
                  </p>
                  <p className="mt-1 text-sm text-stone-300">ဆိုင်ခွဲနှင့် အပြည့်အဝ စီမံမှု</p>
                </div>
                <ul className="flex-1 space-y-2.5 px-6 py-5 text-sm text-stone-700">
                  {[
                    "ကုန်ပစ္စည်း အရေအတွက် ကန့်သတ်မရှိ",
                    "ဆိုင်ခွဲများ စီမံခြင်း",
                    "ဖောက်သည် / ကုန်သွင်းသူ ကန့်သတ်မရှိ",
                    "ဝန်ထမ်း အခန်းကဏ္ဍ",
                    "အမြတ်နှင့် ကုန်ကျစရိတ် အစီရင်ခံစာ",
                    "စိတ်ကြိုက် ဘောက်ချာ ဒီဇိုင်း",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-stone-400">–</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6">
                  <Button
                    asChild
                    className="w-full rounded-lg bg-[#1c1917] text-sm font-semibold text-white hover:bg-stone-800"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      Pro စတင်မည်
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────── */}
        <section id="contact" className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2
                  style={myanmarSerif}
                  className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
                >
                  ဆက်သွယ်ရန်
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600 sm:text-base">
                  အသုံးပြုမှု၊ Pro အစီအစဉ် သို့မဟုတ် ဆိုင်တပ်ဆင်ပေးခြင်းနှင့် ပတ်သက်၍
                  မေးမြန်းနိုင်ပါသည်။
                </p>
                <dl className="mt-8 space-y-5 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      ဖုန်း
                    </dt>
                    <dd className="mt-1 font-medium text-stone-900">၀၉ · · · · · · · · · ·</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Viber / Telegram
                    </dt>
                    <dd className="mt-1 font-medium text-stone-900">တောင်းဆိုချက်ပို့ပြီး ဆက်သွယ်ပါ</dd>
                  </div>
                </dl>
              </div>

              <form
                className="space-y-4 rounded-xl border border-stone-200 bg-[#f4f1ea]/50 p-5 shadow-sm sm:p-6"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <label className="text-sm font-medium text-stone-800">အမည်</label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-stone-500"
                    placeholder="သင့်အမည်"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-800">
                    ဖုန်း သို့မဟုတ် Viber / Telegram
                  </label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-stone-500"
                    placeholder="၀၉..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-800">
                    မေးမြန်းလိုသောအကြောင်းအရာ
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-stone-500"
                    placeholder="သိရှိလိုသော အချက်အလက်များကို ရေးသားပေးပါ..."
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 rounded-lg bg-[#1c1917] px-5 text-sm font-semibold text-white hover:bg-stone-800"
                >
                  မက်ဆေ့ခ်ျ ပို့မည်
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-[#f4f1ea] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <LottiePlayer src="/animations/s-logo.json" className="h-7 w-7" />
            <p>
              © {new Date().getFullYear()} SMT POS · လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်
            </p>
          </div>
          <div className="flex gap-5 font-medium text-stone-600">
            <Link to="/login" className="hover:text-stone-900">
              အကောင့်ဝင်ရန်
            </Link>
            <Link to="/register" className="font-semibold text-stone-900 hover:underline">
              အရောင်းကောင်တာဖွင့်မည်
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
