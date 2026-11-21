import { LottiePlayer } from "@/components/landing/lottie-player";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ShoppingCart,
  Boxes,
  BarChart3,
  Settings as SettingsIcon,
  Users,
  Truck,
  Wallet,
  Building2,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { AnnouncementMarquee } from "@/components/pos/announcement-marquee";
import { useRole, ROLE_LABEL, type StoreRole } from "@/lib/roles";
import { usePos } from "@/lib/pos-store";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  sales: ShoppingCart,
  inventory: Boxes,
  reports: BarChart3,
  customers: Users,
  suppliers: Truck,
  expenses: Wallet,
  branches: Building2,
  settings: SettingsIcon,
};

const NAV_ITEMS = [
  { to: "/register", label: "အရောင်းစာရင်း", tone: "sales", branchAllowed: true },
  { to: "/inventory", label: "ကုန်ပစ္စည်းများ", tone: "inventory", branchAllowed: true },
  { to: "/analytics", label: "ဆန်းစစ်ခြင်း", tone: "reports", branchAllowed: false },
  { to: "/customers", label: "ဖောက်သည်များ", tone: "customers", branchAllowed: true },
  { to: "/suppliers", label: "ကုန်သွင်းသူများ", tone: "suppliers", branchAllowed: false },
  { to: "/expenses", label: "အသုံးစရိတ်", tone: "expenses", branchAllowed: true },
  { to: "/settings_/staff", label: "ဆိုင်ခွဲများ (Pro)", tone: "branches", branchAllowed: false },
  { to: "/settings", label: "ပြုပြင်ခြင်း", tone: "settings", branchAllowed: false },
] as const;

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const logo = useStoreLogo();
  const { store } = useAuth();

  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      {logo ? (
        <img
          src={logo}
          alt={store ? `${store.name} logo` : "SMT POS logo"}
          className="h-9 w-9 shrink-0 object-contain rounded-md"
        />
      ) : (
        <div
          aria-label="SMT POS"
          className="flex h-9 w-9 shrink-0 items-center justify-center"
        >
          <LottiePlayer src="/animations/s-logo.json" className="h-9 w-9" />
        </div>
      )}
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">SMT POS</p>
          <p className="truncate text-xs leading-5 text-sidebar-foreground/70">{store?.name ?? "Store"}</p>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { isBranchDevice } = useAuth();

  const items = isBranchDevice
    ? NAV_ITEMS.filter((item) => item.branchAllowed)
    : NAV_ITEMS;

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to as string}
          title={item.label}
          data-tone={item.tone}
          onClick={onNavigate}
          activeOptions={{ exact: item.to === "/register" }}
          activeProps={{
            className: "",
            "data-active": "true",
          }}
          className={cn(
            "pos-nav-tab flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            collapsed && "justify-center px-0",
          )}
        >
          {(() => {
            const Icon = NAV_ICONS[item.tone] ?? ShoppingCart;
            return <Icon className="h-4 w-4 shrink-0" />;
          })()}
          {!collapsed && <span className="truncate leading-6">{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { session, signOut, stores, store, switchStore, isBranchDevice } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const label = isBranchDevice ? (store?.name ?? "ဆိုင်ခွဲ") : (store?.name || email || "ဆိုင်ရှင်");
  const initial = label.charAt(0).toUpperCase() || "S";

  const handleSignOut = () => {
    void (async () => {
      await signOut();
      void navigate({ to: "/", replace: true });
    })();
  };

  if (collapsed) {
    return (
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive text-sm font-semibold transition-colors"
      >
        {initial}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-xs">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-sidebar-accent-foreground">{label}</p>
          <p className="text-[11px] text-sidebar-foreground/70">
            {isBranchDevice ? "ဆိုင်ခွဲ (Branch)" : "ဆိုင်ရှင် (Shop Owner)"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          title="အကောင့်ထွက်မည်"
          aria-label="Sign out"
          className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Owner store switch if multi-branch */}
      {stores.length > 1 && !isBranchDevice && (
        <select
          aria-label="ဆိုင် ပြောင်းရန်"
          value={store?.id ?? ""}
          onChange={(e) => switchStore(e.target.value)}
          className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs text-sidebar-foreground"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.parent_store_id ? "ဆိုင်ခွဲ · " : "ပင်မ · "}
              {s.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function PosShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { session, store, loading } = useAuth();
  const { isOwner } = useRole();
  const { syncState, pendingCount, syncNow } = usePos();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/", replace: true });
    else if (!loading && session && !store) void navigate({ to: "/login", replace: true });
  }, [loading, session, store, navigate]);

  useEffect(() => {
    if (loading || !session || !store) return;
    const allowed =
      pathname === "/register" ||
      pathname.startsWith("/customers") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/expenses") ||
      (pathname.startsWith("/analytics") && isOwner) ||
      (pathname.startsWith("/suppliers") && isOwner) ||
      ((pathname === "/settings" || pathname.startsWith("/settings/")) && isOwner);
    if (!allowed) void navigate({ to: "/register", replace: true });
  }, [loading, session, store, isOwner, pathname, navigate]);

  useEffect(() => {
    const stored = window.localStorage.getItem("pos-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () =>
    setCollapsed((prev) => {
      window.localStorage.setItem("pos-sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });

  if (loading || !session || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pos-app flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "no-print hidden shrink-0 flex-col self-start overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 md:sticky md:top-0 md:flex md:h-screen shadow-sm",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className="px-1 py-2">
          <Brand collapsed={collapsed} />
        </div>
        <div className="my-3 h-px bg-sidebar-border" />
        <NavList collapsed={collapsed} />
        <div className="mt-auto space-y-2">
          <UserCard collapsed={collapsed} />
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex min-h-9 w-full items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" /> ဘေးဘား သိမ်းဆည်းရန်
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar p-3 shadow-xl">
            <div className="flex items-center justify-between px-1 py-2">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-sidebar-foreground/80 hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="my-3 h-px bg-sidebar-border" />
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto">
              <UserCard />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md shadow-xs">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-5">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex items-center gap-3">
              <div>
                <h1 className="truncate text-base font-bold leading-6 tracking-tight sm:text-lg">{title}</h1>
                {subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              
              {/* Online / Offline Sync Badge */}
              <div className="hidden sm:flex items-center">
                {syncState === "syncing" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-3 w-3 animate-spin" /> ဒေတာ ချိတ်ဆက်သိမ်းဆည်းနေသည်...
                  </span>
                ) : syncState === "offline" || pendingCount > 0 ? (
                  <button
                    onClick={() => void syncNow()}
                    title="ကွန်ရက် ပြန်ရပါက နှိပ်၍ သိမ်းပါ"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
                  >
                    <WifiOff className="h-3 w-3" /> အော့ဖ်လိုင်း {pendingCount > 0 && `(${pendingCount} စောင်)`}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Wifi className="h-3 w-3" /> အွန်လိုင်း
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          </div>
        </header>

        <AnnouncementMarquee />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
