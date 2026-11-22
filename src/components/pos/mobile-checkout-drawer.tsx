import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
  creditCustomer: Customer | null;
  busy: boolean;
  subtotal: number;
  tax: number;
  total: number;
  taxPercent: number;
  remaining: number;
  creditPortion: number;
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

  // While open: Escape closes, Tab is trapped inside the sheet, the page behind stops scrolling,
  // focus moves into the sheet, and returns to whatever opened it on close.
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
        // `invisible` (after the slide finishes) removes the closed sheet from the tab order.
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
          "sheet-motion absolute inset-x-0 bottom-0 top-[max(4rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] flex flex-col rounded-t-2xl border-t border-cart-border bg-cart shadow-pop",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center justify-between rounded-t-2xl border-b border-cart-border bg-cart-header py-2 pr-2 pl-4">
          {/* Grab handle: visual cue that this is a dismissible sheet. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border"
          />
          <h2 className="pt-2 text-base font-semibold">ငွေရှင်းရန်</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            aria-label="ပိတ်ရန်"
            className="press mt-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <CartPanel {...cartProps} />
        </div>
      </div>
    </div>
  );
}
