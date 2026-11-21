import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small inline "Pro" pill used next to locked controls. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300",
        className,
      )}
    >
      <Crown className="h-3 w-3" /> Pro
    </span>
  );
}

/** Inline lock button that links to the upgrade page. */
export function ProLockButton({ label = "Pro Plan လိုအပ်သည်" }: { label?: string }) {
  return (
    <Link
      to="/settings/plan"
      className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-300"
    >
      <Lock className="h-3 w-3" /> {label}
    </Link>
  );
}

/** Blur-overlays its children and shows an upgrade prompt when `locked`. */
export function ProLock({
  locked,
  label = "Pro Plan ဖြင့် ကြည့်ရှုနိုင်ပါသည်",
  children,
  className,
  upgradable = true,
}: {
  locked: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
  /** Set false when the lock isn't about the Pro plan (e.g. a branch login) — hides the upgrade link. */
  upgradable?: boolean;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className={cn("relative overflow-hidden rounded-md", className)}>
      <div aria-hidden className="pointer-events-none select-none blur-[6px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 p-3 text-center backdrop-blur-md">
        <Lock className="h-4 w-4 text-amber-500" />
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {upgradable && (
          <Link
            to="/settings/plan"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Crown className="h-3 w-3" /> အဆင့်မြှင့်ရန်
          </Link>
        )}
      </div>
    </div>
  );
}
