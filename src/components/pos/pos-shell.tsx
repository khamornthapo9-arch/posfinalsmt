import { LottiePlayer } from "@/components/landing/lottie-player";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-store";
import { AnnouncementMarquee } from "@/components/pos/announcement-marquee";
import { useRole, ROLE_LABEL } from "@/lib/roles";
import {
  isPathActive,
  primaryItems,
  trailFor,
  visibleGroups,
  type NavGroup,
  type NavItem,
} from "@/lib/nav-config";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StaffSwitchModal } from "@/components/pos/staff-switch-modal";
import { useStoreLogo } from "@/lib/use-store-logo";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Boxes,
  BarChart3,
  Settings as SettingsIcon,
  Users,
  Truck,
  Wallet,
  ShieldCheck,
} from "lucide-react";

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

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const logo = useStoreLogo();
  const { store } = useAuth();

  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      {logo ? (
        <img
          src={logo}
          alt={store ? `${store.name} logo` : "SMT POS logo"}
          className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1"
        />
      ) : (
        <div
          aria-label="SMT POS"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1"
        >
          <LottiePlayer src="/animations/s-logo.json" className="h-9 w-9" />
        </div>
      )}
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
            SMT POS
          </p>
          <p className="truncate text-xs leading-5 text-sidebar-foreground/60">
            {store?.name ?? "Store"}
          </p>
        </div>
      )}
    </div>
  );
}

function useVisibleGroups(): NavGroup[] {
  const { store, isBranchDevice } = useAuth();
  const { role, isActive } = useRole();
  return visibleGroups({
    advanced: Boolean(store?.advanced_accounting_mode),
    isBranchDevice,
    role,
    isActive,
  });
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const groups = useVisibleGroups();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Parents with children auto-expand on their own routes; the chevron overrides that.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const renderLink = (
    item: { to: string; label: string; tone?: string; exact?: boolean },
    Icon?: ComponentType<{ className?: string }>,
    child = false,
  ) => {
    const link = (
      <Link
        key={item.to}
        to={item.to as string}
        title={collapsed ? undefined : item.label}
        aria-label={collapsed ? item.label : undefined}
        data-tone={item.tone ?? "settings"}
        onClick={onNavigate}
        activeOptions={{ exact: item.exact ?? false }}
        activeProps={{ className: "", "data-active": "true" }}
        className={cn(
          "pos-nav-tab flex min-h-10 touch:min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
          child && "min-h-9 py-2 pl-10 text-[13px]",
          collapsed && "justify-center px-0",
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {!collapsed && <span className="truncate leading-6">{item.label}</span>}
      </Link>
    );
    if (!collapsed) return link;
    return (
      <Tooltip key={item.to}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <nav aria-label="Main" className="flex flex-col gap-3">
        {groups.map((group, index) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            {collapsed ? (
              index > 0 && <div className="mx-2 mb-1 h-px bg-sidebar-border" />
            ) : (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                {group.label}
              </p>
            )}
            {group.items.map((item: NavItem) => {
              const Icon = NAV_ICONS[item.tone] ?? ShoppingCart;
              const children = item.children ?? [];
              if (collapsed || children.length === 0) {
                return renderLink(item, Icon);
              }
              const underParent = isPathActive(pathname, item.to);
              const open = toggled[item.to] ?? underParent;
              return (
                <div key={item.to} className="flex flex-col gap-0.5">
                  <div className="relative">
                    {renderLink(item, Icon)}
                    <button
                      type="button"
                      aria-label={open ? `${item.label} ချုံ့မည်` : `${item.label} ဖြန့်မည်`}
                      aria-expanded={open}
                      onClick={() => setToggled((prev) => ({ ...prev, [item.to]: !open }))}
                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent/60"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                      />
                    </button>
                  </div>
                  {open &&
                    children.map((child) => renderLink({ ...child, exact: true }, undefined, true))}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}

/** Phone-only bottom bar. More opens the existing menu drawer, which lists every destination. */
function BottomNav({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const groups = useVisibleGroups();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = primaryItems(groups);
  const tab =
    "press touch:min-h-14 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground transition-colors";
  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-header-border bg-header/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {items.map((item) => {
        const Icon = NAV_ICONS[item.tone] ?? ShoppingCart;
        const active = isPathActive(pathname, item.to, item.exact);
        return (
          <Link
            key={item.to}
            to={item.to as string}
            aria-current={active ? "page" : undefined}
            className={cn(tab, active && "text-primary")}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.short}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={cn(tab, moreOpen && "text-primary")}
      >
        <MoreHorizontal className="h-5 w-5" />
        <span>နောက်ထပ်</span>
      </button>
    </nav>
  );
}

function PageBreadcrumb({ pathname }: { pathname: string }) {
  const trail = trailFor(pathname);
  if (trail.length === 0) return null;
  return (
    <Breadcrumb className="mb-0.5">
      <BreadcrumbList className="gap-1 text-xs sm:gap-1.5">
        {trail.map((crumb, i) => (
          <BreadcrumbItem key={crumb.label}>
            {crumb.to ? (
              <BreadcrumbLink asChild>
                <Link to={crumb.to as string}>{crumb.label}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            )}
            {i < trail.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { session, signOut, stores, store, switchStore, isBranchDevice } = useAuth();
  const { role, isActive, activeStaff, loading: roleLoading } = useRole();
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const label = isBranchDevice ? (store?.name ?? "Branch") : activeStaff?.name || email;
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
  stackActionsOnMobile = false,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  /** Phones: put the actions on their own full-width row under the title (for crowded toolbars). */
  stackActionsOnMobile?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const { session, store, loading, isBranchDevice } = useAuth();
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
      ((pathname === "/settings" || pathname.startsWith("/settings/")) &&
        (canManageSettings || isBranchDevice));
    if (!allowed) void navigate({ to: "/register", replace: true });
  }, [
    loading,
    roleLoading,
    isActive,
    role,
    pathname,
    isBranchDevice,
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

  // Tablets (768–1023px) always get the icon rail, so the register keeps room for its cart.
  // The saved collapse preference still applies on larger screens.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const sync = () => setIsTablet(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Publish the real height of the header (+ announcement bar) as --pos-chrome so full-height
  // screens can fill exactly the remaining space instead of guessing 64px.
  useEffect(() => {
    const chrome = chromeRef.current;
    const root = rootRef.current;
    if (!chrome || !root) return;
    const apply = () =>
      root.style.setProperty(
        "--pos-chrome",
        `${Math.ceil(chrome.getBoundingClientRect().height)}px`,
      );
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(chrome);
    return () => observer.disconnect();
  }, [loading, session, store]);

  // Mobile drawer: Escape closes it and the page behind it stops scrolling while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [drawerOpen]);

  const rail = collapsed || isTablet;
  // The register keeps its own pinned checkout bar, so the bottom nav is not stacked on top of it.
  const showBottomNav = pathname !== "/register";

  const toggle = () =>
    setCollapsed((prev) => {
      window.localStorage.setItem("pos-sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });

  if (loading || !session || !store) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "pos-app flex min-h-dvh w-full overflow-x-clip bg-background text-foreground",
        showBottomNav && "max-md:[--pos-bottom-nav:calc(3.5rem_+_env(safe-area-inset-bottom))]",
      )}
      style={{ "--pos-chrome": "64px" } as CSSProperties}
    >
      {/* Sidebar: full on desktop, icon rail on tablet, hidden on phones (see drawer) */}
      <aside
        className={cn(
          "no-print hidden shrink-0 flex-col self-start overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 ease-[var(--ease-out-soft)] md:sticky md:top-0 md:flex md:h-dvh",
          rail ? "w-[68px]" : "w-60",
        )}
      >
        <div className="px-1 py-2">
          <Brand collapsed={rail} />
        </div>
        <div className="my-3 h-px bg-sidebar-border" />
        <NavList collapsed={rail} />
        <div className="mt-auto space-y-2">
          <UserCard collapsed={rail} />
          {!isTablet && (
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
          )}
        </div>
      </aside>

      {/* Mobile drawer: always mounted so it can slide; `invisible` when closed keeps it out of
          the tab order and away from screen readers. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!drawerOpen}
        className={cn(
          "no-print fixed inset-0 z-50 md:hidden",
          drawerOpen
            ? "visible"
            : "invisible pointer-events-none [transition:visibility_0s_linear_320ms]",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-foreground/45 backdrop-blur-[2px] transition-opacity duration-[var(--duration-base)]",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "sheet-motion absolute inset-y-0 left-0 flex w-[min(288px,85vw)] flex-col border-r border-sidebar-border bg-sidebar px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-pop",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-1 py-2">
            <Brand />
            <button
              ref={drawerCloseRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              tabIndex={drawerOpen ? 0 : -1}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="my-3 h-px bg-sidebar-border" />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavList onNavigate={() => setDrawerOpen(false)} />
          </div>
          <div className="mt-auto pt-3">
            <UserCard />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={chromeRef} className="no-print sticky top-0 z-30">
          <header className="pt-safe border-b border-header-border bg-header/95 backdrop-blur-md">
            {/* Flex + wrap (not a fixed 3-column grid): a crowded toolbar drops to its own row
                instead of pushing the page wider than the screen. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-3 sm:px-4 sm:py-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className={cn(
                  "press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs md:hidden",
                  showBottomNav && "hidden",
                )}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-20 flex-1 basis-0">
                <PageBreadcrumb pathname={pathname} />
                <h1 className="truncate text-base font-semibold leading-7 tracking-tight sm:text-lg">
                  {title}
                </h1>
                {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && (
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-2",
                    stackActionsOnMobile ? "basis-full sm:basis-auto sm:shrink-0" : "shrink-0",
                  )}
                >
                  {actions}
                </div>
              )}
            </div>
          </header>
          <AnnouncementMarquee />
        </div>

        <main className="animate-page-in min-w-0 flex-1 pb-[var(--pos-bottom-nav,0px)]">
          {children}
        </main>
      </div>
      {showBottomNav && <BottomNav onMore={() => setDrawerOpen(true)} moreOpen={drawerOpen} />}
    </div>
  );
}
