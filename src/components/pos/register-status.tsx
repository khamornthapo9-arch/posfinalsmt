import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePos } from "@/lib/pos-store";

/**
 * Connection + offline-queue indicator for the register header.
 * Reads the POS provider's state directly (no second source of truth).
 */
export function RegisterStatus({ className }: { className?: string }) {
  const { syncState, pendingCount } = usePos();

  const config = {
    online: { label: "အွန်လိုင်း", Icon: Wifi, tone: "text-success border-success/30 bg-success/10" },
    syncing: {
      label: "ချိတ်ဆက်နေသည်",
      Icon: RefreshCw,
      tone: "text-warning border-warning/30 bg-warning/10",
    },
    offline: {
      label: "အော့ဖ်လိုင်း",
      Icon: CloudOff,
      tone: "text-destructive border-destructive/30 bg-destructive/10",
    },
  }[syncState];

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="status" aria-live="polite">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
          config.tone,
        )}
      >
        <config.Icon
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", syncState === "syncing" && "animate-spin")}
        />
        <span className="max-sm:sr-only">{config.label}</span>
      </span>
      {pendingCount > 0 && (
        <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-semibold tabular-nums text-warning">
          စောင့်ဆိုင်း {pendingCount}
          <span className="sr-only"> ခု ထပ်တူပြုရန်</span>
        </span>
      )}
    </div>
  );
}
