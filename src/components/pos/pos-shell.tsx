import { LottiePlayer } from "@/components/landing/lottie-player";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
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

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const logo = useStoreLogo();
  const { store } = useAuth();

  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs">
        {logo ? (
          <img
            src={logo}
            alt={store?.name ?? "Store"}
            className="h-7 w-7 rounded-md object-cover"
          />
        ) : (
          <div className="h-7 w-7">
            <LottiePlayer
              src="/animations/s-logo.json"
              loop={false}
              autoplay={false}
              className="h-full w-full"
            />
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {store?.name ?? "SMT POS"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">လက်လီ အရောင်းဆိုင်</p>
        </div>
      )}
    </div>
  );
}

function useVisibleGroups(): NavGroup[] {
  const { role, isPro, isBranchDevice } = useRole();
  return visibleGroups({ role, isPro, isBranchDevice });
}

function NavList({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const groups = useVisibleGroups();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <TooltipProvider delayDuration={150}>
      <nav aria-label="Main Navigation" className="space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isPathActive(pathname, item.path);
                const Icon = NAV_ICONS[item.icon];
                const content = (
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                if (!collapsed) {
                  return <li key={item.path}>{content}</li>;
                }

                return (
                  <li key={item.path}>
                    <Tooltip>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { role, isPro, isBranchDevice } = useRole();
  const { user, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className={cn("rounded-lg border border-border bg-card p-2 shadow-xs", collapsed && "p-1")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {role.slice(0, 1)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.email ?? "User"}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>{ROLE_LABEL[role]}</span>
                {isPro && (
                  <span className="rounded bg-primary/15 px-1 py-0.2 text-[9px] font-bold text-primary">
                    PRO
                  </span>
                )}
                {isBranchDevice && (
                  <span className="rounded bg-accent px-1 py-0.2 text-[9px] text-muted-foreground">
                    ဆိုင်ခွဲ
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {!collapsed && !isBranchDevice && (
          <div className="mt-2 flex gap-1 border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="press flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
            >
              အကောင့်ပြောင်း
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              title="ထွက်မည်"
              aria-label="ထွက်မည်"
              className="press flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <StaffSwitchModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function PageBreadcrumb({ pathname }: { pathname: string }) {
  const groups = useVisibleGroups();
  const trail = trailFor(pathname, groups);
  if (!trail) return null;

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList className="text-[11px]">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/register">ပင်မ</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <span className="text-muted-foreground">{trail.groupTitle}</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-semibold">{trail.itemLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function PosShell({
  children,
  title,
  subtitle,
  actions,
  stackActionsOnMobile = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  stackActionsOnMobile?: boolean;
}) {
  const { session, store, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("pos-sidebar-collapsed") === "1";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const rootRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const rail = collapsed || isTablet;

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
      className="pos-app flex min-h-dvh w-full overflow-x-clip bg-background text-foreground"
      style={{ "--pos-chrome": "64px" } as CSSProperties}
    >
      {/* Sidebar: Desktop & Tablet */}
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

      {/* Mobile Drawer Slide-out Menu */}
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-3 sm:px-4 sm:py-3">
              {/* Menu button is always visible on mobile */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-20 flex-1 basis-0">
                <PageBreadcrumb pathname={pathname} />
                <h1 className="truncate text-base font-semibold leading-7 tracking-tight sm:text-lg">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                )}
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

        <main className="animate-page-in min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
