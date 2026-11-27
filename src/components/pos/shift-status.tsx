import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShift } from "@/lib/shift-store";

/** Register header chip: is a cash shift open for this account? Links to the shift page. */
export function ShiftStatus({ className }: { className?: string }) {
  const { activeShift, supported } = useShift();
  if (!supported) return null;
  return (
    <Link
      to="/shifts"
      className={cn(
        "press inline-flex min-h-9 touch:min-h-11 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold",
        activeShift
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {activeShift ? "အလုပ်ပတ် ဖွင့်ထား" : "အလုပ်ပတ် မဖွင့်ရသေး"}
    </Link>
  );
}
