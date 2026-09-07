import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Banknote,
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { usePlatformAdmin } from "@/lib/use-platform-admin";
import { AnnouncementMarquee } from "@/components/pos/announcement-marquee";
import { useRole, ROLE_LABEL, type StoreRole } from "@/lib/roles";
import { useSubscription } from "@/lib/subscription";
import { StaffSwitchModal } from "@/components/pos/staff-switch-modal";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";

// Static logo fallbacks pointing directly to public folder
const DEFAULT_LOGO = "/smt-pos-logo.png";

const NAV = [
  { to: "/register", label: "အရောင်းစာရင်း", icon: ScanLine, roles: ["OWNER", "MANAGER", "CASHIER"] as StoreRole[] },
  { to: "/inventory", label: "ကုန်ပစ္စည်းများ", icon: Boxes, roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/analytics", label: "ဆန်းစစ်ခြင်း", icon: BarChart3, roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/settings", label: "ပြုပြင်ခြင်း", icon: Settings, roles: ["OWNER"] as StoreRole[] },
] as const;

const ADVANCED_NAV = [
  { to: "/customers", label: "ဖောက်သည်များ", icon: Users, roles: ["OWNER", "MANAGER", "CASHIER"] as StoreRole[] },
  { to: "/suppliers", label: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ", icon: Truck, roles: ["OWNER", "MANAGER"] as StoreRole[] },
  { to: "/expenses", label: "အသုံးစရိတ်", icon: Banknote, roles: ["OWNER", "MANAGER"] as StoreRole[] },
] as const;

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const logo = useStoreLogo();
  const { store } = useAuth();

  const logoSrc = logo || DEFAULT_LOGO;

  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <img
        src={logoSrc}
        alt={store ? `${store.name} logo` : "SMT POS logo"}
        className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
      />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
            SMT POS
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">{store?.name ?? "Store"}</p>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { store } = useAuth();
  const { role, isActive } = useRole();
  const { isAdmin } = usePlatformAdmin();
  const advanced = Boolean(store?.advanced_accounting_mode);
  const all = advanced ? [...NAV, ...ADVANCED_NAV] : [...NAV];
  const items = all.filter((item) => item.roles.includes(role) && isActive);
  const adminItem = isAdmin
    ? { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["OWNER"] as StoreRole[] }
    : null;
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to as string}
          title={item.label}
          onClick={onNavigate}
          activeOptions={{ exact: item.to === "/register" }}
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground",
          }}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      ))}
      {adminItem && (
        <Link
          to={adminItem.to}
          title={adminItem.label}
          onClick={onNavigate}
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <adminItem.icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{adminItem.label}</span>}
        </Link>
      )}
    </nav>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { session, signOut } = useAuth();
  const { role, isActive, activeStaff, loading: roleLoading } = useRole();
  const { isPro } = useSubscription();
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const label = activeStaff?.name || email;
  const initial = label.charAt(0).toUpperCase() || "U";

  const handleSignOut = () => {
    void (async () => {
      await signOut();
      void navigate({ to: "/login", replace: true });
    })();
  };

  if (collapsed) {
    return (
      <>
        <button
          onClick={() => (isPro ? setSwitching(true) : handleSignOut())}
          aria-label={isPro ? "ဝန်ထမ်း ပြောင်းရန်" : "Sign out"}
          className={cn(
            "mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-destructive/20 text-destructive",
          )}
        >
          {initial}
        </button>
        {switching && <StaffSwitchModal onClose={() => setSwitching(false)} />}
      </>
    );
  }

  return (
    <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-destructive/20 text-destructive",
          )}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-sidebar-accent-foreground">{label}</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            {roleLoading ? "…" : ROLE_LABEL[role]}
            {!isActive && !roleLoading && " · ရပ်ဆိုင်းထား"}
          </p>
        </div>
        {isPro && (
          <button
            onClick={() => setSwitching(true)}
            aria-label="ဝန်ထမ်း ပြောင်းရန်"
            title="ဝန်ထမ်း ပြောင်းရန် (PIN)"
            className="text-sidebar-foreground/60 transition-colors hover:text-sidebar-accent-foreground"
          >
            <UserCog className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="text-sidebar-foreground/60 transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
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
    if (!loading && (!session || !store)) void navigate({ to: "/login", replace: true });
  }, [loading, session, store, navigate]);

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!isActive) {
      void navigate({ to: "/register", replace: true });
      return;
    }
    const allowed =
      pathname === "/register" ||
      pathname.startsWith("/admin") ||
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
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "no-print hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 md:flex",
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
            className="absolute inset-0 bg-slate-900/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar p-3">
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
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card md:static">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
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
