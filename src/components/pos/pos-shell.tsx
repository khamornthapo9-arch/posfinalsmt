import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDot,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { usePos } from "@/lib/pos-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "POS Register", short: "Register", icon: ScanLine },
  { to: "/inventory", label: "Inventory", short: "Inventory", icon: Boxes },
  { to: "/analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
] as const;

function StatusBadge({ compact = false }: { compact?: boolean }) {
  const { syncState, pendingCount } = usePos();
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs";
  if (syncState === "syncing") {
    return (
      <span className={cn(base, "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300")}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {compact ? "Sync" : "Syncing..."}
      </span>
    );
  }
  if (syncState === "offline") {
    return (
      <span
        className={cn(base, "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300")}
      >
        <CircleDot className="h-3.5 w-3.5" /> Offline ({pendingCount})
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      )}
    >
      <CircleDot className="h-3.5 w-3.5" /> {compact ? "Online" : "Online & Synced"}
    </span>
  );
}

function LowStockBadge() {
  const { lowStockCount } = usePos();
  return (
    <Link
      to="/inventory"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs",
        lowStockCount > 0
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border text-muted-foreground",
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {lowStockCount} low
    </Link>
  );
}

export function PosShell({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("pos-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      window.localStorage.setItem("pos-sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop: persistent collapsible sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-[width] duration-200 lg:flex no-print",
          collapsed ? "w-[74px]" : "w-60",
        )}
      >
        <div className={cn("mb-6 flex items-center gap-2 px-1", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Counter</p>
              <p className="truncate text-xs text-muted-foreground">Point of Sale</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" /> Collapse
            </>
          )}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Tablet & mobile: sticky header + tab bar. Desktop: plain header. */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:static lg:backdrop-blur-none no-print">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-4">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <LowStockBadge />
              <StatusBadge compact />
            </div>
          </div>

          <nav className="flex gap-1 px-2 pb-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-primary text-primary-foreground shadow-sm" }}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors active:scale-[0.98]"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.short}</span>
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
