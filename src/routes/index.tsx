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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMT POS — ခေတ်သစ် လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်" },
      {
        name: "description",
        content:
          "အင်တာနက်မရှိလည်း အပြည့်အဝရောင်းချနိုင်သော လက်လီ POS စနစ်။ ဘားကုဒ်စကင်၊ ကုန်ပစ္စည်းလက်ကျန်၊ ဆိုင်ခွဲများချိတ်ဆက်မှုနှင့် နေ့စဉ်အသားတင်အမြတ်စာရင်း။",
      },
      { property: "og:title", content: "SMT POS — ခေတ်သစ် လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှုစနစ်" },
      {
        property: "og:description",
        content: "အော့ဖ်လိုင်းရောင်းချနိုင်သော လက်လီ POS၊ ဆိုင်ခွဲစနစ်၊ ပစ္စည်းဓာတ်ပုံနှင့် အမြတ်စာရင်းစနစ်။",
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
                လက်လီစတိုး အရောင်းနှင့် စာရင်းစနစ်
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
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ဗားရှင်း ၁.၂ ထွက်ရှိပါပြီ — ဆိုင်ခွဲစနစ်နှင့် ပစ္စည်းဓာတ်ပုံများ ပါဝင်လာပါပြီ</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.15]">
                  ခေတ်သစ် လက်လီအရောင်းနှင့် စတိုးစီမံခန့်ခွဲမှု စနစ်
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
                  စတိုးဆိုင်၊ မီနီမတ်စ်နှင့် လက်လီလက်ကား ဆိုင်များအတွက် အထူးပြုလုပ်ထားပါသည်။
                  ဘားကုဒ်ဖတ်ပြီး စက္ကန့်ပိုင်းအတွင်း ငွေရှင်းခြင်း၊ လက်ကျန်စာရင်း၊ အကြွေးစာရင်းနှင့်
                  ဆိုင်ခွဲများချိတ်ဆက်မှု — အင်တာနက်လိုင်းမရှိလည်း အပြည့်အဝ ဆက်လက်ရောင်းချနိုင်ပါသည်။
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
                    <Link to="/register">အရောင်းကောင်တာ စမ်းသပ်ရန်</Link>
                  </Button>
                </div>
              </div>

              {/* ညာဘက်ကော်လံ: အရောင်းစက် Mockup ပြသမှု */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                <div className="absolute -top-12 -left-8 h-72 w-72 rounded-full bg-[#A898F3]/30 blur-2xl -z-10" />
                <div className="absolute -bottom-8 -right-8 h-80 w-80 rounded-full bg-[#75C6F7]/25 blur-2xl -z-10" />

                <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl">
                  {/* Register Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500" />
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700 ml-2">SMT အရောင်းကောင်တာ #၀၁</span>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 font-mono">
                      အော့ဖ်လိုင်း သုံးနိုင်သည်
                    </span>
                  </div>

                  {/* ပစ္စည်းများ ရောင်းချမှု ပုံစံ */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ ပစ္စည်းဓာတ်ပုံ ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Nescafe 3-in-1 (၁ ထုပ်)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">၈,၀၀၀ Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ ပစ္စည်းဓာတ်ပုံ ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">ဆီသန့် ၁ လီတာ</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">၁၄,၅၀၀ Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ ပစ္စည်းဓာတ်ပုံ ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Royal Milk Tea (၁ ထုပ်)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">၆,၅၀၀ Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ ပစ္စည်းဓာတ်ပုံ ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Premier ကော်ဖီ (၁ ဖာ)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">၁၂,၀၀၀ Ks</p>
                      </div>
                    </div>

                    {/* လက်ရှိခြင်းတောင်းနှင့် ငွေရှင်းမှု */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex flex-col justify-between text-[11px] font-mono">
                      <div>
                        <p className="font-bold text-slate-800 pb-1 border-b border-slate-200">
                          ခြင်းတောင်း (၃ မျိုး)
                        </p>
                        <div className="space-y-1.5 mt-2 text-[10px] text-slate-600">
                          <div className="flex justify-between">
                            <span>Nescafe (x၂)</span>
                            <span>၁၆,၀၀၀ Ks</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ဆီသန့် ၁L (x၁)</span>
                            <span>၁၄,၅၀၀ Ks</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Milk Tea (x၁)</span>
                            <span>၆,၅၀၀ Ks</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>စုစုပေါင်း</span>
                          <span className="text-[#5B51D8]">၃၇,၀၀၀ Ks</span>
                        </div>
                        <div className="mt-2 h-7 rounded bg-[#5B51D8] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                          ငွေသား / KPay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* အောက်ခြေ အဓိက လက်လီလုပ်ဆောင်ချက် ၅ ခု */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-sm mb-3">
                  <ScanLine className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">ဘားကုဒ်ဖတ် ငွေရှင်းစနစ်</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-sm mb-3">
                  <WifiOff className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">အင်တာနက်မလို Offline မုဒ်</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-sm mb-3">
                  <Boxes className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">လက်ကျန်နှင့် သတိပေးချက်</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm mb-3">
                  <Building2 className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">ဆိုင်ခွဲများ စီမံခန့်ခွဲမှု</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1 col-span-2 sm:col-span-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm mb-3">
                  <Receipt className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">အကြွေးဝယ်/အကြွေးရောင်း စာရင်း</span>
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
                <span className="text-xs font-bold">ဘားကုဒ်ဈေးနှုန်းတံဆိပ် ထုတ်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white">
                  <Package className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">ဘူး၊ ဖာ၊ အထုပ် လက်ကားစီမံမှု</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
                  <TrendingUp className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">အသားတင်အမြတ်ငွေ တွက်ချက်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                  <Network className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">ဆိုင်ခွဲများ အချိန်နှင့်တစ်ပြေးညီ စင့်ခ်လုပ်ခြင်း</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20 col-span-2 sm:col-span-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Excel & CSV ဇယားထုတ်ယူနိုင်ခြင်း</span>
              </div>
            </div>

            {/* Split Banner */}
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md rounded-2xl border-4 border-white/30 bg-white p-3 shadow-2xl text-slate-800">
                  <div className="h-64 rounded-xl bg-slate-900 p-4 text-white flex flex-col justify-between font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold">SMT စတိုး ပင်မဆိုင်</span>
                      <span className="text-emerald-400">အွန်လိုင်း စင့်ခ်လုပ်ပြီး</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>ယနေ့ စုစုပေါင်းရောင်းရငွေ:</span>
                        <span className="text-emerald-400 font-bold">၁,၈၄၂,၀၀၀ Ks</span>
                      </div>
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>အသားတင်အမြတ်:</span>
                        <span className="text-blue-400 font-bold">+၃၈၅,၀၀၀ Ks</span>
                      </div>
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>ကုန်နည်းနေသောပစ္စည်း:</span>
                        <span className="text-rose-400 font-bold">၃ မျိုး ထပ်ဖြည့်ရန်လိုသည်</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                      [ ဘောက်ချာပရင်တာနှင့် ဘားကုဒ်ဖတ်စက် ချိတ်ဆက်ပြီး ]
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  မြန်ဆန်တိကျသော လက်လီငွေရှင်းကောင်တာ
                </h2>
                <p className="text-base text-white/90 leading-relaxed sm:text-lg">
                  လူစည်ကားသော စတိုးဆိုင်များအတွက် အထူးဒီဇိုင်းဆင်ထားပါသည်။ လူတန်းစီစောင့်ဆိုင်းချိန် မရှိစေဘဲ
                  ပစ္စည်းမပျောက်ရှစေရန်နှင့် နေ့စဉ်အမြတ်စာရင်းများကို တိကျစွာ သိရှိနိုင်ပါသည်။
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">စက္ကန့်ပိုင်းအတွင်း ငွေရှင်းနိုင်</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <WifiOff className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">အင်တာနက်မရှိလည်း သုံးနိုင်</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Coins className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">အမြတ်ငွေ အတိအကျသိရှိနိုင်</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">ဆိုင်ခွဲပေါင်းများစွာ ချိတ်ဆက်နိုင်</span>
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
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  လက်ကျန်စာရင်းနှင့် အမြတ်ငွေ တိုက်ရိုက်ကြည့်ရှုမှု
                </span>
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  စုစုပေါင်းပစ္စည်း: ၁,၂၄၀ မျိုး
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2">ကုဒ် / ပစ္စည်းအမည်</th>
                      <th className="pb-2">ဝယ်ဈေး</th>
                      <th className="pb-2">ရောင်းဈေး</th>
                      <th className="pb-2 text-center">လက်ကျန်</th>
                      <th className="pb-2 text-right">အမြတ်</th>
                      <th className="pb-2 text-center">အခြေအနေ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 font-bold">SKU-1042 · Nescafe ကော်ဖီထုပ်</td>
                      <td>၆,၂၀၀ Ks</td>
                      <td className="font-bold">၈,၀၀၀ Ks</td>
                      <td className="text-center font-bold">၁၄၂ ထုပ်</td>
                      <td className="text-right text-emerald-600 font-bold">+၁,၈၀၀ Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          ပစ္စည်းရှိသည်
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">SKU-2091 · ဆီသန့် ၁ လီတာ</td>
                      <td>၁၂,၅၀၀ Ks</td>
                      <td className="font-bold">၁၄,၅၀၀ Ks</td>
                      <td className="text-center font-bold text-amber-600">၄ ဘူးကျန်</td>
                      <td className="text-right text-emerald-600 font-bold">+၂,၀၀၀ Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          ပစ္စည်းနည်းနေသည်
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">SKU-3112 · Premier ကော်ဖီဖာ</td>
                      <td>၉,၈၀၀ Ks</td>
                      <td className="font-bold">၁၂,၀၀၀ Ks</td>
                      <td className="text-center font-bold">၆၅ ဖာ</td>
                      <td className="text-right text-emerald-600 font-bold">+၂,၂၀၀ Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          ပစ္စည်းရှိသည်
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* အဓိက လက်လီအင်္ဂါရပ် ၃ ခု */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E11D48] text-white mb-4">
                  <ScanLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ဘားကုဒ်ဖြင့် အမြန်ငွေရှင်းစနစ်</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  USB/Bluetooth ဘားကုဒ်ဖတ်စက် သို့မဟုတ် ဖုန်းကင်မရာဖြင့် ပစ္စည်းထည့်သွင်းပါ။
                  ဈေးနှုန်းချက်ချင်းတက်လာပြီး ဘောက်ချာချက်ချင်း ထုတ်နိုင်သည်။
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16A34A] text-white mb-4">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ဝယ်ဈေးနှင့် အမြတ်ငွေတွက်ချက်မှု</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  ဝယ်ဈေးနှင့် ရောင်းဈေးများကို အလိုအလျောက် တွက်ချက်ပေးကာ ဘောက်ချာတစ်ခုချင်းစီ၏
                  အသားတင်အမြတ်ငွေကို အတိအကျ ကြည့်ရှုနိုင်သည်။
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
                <div className="relative w-full max-w-md rounded-2xl border-4 border-white/30 bg-slate-900 p-4 shadow-2xl font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                    <span>လုံခြုံရေးနှင့် PIN စနစ်</span>
                    <span className="text-emerald-400">၄ လုံး PIN</span>
                  </div>
                  <div className="my-6 space-y-2.5">
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>ပြန်အမ်းငွေ ထုတ်ပေးခြင်း</span>
                      <span className="text-rose-400 font-bold">မန်နေဂျာ PIN လိုအပ်</span>
                    </div>
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>အထူးလျှော့ဈေးပေးခြင်း</span>
                      <span className="text-amber-400 font-bold">ခွင့်ပြုချက် လိုအပ်</span>
                    </div>
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>ဆိုင်ခွဲအကောင့် ဝင်ရောက်ခြင်း</span>
                      <span className="text-emerald-400 font-bold">ဆိုင်ခွဲကုဒ် + PIN</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-400">
                    [ ငွေကြေးနှင့် စာရင်းများ လုံခြုံစေရန် စနစ်တကျ ကာကွယ်ထားသည် ]
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  <Sparkles className="h-3.5 w-3.5" /> SMT POS Pro တွင် ပါဝင်လာသော စနစ်သစ်များ
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
                      အီးမေးလ်အသစ် ဖွင့်စရာမလိုဘဲ ဆိုင်ခွဲကုဒ်နှင့် ၄ လုံး PIN ဖြင့် ဆိုင်ခွဲပေါင်းများစွာကို ပင်မအကောင့်တစ်ခုတည်းမှ တိုက်ရိုက် စီမံခန့်ခွဲနိုင်သည်။
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> အော့ဖ်လိုင်း ပစ္စည်းဓာတ်ပုံစနစ်
                    </h4>
                    <p className="mt-1">
                      တင်ထားသော ဓာတ်ပုံများကို ဖုန်းနှင့် ကွန်ပျူတာအတွင်း (IndexedDB) တွင် အလိုအလျောက် သေးငယ်အောင် ချုံ့သိမ်းပေးပြီး အင်တာနက်မရှိချိန်တွင်ပါ ပုံများ မပျောက်ဘဲ ရောင်းချနိုင်သည်။
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> ကိုယ်ပိုင် Logo ပါဝင်သော ဘောက်ချာဒီဇိုင်း
                    </h4>
                    <p className="mt-1">
                      ဆိုင်၏ ကိုယ်ပိုင် အမှတ်တံဆိပ် Logo၊ ဖုန်းနံပါတ်၊ လိပ်စာနှင့် အောက်ခြေ အမှာစကားများကို စိတ်ကြိုက် ပြင်ဆင်ထည့်သွင်းနိုင်သည်။
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
              ခေတ်သစ် လက်လီဆိုင်များအတွက် လိုအပ်သော ကိရိယာအားလုံး တစ်နေရာတည်းတွင်
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
                  <span className="text-xs font-bold text-slate-800">ကုန်နည်း အချက်ပေးသတိပေးချက်</span>
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
                  <span className="text-xs font-bold text-slate-800">KBZPay / WavePay QR ငွေချေစနစ်</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">ဖောက်သည် အကြွေးစာရင်း</span>
                </div>
              </div>

              {/* အလယ် ဖုန်းမျက်နှာပြင် */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="w-full max-w-[280px] rounded-[36px] border-8 border-slate-900 bg-white p-3 shadow-2xl">
                  <div className="mx-auto h-4 w-28 rounded-full bg-slate-900 mb-3" />
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between border-b pb-1 text-[10px] text-slate-500">
                      <span>လက်လီ အရောင်းကောင်တာ</span>
                      <span>13:21</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] text-center">
                      <div className="bg-emerald-100 text-emerald-800 rounded py-1 font-bold">
                        ယနေ့ဘောက်ချာ: ၄၈
                      </div>
                      <div className="bg-blue-100 text-blue-800 rounded py-1 font-bold">
                        ရောင်းအား: ၁.၂M Ks
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          #၁၀၈၄
                        </span>
                        <span className="text-emerald-600 font-bold">✓ ရှင်းပြီး (KBZPay)</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>ပစ္စည်း: ၃ မျိုး</span>
                        <span className="font-bold text-slate-900">၂၉,၀၀၀ Ks</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-amber-600 text-white px-1.5 py-0.2 rounded">
                          #၁၀၈၃
                        </span>
                        <span className="text-amber-600 font-bold">အကြွေး (ဦးကျော်)</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>ပစ္စည်း: ၅ မျိုး</span>
                        <span className="font-bold text-slate-900">၄၅,၀၀၀ Ks</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                  <span className="text-xs font-bold text-slate-800">မန်နေဂျာ ၄ လုံး လျှို့ဝှက် PIN</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">အော့ဖ်လိုင်း ဓာတ်ပုံသိမ်းဆည်းမှု</span>
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
              သင့်ဆိုင်နှင့် ကိုက်ညီသော အစီအစဉ်များ
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              အခမဲ့ စတင်သုံးစွဲနိုင်ပြီး ဆိုင်ခွဲများ တိုးချဲ့လိုပါက Pro သို့ အဆင့်မြှင့်တင်နိုင်ပါသည်
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
