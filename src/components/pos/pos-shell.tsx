import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDot,
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { usePos } from "@/lib/pos-store";
import { useAuth } from "@/lib/auth-store";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";

// Static logo fallback pointing directly to public/smt-pos-logo.png
const DEFAULT_LOGO = "/smt-pos-logo.png";

const NAV = [
  { to: "/", label: "အရောင်းစာရင်း", icon: ScanLine },
  { to: "/inventory", label: "ကုန်ပစ္စည်းများ", icon: Boxes },
  { to: "/analytics", label: "ဆန်းစစ်ခြင်း", icon: BarChart3 },
  { to: "/settings", label: "ပြုပြင်ခြင်း", icon: Settings },
] as const;

function StatusBadge() {
  const { syncState, pendingCount } = usePos();
  const base =
    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium";
  if (syncState === "syncing") {
    return (
      <span className={cn(base, "border-sky-200 bg-sky-50 text-sky-700")}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> ဖတ်နေသည်
      </span>
    );
  }
  if (syncState === "offline") {
    return (
      <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-700")}>
        <CircleDot className="h-3.5 w-3.5" /> အင်တာနက်မရှိပါ ({pendingCount})
      </span>
    );
  }
  return (
    <span className={cn(base, "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      <CircleDot className="h-3.5 w-3.5" /> အွန်လိုင်း
    </span>
  );
}

function LowStockBadge() {
  const { lowStockCount } = usePos();
  return (
    <Link
      to="/inventory"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        lowStockCount > 0
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {lowStockCount} လက်ကျန်နည်း
    </Link>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const logo = useStoreLogo();
  const { store } = useAuth();
  
  // Use uploaded store logo if configured, otherwise fallback to /smt-pos-logo.png
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
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          title={item.label}
          onClick={onNavigate}
          activeOptions={{ exact: item.to === "/" }}
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
    </nav>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";

  const handleSignOut = () => {
    void (async () => {
      await signOut();
      void navigate({ to: "/login", replace: true });
    })();
  };

  if (collapsed) {
    return (
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground"
      >
        {initial}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-sidebar-accent-foreground">{email}</p>
          <p className="text-[11px] text-sidebar-foreground/60">ဆိုင်ပိုင်ရှင်</p>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="text-sidebar-foreground/60 transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!session || !store)) void navigate({ to: "/login", replace: true });
  }, [loading, session, store, navigate]);

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
      {/* Tablet & desktop: persistent collapsible sidebar */}
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

      {/* Mobile drawer */}
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
              <div className="hidden items-center gap-2 sm:flex">
                <LowStockBadge />
                <StatusBadge />
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

