import { useEffect } from "react";
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
  onChangeQty: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
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
  // Escape closes the sheet, and the page behind it stops scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ငွေရှင်းရန်"
      aria-hidden={!open}
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
          "sheet-motion absolute inset-x-0 bottom-0 top-[max(4rem,env(safe-area-inset-top))] flex flex-col rounded-t-2xl border-t border-cart-border bg-cart shadow-pop",
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
