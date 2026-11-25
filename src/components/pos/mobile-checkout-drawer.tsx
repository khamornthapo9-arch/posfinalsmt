import { useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartPanel, type CartLine } from "./cart-panel";
import type { CachedItem } from "@/lib/pos-db";
import type { Customer } from "@/lib/accounting-store";

interface PaymentMethod {
  id: string;
  label: string;
  logo?: string;
  tone: string;
}

interface MobileCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  items: CachedItem[];
  isRestaurant: boolean;
  activeTable: number | null;
  notes: string;
  payment: string;
  splitMode: boolean;
  splits: Record<string, number>;
  customer: Customer | null;
  busy: boolean;
  subtotal: number;
  tax: number;
  total: number;
  taxPercent: number;
  remaining: number;
  creditPortion: number;
  cashReceived: string;
  cashDue: number;
  cashShort: boolean;
  changeDue: number;
  digitalDue: number;
  digitalConfirmed: boolean;
  onCashReceivedChange: (value: string) => void;
  onDigitalConfirmedChange: (value: boolean) => void;
  onSetQty: (itemId: string, qty: number, unitName?: string) => void;
  onClear: () => void;
  onClearCustomer: () => void;
  needsCreditCustomer: boolean;
  currencySymbol: string;
  payments: PaymentMethod[];
  onChangeQty: (itemId: string, delta: number, unitName?: string) => void;
  onRemove: (itemId: string, unitName?: string) => void;
  onNotesChange: (notes: string) => void;
  onSelectPayment: (method: string) => void;
  onToggleSplit: (method: string) => void;
  onSplitChange: (method: string, amount: number) => void;
  onToggleSplitMode: () => void;
  onPickCustomer: () => void;
  onPark: () => void;
  onComplete: () => void;
  onSendToKitchen: () => void;
  onPayAndClose: () => void;
}

export function MobileCheckoutDrawer({ open, onClose, ...cartProps }: MobileCheckoutDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open, onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="ငွေရှင်းရန်"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "visible" : "invisible pointer-events-none [transition:visibility_0s_linear_320ms]",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close checkout"
        className={cn(
          "absolute inset-0 bg-foreground/50 backdrop-blur-[2px] transition-opacity duration-[var(--duration-base)]",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "sheet-motion absolute inset-x-0 bottom-0 top-[max(3rem,env(safe-area-inset-top))] flex flex-col rounded-t-2xl border-t border-cart-border bg-cart shadow-pop pb-[env(safe-area-inset-bottom)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Drop Down Header with Chevron & Grab handle */}
        <div className="relative flex items-center justify-between rounded-t-2xl border-b border-cart-border bg-cart-header px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="ငွေရှင်းလွှာ ချုံ့မည်"
            className="press flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
            <span>ပစ္စည်းစာရင်းသို့</span>
          </button>

          {/* Centered drag handle */}
          <span
            aria-hidden="true"
            onClick={onClose}
            className="absolute top-2 left-1/2 h-1.5 w-12 -translate-x-1/2 cursor-pointer rounded-full bg-border hover:bg-muted-foreground/40 transition-colors"
          />

          <h2 className="text-sm font-semibold">ငွေရှင်းရန်</h2>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            aria-label="ပိတ်ရန်"
            className="press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <CartPanel {...cartProps} />
        </div>
      </div>
    </div>
  );
}
