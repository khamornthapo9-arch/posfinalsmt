import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Barcode,
  Boxes,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Flame,
  Globe,
  Layers,
  LayoutGrid,
  Mail,
  MapPin,
  Maximize2,
  Moon,
  Network,
  Package,
  Phone,
  QrCode,
  Receipt,
  ScanLine,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  TableProperties,
  Tag,
  TrendingUp,
  Tv2,
  UserCheck,
  Users,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import smtPosLogo from "@/assets/smt-pos-logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMT POS — Retail & Restaurant Point of Sale System" },
      {
        name: "description",
        content:
          "Enterprise Point of Sale (POS) system for retail and restaurants. Offline-ready, multi-branch, inventory control, and real-time financial reporting.",
      },
      { property: "og:title", content: "SMT POS — Retail & Restaurant POS System" },
      {
        property: "og:description",
        content: "Enterprise retail & restaurant POS. Offline-first, fast billing, and multi-outlet management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-[#1E202A] antialiased selection:bg-[#5B51D8] selection:text-white">
      {/* =========================================================
          SECTION 1: TOP NAVIGATION BAR
      ========================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Tv2 className="h-6 w-6 text-white stroke-[1.8]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                SMT POS
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[#5B51D8] uppercase mt-0.5">
                Enterprise System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 text-xs font-bold tracking-wider uppercase text-slate-600 md:flex">
            <a href="#hero" className="transition-colors hover:text-[#5B51D8]">
              Home
            </a>
            <a href="#features" className="transition-colors hover:text-[#5B51D8]">
              Features
            </a>
            <a href="#capabilities" className="transition-colors hover:text-[#5B51D8]">
              Capabilities
            </a>
            <a href="#testimonials" className="transition-colors hover:text-[#5B51D8]">
              Testimonials
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#5B51D8]">
              Pricing
            </a>
            <a href="#contact" className="transition-colors hover:text-[#5B51D8]">
              Contact
            </a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="h-10 rounded-lg bg-[#5B51D8] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#4D43C4]"
            >
              <Link to="/login" search={{ mode: "signup" }}>
                Try It Now
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* =========================================================
            SECTION 2: HERO SECTION (Screenshot 1)
        ========================================================= */}
        <section id="hero" className="relative overflow-hidden py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Column: Headline & Action */}
              <div className="lg:col-span-6 space-y-6">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.15]">
                  Restaurant Retail Point of Sale (POS) System
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
                  Built for modern retail and restaurants. Built for you. From instant checkout to
                  inventory, payroll, and multi-outlet control — so you can focus on scaling your business.
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-lg bg-[#5B51D8] px-8 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#4D43C4]"
                  >
                    <Link to="/login" search={{ mode: "signup" }}>
                      Try Now
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Hero Terminal Mockup Placeholder */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                {/* Pastel Ambient Blobs matching Screenshot 1 */}
                <div className="absolute -top-12 -left-8 h-72 w-72 rounded-full bg-[#A898F3]/30 blur-2xl -z-10" />
                <div className="absolute -bottom-8 -right-8 h-80 w-80 rounded-full bg-[#75C6F7]/25 blur-2xl -z-10" />

                {/* Main Desktop/Tablet Hardware Frame Container */}
                <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500" />
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-400 ml-2">Terminal #01</span>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      LIVE SYSTEM
                    </span>
                  </div>

                  {/* Terminal Display Skeleton */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Item Grid Mock */}
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-left"
                        >
                          <div className="h-16 w-full rounded bg-slate-200/70 mb-2 flex items-center justify-center text-[10px] font-mono text-slate-400">
                            [ Product {i} ]
                          </div>
                          <p className="text-xs font-bold text-slate-800">Combo Item {i}</p>
                          <p className="text-[11px] font-bold text-[#5B51D8] mt-0.5">$14.50</p>
                        </div>
                      ))}
                    </div>

                    {/* Receipt Drawer Mock */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex flex-col justify-between text-[11px] font-mono">
                      <div>
                        <p className="font-bold text-slate-700 pb-1 border-b border-slate-200">
                          Active Cart
                        </p>
                        <div className="space-y-1.5 mt-2 text-[10px] text-slate-500">
                          <div className="flex justify-between">
                            <span>Item A (x1)</span>
                            <span>$14.50</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Item B (x2)</span>
                            <span>$12.00</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Total</span>
                          <span className="text-[#5B51D8]">$26.50</span>
                        </div>
                        <div className="mt-2 h-6 rounded bg-[#5B51D8] flex items-center justify-center text-[9px] font-bold text-white uppercase">
                          Pay Now
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 5 Feature Pills with Solid Round Colored Badges (Screenshot 1) */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-sm mb-3">
                  <LayoutGrid className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Easy UI & UX</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-sm mb-3">
                  <Flame className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Kitchen Panel</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-sm mb-3">
                  <UtensilsCrossed className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Waiter Panel</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm mb-3">
                  <Tv2 className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Cashier Panel</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-sm border border-slate-100 text-center transition-transform hover:-translate-y-1 col-span-2 sm:col-span-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm mb-3">
                  <Globe className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Online Order</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 3: CURVED VIOLET GRADIENT BANNER (Screenshot 2)
        ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#9D8AF2] via-[#8572ED] to-[#6E5BE8] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* 5 Top Feature Pills (Screenshot 2) */}
            <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                  <WifiOff className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Offline Order</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white">
                  <TableProperties className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Table Management</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
                  <Boxes className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Full Stock & Purchase</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                  <Network className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Online Stock Outlet Link</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/20 col-span-2 sm:col-span-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white">
                  <Barcode className="h-4 w-4 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">Barcode Generator With Price</span>
              </div>
            </div>

            {/* Split Banner: Left POS Stand Mockup + Right Highlights */}
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left POS Stand Terminal Container */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md rounded-2xl border-4 border-white/30 bg-white p-3 shadow-2xl text-slate-800">
                  <div className="h-64 rounded-xl bg-slate-900 p-4 text-white flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                      <span className="font-bold">VIOLINA RESTAURANT & RETAIL</span>
                      <span className="text-emerald-400 font-mono">STATUS: OPEN</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>Current Cash Drawer:</span>
                        <span className="text-emerald-400 font-bold">$1,450.00</span>
                      </div>
                      <div className="flex justify-between bg-slate-800/80 p-2 rounded">
                        <span>Active Tables:</span>
                        <span className="text-amber-400 font-bold">14 / 20 Occupied</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                      [ Hardware Stand Ready: Thermal Printer & Scanner Connected ]
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content & 4 Pill Cards */}
              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  Get Started Today!
                </h2>
                <p className="text-base text-white/90 leading-relaxed sm:text-lg">
                  Discover how our POS system can transform your restaurant and retail operations.
                </p>

                {/* 4 White Highlight Pills (Screenshot 2) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Sun className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Designed For You</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Moon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Easy to Set Up</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Coins className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Seriously Low Cost</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-900 shadow-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold">Easy to Use</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: ORDERS CAROUSEL & 3 FEATURE CARDS (Screenshot 3)
        ========================================================= */}
        <section id="features" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* Tablet Mockup Frame showing Orders Management */}
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Orders Dispatch
                </span>
                <div className="flex items-center gap-2">
                  <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Order Table Skeleton */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2">Order No</th>
                      <th className="pb-2">Processed By</th>
                      <th className="pb-2">Outlet</th>
                      <th className="pb-2">Time</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 font-bold">#15823</td>
                      <td>Admin Staff</td>
                      <td>Main Branch</td>
                      <td>05:39 PM</td>
                      <td className="text-right font-bold">$14.95</td>
                      <td className="text-center">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          Ready
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">#15901</td>
                      <td>Cashier A</td>
                      <td>Outlet 2</td>
                      <td>05:42 PM</td>
                      <td className="text-right font-bold">$55.00</td>
                      <td className="text-center">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          Kitchen
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold">#15891</td>
                      <td>Waiter B</td>
                      <td>Table #04</td>
                      <td>05:45 PM</td>
                      <td className="text-right font-bold">$38.20</td>
                      <td className="text-center">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3 Clean Bottom Feature Cards (Screenshot 3) */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E11D48] text-white mb-4">
                  <Flame className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Kitchen Panel</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Shows incoming orders in real-time, helping kitchen staff manage and prioritize tasks
                  efficiently.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16A34A] text-white mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Waiter Panel</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  For waitstaff to take orders and manage tables directly, improving service speed and
                  accuracy.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0284C7] text-white mb-4">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cashier Panel</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  To process payments, handle transactions, and manage financial operations quickly and
                  securely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 5: HARDWARE & EMPLOYEE MANAGEMENT (Screenshot 4)
        ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#9D8AF2] via-[#8572ED] to-[#6E5BE8] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Column: Dual Screen Terminal Mockup Container */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="relative w-full max-w-md rounded-2xl border-4 border-white/30 bg-slate-900 p-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400">
                    <span>DUAL-SCREEN POS TERMINAL</span>
                    <span className="text-emerald-400">TOUCH REGISTER</span>
                  </div>
                  <div className="my-6 grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="rounded bg-rose-500/20 p-2 text-rose-300">Kitchen (4)</div>
                    <div className="rounded bg-blue-500/20 p-2 text-blue-300">Dining (8)</div>
                    <div className="rounded bg-amber-500/20 p-2 text-amber-300">Takeout (2)</div>
                    <div className="rounded bg-emerald-500/20 p-2 text-emerald-300">Ready (6)</div>
                  </div>
                  <p className="text-center font-mono text-[11px] text-slate-400">
                    [ Handheld Mobile POS & Thermal Receipt Synchronized ]
                  </p>
                </div>
              </div>

              {/* Right Column: Employee Management Card */}
              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  Perfect POS for Restaurant
                </h2>

                {/* Frosted Employee Management Card (Screenshot 4) */}
                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#6E5BE8] shadow-sm mb-4">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Employee Management</h3>

                  <ul className="mt-4 space-y-3 text-xs text-white/90 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-white font-bold">•</span>
                      <span>
                        <strong>Scheduling:</strong> Enables managers to create and adjust staff
                        schedules and permissions with 4-digit PINs.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white font-bold">•</span>
                      <span>
                        <strong>Time Tracking:</strong> Tracks employee hours and integrates with payroll
                        systems cleanly.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white font-bold">•</span>
                      <span>
                        <strong>Performance Monitoring:</strong> Provides insights into employee sales,
                        accuracy, and productivity.
                      </span>
                    </li>
                  </ul>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white hover:text-[#5B51D8]"
                >
                  <Link to="/login" search={{ mode: "signup" }}>
                    Try Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 6: CENTRAL PHONE & 14 PILLS SHOWCASE (Screenshot 5)
        ========================================================= */}
        <section id="capabilities" className="py-20 lg:py-24 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Available features
            </h2>
            <p className="mt-2 text-center text-xs text-slate-500 sm:text-sm">
              Complete tools built for every department of your business
            </p>

            <div className="mt-14 grid items-center gap-8 lg:grid-cols-12">
              {/* Left Column: 7 Pill Badges */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Sun className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Easy UI & UX</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Moon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Responsive all devices</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Kitchen Panel</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Waiter Panel</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Tv2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Cashier Panel</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Online Order</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <WifiOff className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Offline Order</span>
                </div>
              </div>

              {/* Center Column: Phone Mockup Frame (Screenshot 5) */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="w-full max-w-[280px] rounded-[36px] border-8 border-slate-900 bg-white p-3 shadow-2xl">
                  {/* Phone Notch */}
                  <div className="mx-auto h-4 w-28 rounded-full bg-slate-900 mb-3" />

                  {/* Cashier Mobile Screen UI */}
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between border-b pb-1 text-[10px] text-slate-500">
                      <span>Cashier Panel</span>
                      <span>13:21</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] text-center">
                      <div className="bg-amber-100 text-amber-800 rounded py-1">In Kitchen (0)</div>
                      <div className="bg-emerald-100 text-emerald-800 rounded py-1">
                        Ready to Serve (0)
                      </div>
                      <div className="bg-rose-100 text-rose-800 rounded py-1">Cancelled (0)</div>
                      <div className="bg-blue-100 text-blue-800 rounded py-1 font-bold">
                        Completed (9)
                      </div>
                    </div>

                    {/* Order Item Card 1 */}
                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          #15714
                        </span>
                        <span className="text-emerald-600 font-bold">✓ Completed</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>TABLE: 27.60 Ks</span>
                        <span>05:39 PM</span>
                      </div>
                    </div>

                    {/* Order Item Card 2 */}
                    <div className="rounded-lg border border-slate-200 p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          #354
                        </span>
                        <span className="text-emerald-600 font-bold">✓ Completed</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>TABLE: 113.85 Ks</span>
                        <span>05:25 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 7 Pill Badges */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <TableProperties className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Table Management</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Network className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Online Stock Link With Outlet
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Boxes className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Full Stock & Purchase</span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Barcode className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Barcode Generator With Price
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <QrCode className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Barcode / QR-Code On Invoice
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Tag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Order Notes, Discounts & Customer
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Multi-Branch Outlets</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 7: TESTIMONIALS & PRICING (Screenshot 6)
        ========================================================= */}
        <section id="testimonials" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* Testimonials */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-20 w-20 shrink-0 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                  [ Owner ]
                </div>
                <div>
                  <div className="flex text-amber-400 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs italic text-slate-600 leading-relaxed">
                    "This POS system has transformed how we run our operations. The real-time
                    analytics and inventory management features are game-changers."
                  </p>
                  <p className="mt-3 text-xs font-bold text-slate-900">
                    Shady G. <span className="font-normal text-slate-400">— Restaurant Owner</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-20 w-20 shrink-0 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                  [ Manager ]
                </div>
                <div>
                  <div className="flex text-amber-400 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs italic text-slate-600 leading-relaxed">
                    "Our staff found the system easy to learn and our customers love the quick service.
                    The offline reliability definitely protected our daily revenue."
                  </p>
                  <p className="mt-3 text-xs font-bold text-slate-900">
                    Sarah L. <span className="font-normal text-slate-400">— Cafe Operations</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div id="pricing" className="mt-24 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Pricing Plans
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                There's a plan for you, no matter your size or budget
              </p>

              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                {/* Base Plan */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm text-left">
                  <div className="bg-[#5B51D8] p-6 text-white text-center relative">
                    <span className="text-xs font-bold uppercase tracking-widest">Base</span>
                    <div className="text-4xl font-extrabold mt-1">$70</div>
                  </div>
                  <div className="p-6 space-y-3 text-xs text-slate-600">
                    <p className="flex items-center gap-2">✓ Single Cashier Terminal</p>
                    <p className="flex items-center gap-2">✓ Core Inventory Tracking</p>
                    <p className="flex items-center gap-2">✓ Offline Order Sales</p>
                    <p className="flex items-center gap-2">✓ Daily Sales Summary</p>
                    <Button asChild variant="outline" className="w-full mt-4 text-xs font-bold">
                      <Link to="/login" search={{ mode: "signup" }}>
                        Choose Base
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="rounded-2xl border-2 border-[#5B51D8] bg-white overflow-hidden shadow-md text-left relative">
                  <div className="bg-[#5B51D8] p-6 text-white text-center relative">
                    <span className="text-xs font-bold uppercase tracking-widest">Premium</span>
                    <div className="text-4xl font-extrabold mt-1">$110</div>
                  </div>
                  <div className="p-6 space-y-3 text-xs text-slate-600">
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      ✓ Everything in Base
                    </p>
                    <p className="flex items-center gap-2">✓ Unlimited Inventory Items</p>
                    <p className="flex items-center gap-2">✓ Staff 4-Digit PIN Access</p>
                    <p className="flex items-center gap-2">✓ Custom Thermal Logo Slip</p>
                    <p className="flex items-center gap-2">✓ Item Image Compression</p>
                    <Button asChild className="w-full mt-4 bg-[#5B51D8] text-white text-xs font-bold">
                      <Link to="/login" search={{ mode: "signup" }}>
                        Choose Premium
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Performance Plan */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm text-left">
                  <div className="bg-[#5B51D8] p-6 text-white text-center relative">
                    <span className="text-xs font-bold uppercase tracking-widest">Performance</span>
                    <div className="text-4xl font-extrabold mt-1">$160</div>
                  </div>
                  <div className="p-6 space-y-3 text-xs text-slate-600">
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      ✓ Everything in Premium
                    </p>
                    <p className="flex items-center gap-2">✓ Multi-Branch Outlets Network</p>
                    <p className="flex items-center gap-2">✓ Centralized Multi-Shop Stock</p>
                    <p className="flex items-center gap-2">✓ Full Accounting & Ledger</p>
                    <Button asChild variant="outline" className="w-full mt-4 text-xs font-bold">
                      <Link to="/login" search={{ mode: "signup" }}>
                        Choose Performance
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 8: MAP & CONTACT US (Screenshot 7)
        ========================================================= */}
        <section id="contact" className="border-t border-slate-200 bg-slate-50/60 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            {/* Map Preview Banner (Screenshot 7) */}
            <div className="mb-14 h-48 w-full rounded-2xl border border-slate-200 bg-slate-200 flex items-center justify-center font-mono text-xs text-slate-500">
              <MapPin className="h-5 w-5 text-rose-500 mr-2" />
              [ Interactive Location & Service Area Map ]
            </div>

            <div className="grid gap-12 lg:grid-cols-12">
              {/* Left Column: Contact Information */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                    Information About Us
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Contact Information</h3>
                </div>

                <div className="space-y-5 text-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Phone Number</p>
                      <p className="text-slate-500 mt-0.5">+95 9 123 456 789 / +20 122 223 59425</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Email</p>
                      <p className="text-slate-500 mt-0.5">support@smtpos.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Address</p>
                      <p className="text-slate-500 mt-0.5">Enterprise Business Hub, Commercial Tower</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Inquiry Form */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-[#5B51D8]">
                  Information Questions
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1 mb-6">
                  Contact Us For Any Questions
                </h3>

                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Your name</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Your email</label>
                    <input
                      type="email"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Subject</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="How can we help your business?"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Your message (optional)</label>
                    <textarea
                      rows={4}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#5B51D8] focus:outline-none"
                      placeholder="Tell us about your terminals or store requirements..."
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
          SECTION 9: MINIMAL CLEAN FOOTER
      ========================================================= */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SMT POS. Enterprise Retail & Restaurant System.</p>
          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-slate-900">
              Home
            </a>
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <Link to="/login" className="hover:text-slate-900">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-900 font-bold text-[#5B51D8]">
              Open Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
