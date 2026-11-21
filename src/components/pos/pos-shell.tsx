import { LottiePlayer } from "@/components/landing/lottie-player";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { AnnouncementMarquee } from "@/components/pos/announcement-marquee";
import { useRole, ROLE_LABEL, type StoreRole } from "@/lib/roles";
import { useSubscription } from "@/lib/subscription";
import { StaffSwitchModal } from "@/components/pos/staff-switch-modal";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";
import { ShoppingCart, Boxes, BarChart3, Settings as SettingsIcon, Users, Truck, Wallet, ShieldCheck } from "lucide-react";

const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  sales: ShoppingCart,
  inventory: Boxes,
  reports: BarChart3,
  settings: SettingsIcon,
  customers: Users,
  suppliers: Truck,
  expenses: Wallet,
  admin: ShieldCheck,
};

const NAV = [
  { to: "/register", label: "အရောင်းစာရင်း", tone: "sales", roles: ["OWNER", "MANAGER", "CASHIER"] as StoreRole[] },
  { to: "/inventory", label: "ကုန်ပစ္စည်းများ", tone: "inventory", roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/analytics", label: "ဆန်းစစ်ခြင်း", tone: "reports", roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/settings", label: "ပြုပြင်ခြင်း", tone: "settings", roles: ["OWNER"] as StoreRole[] },
] as const;

const ADVANCED_NAV = [
  { to: "/customers", label: "ဖောက်သည်များ", tone: "customers", roles: ["OWNER", "MANAGER", "CASHIER"] as StoreRole[] },
  { to: "/suppliers", label: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ", tone: "suppliers", roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/expenses", label: "အသုံးစရိတ်", tone: "expenses", roles: ["OWNER", "MANAGER"] as StoreRole[] },
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
          className="h-9 w-9 shrink-0 object-contain"
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
          <p className="truncate text-xs leading-5 text-muted-foreground">{store?.name ?? "Store"}</p>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { store, isBranchDevice } = useAuth();
  const { role, isActive } = useRole();
  
  const advanced = Boolean(store?.advanced_accounting_mode);
  const all = advanced ? [...NAV, ...ADVANCED_NAV] : [...NAV];
  
  // ဆိုင်ခွဲစက်ဖြစ်ပါက အရောင်း၊ ကုန်ပစ္စည်း၊ ဖောက်သည်နှင့် အသုံးစရိတ်သာ ခွင့်ပြုမည်
  const branchAllowed = ["/register", "/inventory", "/customers", "/expenses"];
  const items = isBranchDevice
    ? all.filter((item) => branchAllowed.includes(item.to))
    : all.filter((item) => item.roles.includes(role) && isActive);

  return (
    <nav className="flex flex-col gap-0.5">
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
            "pos-nav-tab flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
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
  const { role, isActive, activeStaff, loading: roleLoading } = useRole();
  const isPro = false;
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const label = isBranchDevice ? (store?.name ?? "Branch") : (activeStaff?.name || email);
  const initial = label.charAt(0).toUpperCase() || "U";

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
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold",
          isActive ? "bg-primary-soft text-primary" : "bg-destructive/15 text-destructive",
        )}
      >
        {initial}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
            isActive ? "bg-primary-soft text-primary" : "bg-destructive/15 text-destructive",
          )}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sidebar-accent-foreground">{label}</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            {isBranchDevice ? "ဆိုင်ခွဲစက် (Branch POS)" : roleLoading ? "…" : ROLE_LABEL[role]}
            {!isActive && !roleLoading && " · ရပ်ဆိုင်းထား"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="text-sidebar-foreground/60 transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* ဆိုင်ခွဲစက် မဟုတ်သော ပင်မ Owner သာ ဆိုင်ခွဲများသို့ ကူးပြောင်းကြည့်ရှုနိုင်မည် */}
      {stores.length > 1 && !isBranchDevice && (
        <select
          aria-label="ဆိုင် ပြောင်းရန်"
          value={store?.id ?? ""}
          onChange={(e) => switchStore(e.target.value)}
          className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs text-sidebar-accent-foreground"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.parent_store_id ? "ဆိုင်ခွဲ · " : "ပင်မ · "}
              {s.name}
            </option>
          ))}
        </select>
      )}
      {switching && <StaffSwitchModal onClose={() => setSwitching(false)} />}
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
  const {
    role,
    isActive,
    canManageSettings,
    canManageInventory,
    canManageAccounting,
    canManageCustomers,
    canViewAnalytics,
    loading: roleLoading,
  } = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/", replace: true });
    else if (!loading && session && !store) void navigate({ to: "/login", replace: true });
  }, [loading, session, store, navigate]);

  useEffect(() => {
    if (loading || roleLoading || !session || !store) return;
    if (!isActive) {
      void navigate({ to: "/register", replace: true });
      return;
    }
    const allowed =
      pathname === "/register" ||
      (pathname.startsWith("/customers") && canManageCustomers) ||
      (pathname.startsWith("/inventory") && canManageInventory) ||
      (pathname.startsWith("/analytics") && canViewAnalytics) ||
      (pathname.startsWith("/suppliers") && canManageAccounting) ||
      (pathname.startsWith("/expenses") && canManageAccounting) ||
      ((pathname === "/settings" || pathname.startsWith("/settings/")) && canManageSettings);
    if (!allowed) void navigate({ to: "/register", replace: true });
  }, [
    loading,
    roleLoading,
    isActive,
    role,
    pathname,
    canManageCustomers,
    canManageInventory,
    canViewAnalytics,
    canManageAccounting,
    canManageSettings,
    navigate,
  ]);

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
          "no-print hidden shrink-0 flex-col self-start overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 md:sticky md:top-0 md:flex md:h-screen",
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
            className="flex min-h-9 w-full items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" /> Collapse
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
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar p-3 shadow-pop">
            <div className="flex items-center justify-between px-1 py-2">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-sidebar-foreground/70"
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
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-7 tracking-tight">{title}</h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
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
