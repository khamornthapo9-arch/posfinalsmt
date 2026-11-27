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
      title={activeShift ? "အလုပ်ပတ် ဖွင့်ထား" : "အလုပ်ပတ် မဖွင့်ရသေး"}
      aria-label={activeShift ? "အလုပ်ပတ် ဖွင့်ထား" : "အလုပ်ပတ် မဖွင့်ရသေး"}
      className={cn(
        "press inline-flex h-9 w-9 touch:h-11 touch:w-11 items-center justify-center rounded-md border sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5",
        activeShift
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden text-xs font-semibold sm:inline">
        {activeShift ? "အလုပ်ပတ် ဖွင့်ထား" : "အလုပ်ပတ် မဖွင့်ရသေး"}
      </span>
    </Link>
  );
}
