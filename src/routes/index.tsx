import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  FileSpreadsheet,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutGrid,
  Mail,
  MapPin,
  Network,
  Package,
  PackageCheck,
  Phone,
  QrCode,
  Receipt,
  ScanLine,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingUp,
  Tv2,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import smtPosLogo from "@/assets/smt-pos-logo.png";
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
      { property: "og:title", content: "SMT POS — ခေတ်သစ် လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်" },
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFE] text-[#1E202A] antialiased selection:bg-[#5B51D8] selection:text-white">
      {/* =========================================================
          ၁။ မီနူးဘား (NAVIGATION BAR - မူရင်း Logo ထိန်းသိမ်းထားသည်)
      ========================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={smtPosLogo}
              alt="SMT POS"
              className="h-10 w-10 rounded-xl border border-slate-200 object-contain shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                SMT POS
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[#5B51D8] uppercase mt-0.5">
                အရောင်းနှင့် စာရင်းစနစ်
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-bold tracking-wider uppercase text-slate-600 md:flex">
            <a href="#hero" className="transition-colors hover:text-[#5B51D8]">
              မူလ
            </a>
            <a href="#features" className="transition-colors hover:text-[#5B51D8]">
              လုပ်ဆောင်ချက်များ
            </a>
            <a href="#pro-capabilities" className="transition-colors hover:text-[#5B51D8]">
              ပရိုစနစ်များ
            </a>
            <a href="#plans" className="transition-colors hover:text-[#5B51D8]">
              အစီအစဉ်များ
            </a>
            <a href="#contact" className="transition-colors hover:text-[#5B51D8]">
              ဆက်သွယ်ရန်
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-bold">
              <Link to="/login">အကောင့်ဝင်ရန်</Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-lg bg-[#5B51D8] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#4D43C4]"
            >
              <Link to="/login" search={{ mode: "signup" }}>
                အခမဲ့ စတင်ရန်
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* =========================================================
            ၂။ ပင်မမိတ်ဆက် (HERO SECTION - လက်လီစတိုးသီးသန့်)
        ========================================================= */}
        <section id="hero" className="relative overflow-hidden py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* ဘယ်ဘက်ကော်လံ: ခေါင်းစဉ်နှင့် ခလုတ်များ */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span>ဗားရှင်း ၁.၂</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.15]">
                  SMT POS မှာ ဖြည့်ဆည်းပေးထားသည့်အရာများ -
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
                  စတိုးဆိုင်၊ မီနီမတ်စ်နှင့် လက်လီလက်ကား ဆိုင်များအတွက် ရည်ရွယ်ထားပြီး၊
                  ဘားကုဒ် Scan၊ ငွေခွဲပြီးပေးချေတာ၊ ကုန်လက်ကျန်၊ ဝယ်/ ရောင်း အကြွေးနှင့်
                  ဆိုင်ခွဲများချိတ်ဆက်နိုင်ပါတယ်။
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-lg bg-[#5B51D8] px-8 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#4D43C4]"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      အခမဲ့ အကောင့်ဖွင့်မည်
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-lg border-slate-200 px-8 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                  >
                    <Link to="/register">ဝင်ရောက်ရန်</Link>
                  </Button>
                </div>
              </div>

              {/* ညာဘက်ကော်လံ: အရောင်းစက် Mockup ပြသမှု */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                <div className="absolute -top-12 -left-8 h-72 w-72 rounded-full bg-[#A898F3]/30 blur-2xl -z-10" />
                <div className="absolute -bottom-8 -right-8 h-80 w-80 rounded-full bg-[#75C6F7]/25 blur-2xl -z-10" />

                <LottiePlayer src="/animations/computer.json" className="w-full max-w-lg aspect-square" />
              </div>
            </div>

            {/* အောက်ခြေ အဓိက လက်လီလုပ်ဆောင်ချက် ၅ ခု */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-sm mb-3">
                  <ScanLine className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">ဘားကုဒ် Scan </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-sm mb-3">
                  <WifiOff className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900"> Offline မုဒ်</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-sm mb-3">
                  <Boxes className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">ကုန်လက်ကျန်</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm mb-3">
                  <Building2 className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">ဆိုင်ခွဲများ စီမံခြင်း</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1 col-span-2 sm:col-span-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm mb-3">
                  <Receipt className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900"> ဝယ်/ရောင်း အကြွေးစာရင်း</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၃။ ခရမ်းရောင် GRADIENT အပိုင်း (OPERATIONS BANNER)
        ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#9D8AF2] via-[#8572ED] to-[#6E5BE8] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* အပေါ်ဘက် Pill ၅ ခု (Syntax အမှန်ပြင်ဆင်ထားသည်) */}
            <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                  <Barcode className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">ဘားကုဒ်ကို ပြင်ဆင်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white">
                  <Package className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">လက်ကား စီမံနိုင်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
                  <TrendingUp className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold"> အမြတ်ငွေ တွက်ချက်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                  <Network className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">ဆိုင်ခွဲများကို live လုပ်ပေးခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20 col-span-2 sm:col-span-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Excel နှင့် CSV ထုတ်ယူနိုင်ခြင်း</span>
              </div>
            </div>

            {/* Split Banner */}
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-6 flex justify-center">
                <LottiePlayer src="/animations/Computer_Programming.json" className="w-full max-w-md aspect-square" />
              </div>

              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  မြန်ဆန်ပြီး တိကျသော လက်လီငွေရှင်းကောင်တာ
                </h2>
                <p className="text-base text-white/90 leading-relaxed sm:text-lg">
                  လူစည်ကားတဲ့ စတိုးဆိုင်များအတွက် အထူးဒီဇိုင်းဆင်ထားပါတယ်။ ငွေရှင်းဖို့ တန်းစီဖို့မလိုပဲ မရှိစေဘဲ
                  စောင့်ဆိုင်းစနစ် (Holding)
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">မြန်ဆန်စွာ ပေးချေနိုင်မှု</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <WifiOff className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Offline သုံးနိုင်</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Coins className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">အမြတ်ငွေ တိကျမှု</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">ဆိုင်ခွဲများစွာနဲ့ ချိတ်ဆက်နိုင်</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၄။ ကုန်ပစ္စည်းလက်ကျန်နှင့် စာရင်းဇယား (INVENTORY & DISPATCH)
        ========================================================= */}
        <section id="features" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <LottiePlayer src="/animations/Open_Excel_at_Cloud.json" className="w-full mx-auto max-w-xl aspect-square" />

            {/* အဓိက လက်လီအင်္ဂါရပ် ၃ ခု */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E11D48] text-white mb-4">
                  <ScanLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ဘားကုဒ်ဖြင့် အမြန်ငွေရှင်းဖို့</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  USB/Bluetooth ဘားကုဒ်ဖတ်စက် သို့မဟုတ် ဖုန်းကင်မရာလိုအပ်ပါမယ်...
                  ဒါမှ ဘောက်ချာကိုချက်ချင်း ထုတ်နိုင်မှာပါ။
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16A34A] text-white mb-4">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ဝယ်ဈေးနှင့် အမြတ်ငွေတွက်ချက်မှု</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  ဝယ်ဈေးနှင့် ရောင်းဈေးများကို အလိုအလျောက် တွက်ချက်ပေးလို့ ဘောက်ချာတစ်ခုချင်းစီရဲ့
                  အသားတင်အမြတ်ငွေကို အတိအကျ ကြည့်ရှုနိုင်ပါတယ်။
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0284C7] text-white mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ဖောက်သည် အကြွေးစာရင်း</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  အကြွေးရောင်းချမှုများ၊ ပြန်ဆပ်ငွေများနှင့် ဖောက်သည်တစ်ဦးချင်းစီ၏ အကြွေးကျန်စာရင်းများကို
                  စနစ်တကျ မှတ်တမ်းတင် ထိန်းသိမ်းနိုင်သည်။
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၅။ ပရိုအချက်အလက်များနှင့် လုံခြုံရေး (PRO CAPABILITIES)
        ========================================================= */}
        <section
          id="pro-capabilities"
          className="relative overflow-hidden bg-gradient-to-br from-[#9D8AF2] via-[#8572ED] to-[#6E5BE8] py-20 text-white"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-6 flex justify-center">
                <LottiePlayer src="/animations/OTP_Verification.json" className="w-full max-w-md aspect-square" />
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  SMT POS Pro တွင် ပါဝင်လာသော စနစ်သစ်များ
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  ဆိုင်ခွဲရှိသော စတိုးကြီးများအတွက် ပရိုစနစ်များ
                </h2>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md space-y-4 text-xs text-white/90 leading-relaxed">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> ဆိုင်ခွဲများ ကွန်ရက်ချိတ်ဆက်ခြင်း
                    </h4>
                    <p className="mt-1">
                       ဆိုင်ခွဲကုဒ်နှင့် ၄ လုံး PIN ဖြင့် ဆိုင်ခွဲပေါင်းများစွာကို ပင်မအကောင့်တစ်ခုတည်းကနေ တိုက်ရိုက် စီမံခန့်ခွဲနိုင်သည်။
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> အော့ဖ်လိုင်းစနစ်
                    </h4>
                    <p className="mt-1">
                      အင်တာနက်လိုင်းကျချိန်မှာတောင် အရောင်းစာရင်းနဲ့ လုပ်ဆောင်ချက်ကို တိကျအောင် လုပ်ပေးနိုင်သည်။ </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> ဘောက်ချာဒီဇိုင်း
                    </h4>
                    <p className="mt-1">
                      ဆိုင်ရဲ့ ကိုယ်ပိုင် အမှတ်တံဆိပ် Logo၊ ဖုန်းနံပါတ်၊ လိပ်စာနှင့် အောက်ခြေ အမှာစကားများကို စိတ်ကြိုက် ပြင်ဆင်ထည့်သွင်းနိုင်သည်။
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white hover:text-[#5B51D8]"
                >
                  <Link to="/login" search={{ mode: "signup" }}>
                    Pro အစီအစဉ်သို့ အဆင့်မြှင့်တင်ရန်
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၆။ ဖုန်းနှင့် အဓိက အင်္ဂါရပ် ၁၄ ခု (14 RETAIL CAPABILITIES)
        ========================================================= */}
        <section id="capabilities" className="py-20 lg:py-24 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              အဓိက လက်လီလုပ်ဆောင်ချက် ၁၄ ခု
            </h2>
            <p className="mt-2 text-center text-xs text-slate-500 sm:text-sm">
              လက်လီဆိုင်များအတွက် ဖြည့်ဆည်းပေးထားသည့် အရာများ
            </p>

            <div className="mt-14 grid items-center gap-8 lg:grid-cols-12">
              {/* ဘယ်ဘက် Pill ၇ ခု */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <ScanLine className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဘားကုဒ် & QR ငွေရှင်းစနစ်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <WifiOff className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">အင်တာနက်မလို Offline စနစ်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Boxes className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ကုန်နည်းလျှင် သတိပေးချက်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဘူး၊ ဖာ၊ အထုပ် လက်ကားစီမံမှု</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Tag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဘားကုဒ် တံဆိပ်ထုတ်စနစ်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">KBZPay / WavePay ငွေခွဲပြီး ပေးချေစနစ်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဖောက်သည်ရဲ့ အကြွေးစာရင်း</span>
                </div>
              </div>

              {/* အလယ် ဖုန်းမျက်နှာပြင် */}
              <div className="lg:col-span-4 flex justify-center">
                <LottiePlayer src="/animations/phone.json" className="w-full max-w-[300px] aspect-square" />
              </div>

              {/* ညာဘက် Pill ၇ ခု */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဆိုင်ခွဲများ စီမံခန့်ခွဲမှု</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဆိုင်ရှင်က ထိန်းချုပ်သည့် လျှို့ဝှက် PIN</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">အော့ဖ်လိုင်း သိမ်းဆည်းမှု</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဆိုင်သုံးစရိတ် စာရင်းမှတ်ခြင်း</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">နေ့ချုပ်စာရင်း ပရင့်ထုတ်ခြင်း</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">အသားတင်အမြတ်ငွေ အစီရင်ခံစာ</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">စိတ်ကြိုက် ဆိုင် Logo ဘောက်ချာ</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၇။ စျေးနှုန်းနှင့် အစီအစဉ်များ (FREE VS PRO PLANS)
        ========================================================= */}
        <section id="plans" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              သင့်ဆိုင်နှင့် ကိုက်ညီသော အစီအစဉ်ကတော့
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              အခမဲ့ စတင်သုံးစွဲနိုင်ပြီး ပိုလွယ်ကူသည့် စီမံမှုအတွက် Pro အဆင့်ကို မြှင့်တင်သင့်ပါတယ်..
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 max-w-4xl mx-auto text-left">
              {/* အခမဲ့ အစီအစဉ် */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-900 p-6 text-white text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    စတင်သူများအတွက်
                  </span>
                  <div className="text-4xl font-extrabold mt-1">အခမဲ့ (Free)</div>
                  <p className="text-xs text-slate-400 mt-1">ဆိုင်ငယ်တစ်ဆိုင်အတွက် သင့်တော်သည်</p>
                </div>
                <div className="p-6 space-y-3.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">✓ ကုန်ပစ္စည်း ၃၀၀ အထိ သိမ်းဆည်းနိုင်</p>
                  <p className="flex items-center gap-2">✓ အင်တာနက်မလိုဘဲ အော့ဖ်လိုင်း ရောင်းချနိုင်</p>
                  <p className="flex items-center gap-2">✓ ဖောက်သည်နှင့် ကုန်သွင်းသူ ၂၀ ဦး</p>
                  <p className="flex items-center gap-2">✓ အရောင်းကောင်တာ ခြင်းတောင်း ၁ ခု ခေတ္တထိန်းနိုင်</p>
                  <p className="flex items-center gap-2">✓ နေ့စဉ် အရောင်းအကျဉ်းချုပ် အစီရင်ခံစာ</p>
                  <p className="flex items-center gap-2">✓ စံသတ်မှတ်ချက် ဘောက်ချာထုတ်ယူမှု</p>

                  <Button asChild variant="outline" className="w-full mt-6 text-xs font-bold">
                    <Link to="/login" search={{ mode: "signup" }}>
                      အခမဲ့ စတင်အသုံးပြုမည်
                    </Link>
                  </Button>
                </div>
              </div>

              {/* ပရို အစီအစဉ် */}
              <div className="rounded-2xl border-2 border-[#5B51D8] bg-white overflow-hidden shadow-md relative">
                <span className="absolute top-3 right-3 rounded bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-900">
                  အကြံပြုထားသည်
                </span>
                <div className="bg-[#5B51D8] p-6 text-white text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                    ပရို စီးပွားရေးအစီအစဉ်
                  </span>
                  <div className="text-4xl font-extrabold mt-1">Admin အဆင့်မြှင့်တင်ရန်</div>
                  <p className="text-xs text-white/80 mt-1">ဆိုင်ခွဲရှိသော စတိုးကြီးများအတွက်</p>
                </div>
                <div className="p-6 space-y-3.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ ဆိုင်ခွဲများ ကွန်ရက်ချိတ်ဆက်ခြင်း (ဆိုင်ခွဲကုဒ် + PIN)
                  </p>
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ ကုန်ပစ္စည်း အရေအတွက် အကန့်အသတ်မရှိ
                  </p>
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ အော့ဖ်လိုင်း ပစ္စည်းဓာတ်ပုံ သိမ်းဆည်းမှုစနစ်
                  </p>
                  <p className="flex items-center gap-2">✓ ဖောက်သည်နှင့် အကြွေးစာရင်း အကန့်အသတ်မရှိ</p>
                  <p className="flex items-center gap-2">✓ ဆိုင်သုံးစရိတ်နှင့် အသားတင်အမြတ် စာရင်းများ</p>
                  <p className="flex items-center gap-2">✓ နေ့ချုပ်စာရင်း (EOD) ပရင့်ထုတ်ခြင်းနှင့် CSV ထုတ်ယူမှု</p>
                  <p className="flex items-center gap-2">✓ စိတ်ကြိုက် ဆိုင် Logo ပါ ဘောက်ချာဒီဇိုင်း</p>

                  <Button asChild className="w-full mt-6 bg-[#5B51D8] text-white text-xs font-bold hover:bg-[#4D43C4]">
                    <Link to="/settings/plan">
                      ပရိုအချက်အလက် ကြည့်ရှုရန်
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ၈။ ဆက်သွယ်ရန် (CONTACT & SUPPORT)
        ========================================================= */}
        <section id="contact" className="border-t border-slate-200 bg-slate-50/60 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                    ကူညီထောက်ပံ့မှုနှင့် စုံစမ်းရန်
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                    တိုက်ရိုက် ဆက်သွယ်ရန်
                  </h3>
                </div>

                <div className="space-y-5 text-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">ဖုန်း / Telegram / Viber</p>
                      <p className="text-slate-500 mt-0.5">၀၉ ၁၂၃ ၄၅၆ ၇၈၉ (တိုက်ရိုက်လိုင်း)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">အီးမေးလ်</p>
                      <p className="text-slate-500 mt-0.5">support@smtpos.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">ငွေပေးချေမှု နည်းလမ်းများ</p>
                      <p className="text-slate-500 mt-0.5">KBZPay, WavePay, AYA Pay, CB Pay နှင့် ငွေသား</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                  မေးမြန်းရန်
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1 mb-6">
                  သိရှိလိုသည်များကို မေးမြန်းနိုင်ပါသည်
                </h3>

                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">သင့်ဆိုင်အမည်</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="ဥပမာ — ရွှေမန္တလေး မီနီမတ်စ်"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">ဖုန်း သို့မဟုတ် Viber/Telegram</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="၀၉..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">မေးမြန်းလိုသောအကြောင်းအရာ</label>
                    <textarea
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="သိရှိလိုသော အချက်အလက်များကို ရေးသားပေးပါ..."
                    />
                  </div>

                  <Button className="h-10 rounded-lg bg-[#5B51D8] px-6 text-xs font-bold uppercase text-white hover:bg-[#4D43C4]">
                    မက်ဆေ့ခ်ျ ပို့မည်
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          ၉။ စာမျက်နှာ အောက်ခြေ (FOOTER - မူရင်း Logo ပါဝင်သည်)
      ========================================================= */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img src={smtPosLogo} alt="SMT POS" className="h-6 w-6 rounded object-contain" />
            <p>© {new Date().getFullYear()} SMT POS. ခေတ်သစ် လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်။</p>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link to="/login" className="hover:text-slate-900">
              အကောင့်ဝင်ရန်
            </Link>
            <Link to="/register" className="hover:text-slate-900 font-bold text-[#5B51D8]">
              အရောင်းကောင်တာဖွင့်မည်
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
