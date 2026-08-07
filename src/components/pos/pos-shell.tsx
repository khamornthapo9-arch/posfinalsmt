import { Link } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Boxes, CircleDot, Loader2, ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { usePos } from "@/lib/pos-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "POS Register", icon: ScanLine },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

function StatusBadge() {
  const { syncState, pendingCount } = usePos();
  if (syncState === "syncing") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...
      </span>
    );
  }
  if (syncState === "offline") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
        <CircleDot className="h-3.5 w-3.5" /> Offline ({pendingCount} pending)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
      <CircleDot className="h-3.5 w-3.5" /> Online &amp; Synced
    </span>
  );
}

export function PosShell({ title, children }: { title: string; children: ReactNode }) {
  const { lowStockCount } = usePos();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex print:hidden">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Counter</p>
            <p className="text-xs text-muted-foreground">Point of Sale</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 print:hidden">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/inventory"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                lowStockCount > 0
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} low stock
            </Link>
            <StatusBadge />
          </div>
        </header>

        <nav className="flex gap-1 border-b border-border bg-card px-2 py-2 md:hidden print:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
