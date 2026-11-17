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
      { title: "SMT POS — Modern Retail Point of Sale System" },
      {
        name: "description",
        content:
          "High-speed retail point of sale (POS) system. Barcode scanning, offline-ready sales, multi-branch outlet network, inventory tracking, and net profit ledger.",
      },
      { property: "og:title", content: "SMT POS — Modern Retail Point of Sale System" },
      {
        property: "og:description",
        content: "Offline-first retail POS system with multi-branch synchronization and inventory control.",
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
          1. NAVIGATION BAR (Original Logo Preserved)
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
                Retail Operating System
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-bold tracking-wider uppercase text-slate-600 md:flex">
            <a href="#hero" className="transition-colors hover:text-[#5B51D8]">
              Home
            </a>
            <a href="#features" className="transition-colors hover:text-[#5B51D8]">
              Features
            </a>
            <a href="#pro-capabilities" className="transition-colors hover:text-[#5B51D8]">
              Pro Features
            </a>
            <a href="#plans" className="transition-colors hover:text-[#5B51D8]">
              Plans
            </a>
            <a href="#contact" className="transition-colors hover:text-[#5B51D8]">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-bold">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-lg bg-[#5B51D8] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#4D43C4]"
            >
              <Link to="/login" search={{ mode: "signup" }}>
                Start Free Trial
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* =========================================================
            2. HERO SECTION (100% Retail Focus)
        ========================================================= */}
        <section id="hero" className="relative overflow-hidden py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Column: Headline & Action */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>v1.2 Released: Multi-Branch & Compressed Photo Catalog</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.15]">
                  Modern Retail Point of Sale (POS) System
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
                  Built specifically for retail stores, mini-marts, and wholesale shops. 
                  Barcode checkout in seconds, real-time inventory alerts, customer credit ledgers, 
                  and multi-branch management — fully operational even without internet.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-lg bg-[#5B51D8] px-8 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#4D43C4]"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      Get Started Free
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-lg border-slate-200 px-8 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                  >
                    <Link to="/register">Open Demo Register</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Realistic Retail Terminal Mockup Frame */}
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
                      <span className="text-xs font-bold text-slate-700 ml-2">SMT Cashier Register #01</span>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 font-mono">
                      OFFLINE READY
                    </span>
                  </div>

                  {/* Retail Product Grid & Cart Preview */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ Item Photo ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Nescafe 3-in-1 (Pack)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">8,000 Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ Item Photo ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Cooking Oil 1L</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">14,500 Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ Item Photo ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Royal Milk Tea (Pack)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">6,500 Ks</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="h-14 w-full rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          [ Item Photo ]
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">Premier Coffee (Box)</p>
                        <p className="text-[11px] font-bold text-[#5B51D8]">12,000 Ks</p>
                      </div>
                    </div>

                    {/* Active Cart & Checkout */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex flex-col justify-between text-[11px] font-mono">
                      <div>
                        <p className="font-bold text-slate-800 pb-1 border-b border-slate-200">
                          Active Bill (3 Items)
                        </p>
                        <div className="space-y-1.5 mt-2 text-[10px] text-slate-600">
                          <div className="flex justify-between">
                            <span>Nescafe (x2)</span>
                            <span>16,000 Ks</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Oil 1L (x1)</span>
                            <span>14,500 Ks</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Milk Tea (x1)</span>
                            <span>6,500 Ks</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Total</span>
                          <span className="text-[#5B51D8]">37,000 Ks</span>
                        </div>
                        <div className="mt-2 h-7 rounded bg-[#5B51D8] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                          Cash / KPay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 5 Retail Feature Pills */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-sm mb-3">
                  <ScanLine className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Rapid Barcode POS</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-sm mb-3">
                  <WifiOff className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">100% Offline Mode</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-sm mb-3">
                  <Boxes className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Stock & Alerts</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm mb-3">
                  <Building2 className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Multi-Branch Outlets</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1 col-span-2 sm:col-span-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm mb-3">
                  <Receipt className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Credit & Debt Ledger</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. RETAIL OPERATIONS BANNER (Curved Gradient)
        ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#9D8AF2] via-[#8572ED] to-[#6E5BE8] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* Top 5 Retail Operations Pills */}
            <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                  <Barcode className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Price Barcode Labels</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white">
                  <Package className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Multi-Unit Packaging</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
                  <TrendingUp className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Net Profit Calculation</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                  <Network className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Instant Outlet Sync</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20 col-span-2 sm:col-span-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Excel & CSV Exports</span>
              </div>
            </div>

            {/* Split Banner */}
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md rounded-2xl border-4 border-white/30 bg-white p-3 shadow-2xl text-slate-800">
                  <div className="h-64 rounded-xl bg-slate-900 p-4 text-white flex flex-col justify-between font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold">SMT RETAIL MAIN STORE</span>
                      <span className="text-emerald-400">ONLINE SYNC</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>Today Gross Sales:</span>
                        <span className="text-emerald-400 font-bold">1,842,000 Ks</span>
                      </div>
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>Net Profit:</span>
                        <span className="text-blue-400 font-bold">+385,000 Ks</span>
                      </div>
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>Low Stock Items:</span>
                        <span className="text-rose-400 font-bold">3 Items Need Restock</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                      [ Thermal Receipt & Barcode Scanner Linked ]
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  Built for Fast Retail Checkouts
                </h2>
                <p className="text-base text-white/90 leading-relaxed sm:text-lg">
                  Designed from the ground up for high-traffic retail counters. Keep lines moving, 
                  prevent stock loss, and track accurate daily profits in real-time.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Zero Checkout Latency</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <WifiOff className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Works Without Internet</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Coins className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Precise Margin Tracking</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Multi-Outlet Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. INVENTORY & DISPATCH SECTION (Screenshot 3)
        ========================================================= */}
        <section id="features" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Stock & Sales Stream
                </span>
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  Total Items: 1,240 SKUs
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2">SKU / Item</th>
                      <th className="pb-2">Buy Price</th>
                      <th className="pb-2">Sell Price</th>
                      <th className="pb-2 text-center">In Stock</th>
                      <th className="pb-2 text-right">Unit Profit</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 font-bold">SKU-1042 · Nescafe Pack</td>
                      <td>6,200 Ks</td>
                      <td className="font-bold">8,000 Ks</td>
                      <td className="text-center font-bold">142 Packs</td>
                      <td className="text-right text-emerald-600 font-bold">+1,800 Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          In Stock
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">SKU-2091 · Cooking Oil 1L</td>
                      <td>12,500 Ks</td>
                      <td className="font-bold">14,500 Ks</td>
                      <td className="text-center font-bold text-amber-600">4 Left</td>
                      <td className="text-right text-emerald-600 font-bold">+2,000 Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">SKU-3112 · Premier Coffee Box</td>
                      <td>9,800 Ks</td>
                      <td className="font-bold">12,000 Ks</td>
                      <td className="text-center font-bold">65 Boxes</td>
                      <td className="text-right text-emerald-600 font-bold">+2,200 Ks</td>
                      <td className="text-center">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          In Stock
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3 Retail Pillars */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E11D48] text-white mb-4">
                  <ScanLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Instant Barcode Billing</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Scan items with external USB/Bluetooth scanners or mobile camera. Instant price lookup
                  and receipt printing with zero delay.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16A34A] text-white mb-4">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cost & Margin Tracking</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Track Buy Prices vs Sell Prices automatically. Know your exact net profit margin on
                  every receipt without manual bookkeeping.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0284C7] text-white mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Customer Credit & Debt</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Manage credit sales, record partial repayments, and keep complete ledger histories
                  for regular wholesale and retail clients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. PRO FACTS & WHAT'S NEW SHOWCASE (Screenshot 4)
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
                    <span>SECURITY & ACCESS CONTROL</span>
                    <span className="text-emerald-400">4-DIGIT PIN</span>
                  </div>
                  <div className="my-6 space-y-2.5">
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>Refund Authorisation</span>
                      <span className="text-rose-400 font-bold">Manager PIN Required</span>
                    </div>
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>Custom Price Discount</span>
                      <span className="text-amber-400 font-bold">Protected Action</span>
                    </div>
                    <div className="rounded bg-slate-800 p-3 flex justify-between items-center">
                      <span>Branch Terminal Login</span>
                      <span className="text-emerald-400 font-bold">Branch Code + PIN</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-400">
                    [ Prevents Unauthorized Cashier Overrides & Leaks ]
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  <Sparkles className="h-3.5 w-3.5" /> What's New in SMT POS Pro
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  Enterprise Tools for Multi-Shop Owners
                </h2>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md space-y-4 text-xs text-white/90 leading-relaxed">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Multi-Branch Outlets Network
                    </h4>
                    <p className="mt-1">
                      No need to create separate email accounts. Generate a direct Branch Code and 4-digit PIN for each shop. Cashiers sign in instantly.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Offline Compressed Photo Catalog
                    </h4>
                    <p className="mt-1">
                      Uploaded product photos are compressed to ~150KB and cached directly in device storage (IndexedDB). Photos remain visible even without internet.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Custom Receipt Branding & Thermal Logo
                    </h4>
                    <p className="mt-1">
                      Add your store logo, phone number, Facebook page, and custom thank-you notes to your thermal printed bills.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white hover:text-[#5B51D8]"
                >
                  <Link to="/login" search={{ mode: "signup" }}>
                    Upgrade to Pro Plan
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. CENTRAL PHONE & 14 RETAIL CAPABILITY PILLS (Screenshot 5)
        ========================================================= */}
        <section id="capabilities" className="py-20 lg:py-24 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              14 Retail Capabilities
            </h2>
            <p className="mt-2 text-center text-xs text-slate-500 sm:text-sm">
              Complete tools built specifically for modern retail operations
            </p>

            <div className="mt-14 grid items-center gap-8 lg:grid-cols-12">
              {/* Left 7 Pills */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <ScanLine className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Barcode & QR Code POS</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <WifiOff className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">100% Offline-Resilient</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Boxes className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Low-Stock Instant Alerts</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Wholesale Multi-Unit Pack</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Tag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Barcode Label Generator</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">KBZPay / WavePay QR Bills</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Customer Credit Ledger</span>
                </div>
              </div>

              {/* Center Mobile Screen */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="w-full max-w-[280px] rounded-[36px] border-8 border-slate-900 bg-white p-3 shadow-2xl">
                  <div className="mx-auto h-4 w-28 rounded-full bg-slate-900 mb-3" />
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between border-b pb-1 text-[10px] text-slate-500">
                      <span>Retail Cashier Mobile</span>
                      <span>13:21</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] text-center">
                      <div className="bg-emerald-100 text-emerald-800 rounded py-1 font-bold">
                        Today Bills: 48
                      </div>
                      <div className="bg-blue-100 text-blue-800 rounded py-1 font-bold">
                        Sales: 1.2M Ks
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          #1084
                        </span>
                        <span className="text-emerald-600 font-bold">✓ Paid (KBZPay)</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Items: 3</span>
                        <span className="font-bold text-slate-900">29,000 Ks</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-amber-600 text-white px-1.5 py-0.2 rounded">
                          #1083
                        </span>
                        <span className="text-amber-600 font-bold">Credit (U Kyaw)</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Items: 5</span>
                        <span className="font-bold text-slate-900">45,000 Ks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 7 Pills */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Multi-Branch Outlets</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Manager 4-Digit Security PIN</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Auto-Compressed Photo Catalog</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Operating Expenses Tracking</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">EOD Printable Day-End Close</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Real-Time Net Profit Reports</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Custom Thermal Receipt Logo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            7. SMT POS PLANS (FREE VS PRO)
        ========================================================= */}
        <section id="plans" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Transparent Retail Plans
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Start with our Free Starter plan, upgrade to Pro when your business expands
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 max-w-4xl mx-auto text-left">
              {/* Free Plan */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-900 p-6 text-white text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Starter
                  </span>
                  <div className="text-4xl font-extrabold mt-1">Free</div>
                  <p className="text-xs text-slate-400 mt-1">For single-terminal retail shops</p>
                </div>
                <div className="p-6 space-y-3.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">✓ Up to 300 Inventory Products</p>
                  <p className="flex items-center gap-2">✓ Full Offline Register & Barcode POS</p>
                  <p className="flex items-center gap-2">✓ Up to 20 Customers & Suppliers</p>
                  <p className="flex items-center gap-2">✓ 1 Held Cart at Cashier</p>
                  <p className="flex items-center gap-2">✓ Daily Sales Summary Report</p>
                  <p className="flex items-center gap-2">✓ Standard Thermal Bill Printing</p>

                  <Button asChild variant="outline" className="w-full mt-6 text-xs font-bold">
                    <Link to="/login" search={{ mode: "signup" }}>
                      Get Started Free
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="rounded-2xl border-2 border-[#5B51D8] bg-white overflow-hidden shadow-md relative">
                <span className="absolute top-3 right-3 rounded bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-900">
                  Recommended
                </span>
                <div className="bg-[#5B51D8] p-6 text-white text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                    Pro Business
                  </span>
                  <div className="text-4xl font-extrabold mt-1">Admin Activated</div>
                  <p className="text-xs text-white/80 mt-1">For growing multi-outlet businesses</p>
                </div>
                <div className="p-6 space-y-3.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ Multi-Branch Outlets Network (Branch Code + PIN)
                  </p>
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ Unlimited Inventory Products & Stock
                  </p>
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    ✓ Offline Compressed Product Photo Catalog
                  </p>
                  <p className="flex items-center gap-2">✓ Unlimited Customer Debt & Credit Records</p>
                  <p className="flex items-center gap-2">✓ Operating Expenses & Net Profit Analytics</p>
                  <p className="flex items-center gap-2">✓ Printable Day-End (EOD) & Master CSV Export</p>
                  <p className="flex items-center gap-2">✓ Custom Store Logo on Thermal Receipts</p>

                  <Button asChild className="w-full mt-6 bg-[#5B51D8] text-white text-xs font-bold hover:bg-[#4D43C4]">
                    <Link to="/settings/plan">
                      View Pro Activation
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            8. CONTACT & SUPPORT SECTION (Screenshot 7)
        ========================================================= */}
        <section id="contact" className="border-t border-slate-200 bg-slate-50/60 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                    Support & Onboarding
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                    Direct Contact Information
                  </h3>
                </div>

                <div className="space-y-5 text-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Phone & Telegram / Viber</p>
                      <p className="text-slate-500 mt-0.5">+95 9 123 456 789 (Direct Hotline)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Email Support</p>
                      <p className="text-slate-500 mt-0.5">support@smtpos.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Supported Digital Payments</p>
                      <p className="text-slate-500 mt-0.5">KBZPay, WavePay, AYA Pay, CB Pay & Cash</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                  Inquiry
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1 mb-6">
                  Have Questions or Need Pro Activation?
                </h3>

                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Your store name</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="e.g. Shwe Mandalay Mini Mart"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Phone or Telegram / Viber</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="09..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Your message</label>
                    <textarea
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="Tell us what you'd like to ask..."
                    />
                  </div>

                  <Button className="h-10 rounded-lg bg-[#5B51D8] px-6 text-xs font-bold uppercase text-white hover:bg-[#4D43C4]">
                    Send Message
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          9. CLEAN FOOTER (Original Logo Preserved)
      ========================================================= */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img src={smtPosLogo} alt="SMT POS" className="h-6 w-6 rounded object-contain" />
            <p>© {new Date().getFullYear()} SMT POS. Modern Retail Operating System.</p>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link to="/login" className="hover:text-slate-900">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-900 font-bold text-[#5B51D8]">
              Cashier Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
