import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  CloudOff,
  Receipt,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Users,
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
          "အင်တာနက်မရှိလည်း ရောင်းချနိုင်သော POS စနစ်။ ဘားကုဒ်စကင်၊ ကုန်ပစ္စည်းစီမံခန့်ခွဲမှု၊ အရောင်းစာရင်းနှင့် အမြတ်တွက်ချက်မှုများ တစ်နေရာတည်းတွင်။",
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

const FEATURES = [
  {
    icon: ScanLine,
    title: "မြန်ဆန်သော ရောင်းချမှု",
    body: "ဘားကုဒ် စကင်ဖတ်ပြီး စက္ကန့်ပိုင်းအတွင်း ငွေရှင်းပါ။ ဘောက်ချာ ချက်ချင်း ထုတ်နိုင်သည်။",
  },
  {
    icon: CloudOff,
    title: "အင်တာနက် မရှိလည်း အလုပ်လုပ်",
    body: "လိုင်းပြတ်နေချိန်တွင်လည်း ဆက်ရောင်းနိုင်ပြီး လိုင်းပြန်ရလျှင် အလိုအလျောက် စင့်ခ်လုပ်ပေးသည်။",
  },
  {
    icon: Boxes,
    title: "ကုန်ပစ္စည်း စီမံခန့်ခွဲမှု",
    body: "လက်ကျန်စာရင်း၊ ဝယ်ဈေး/ရောင်းဈေး၊ ကုန်နည်းသတိပေးချက်များကို တစ်နေရာတည်းမှ ကြည့်ရှုပါ။",
  },
  {
    icon: BarChart3,
    title: "အမြတ်နှင့် ဆန်းစစ်ချက်",
    body: "နေ့စဉ်ရောင်းအား၊ ကုန်ကျစရိတ်၊ အသားတင်အမြတ်နှင့် ငွေပေးချေမှုအမျိုးအစား ခွဲခြမ်းစိတ်ဖြာချက်။",
  },
  {
    icon: Users,
    title: "ဖောက်သည် နှင့် အကြွေးစာရင်း",
    body: "အကြွေးရောင်းချမှုများ၊ ပြန်ဆပ်မှုများနှင့် ဖောက်သည်မှတ်တမ်းများကို စနစ်တကျ ထိန်းသိမ်းပါ။",
  },
  {
    icon: ShieldCheck,
    title: "ဝန်ထမ်း လုပ်ပိုင်ခွင့်",
    body: "ပိုင်ရှင်၊ မန်နေဂျာ၊ ကက်ရှီယာ အဆင့်အလိုက် PIN ဖြင့် ပြောင်းလဲအသုံးပြုနိုင်သည်။",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src={smtPosLogo} alt="SMT POS" className="h-9 w-9 rounded-md object-contain" />
            <span className="text-base font-semibold tracking-tight">SMT POS</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="min-h-10">
              <Link to="/login">အကောင့်ဝင်ရန်</Link>
            </Button>
            <Button asChild className="min-h-10">
              <Link to="/login" search={{ mode: "signup" }}>
                အခမဲ့ စတင်ရန်
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> ဖုန်း၊ တက်ဘလက်နှင့် ကွန်ပျူတာတွင် အသုံးပြုနိုင်
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              မြန်မာဆိုင်များအတွက် အလွယ်ကူဆုံး POS စနစ်
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              ရောင်းချမှု၊ ကုန်ပစ္စည်း၊ ဖောက်သည်အကြွေးနှင့် အမြတ်စာရင်းများကို တစ်နေရာတည်းမှ စီမံပါ။
              အင်တာနက်မရှိလည်း ဆက်လက် ရောင်းချနိုင်ပါသည်။
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="min-h-12 px-6">
                <Link to="/login" search={{ mode: "signup" }}>
                  အခမဲ့ အကောင့်ဖွင့်ရန်
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 px-6">
                <Link to="/login">အကောင့်ဝင်ရန်</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              ဆိုင်တစ်ဆိုင်အတွက် လိုအပ်သမျှ အားလုံး
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <Receipt className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              ယနေ့ပင် သင့်ဆိုင်ကို စတင်လိုက်ပါ
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              အီးမေးလ်ဖြင့် အကောင့်ဖွင့်ပြီး မိနစ်ပိုင်းအတွင်း ရောင်းချမှု စတင်နိုင်ပါသည်။
            </p>
            <Button asChild size="lg" className="mt-6 min-h-12 px-6">
              <Link to="/login" search={{ mode: "signup" }}>
                အခမဲ့ စတင်ရန်
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SMT POS. မြန်မာဆိုင်များအတွက် ဖန်တီးထားသည်။
        </p>
      </footer>
    </div>
  );
}
