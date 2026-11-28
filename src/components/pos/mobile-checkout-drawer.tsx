import { useEffect, useRef, useState, useCallback } from "react";
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

const DISMISS_THRESHOLD_PX = 96;
const DISMISS_VELOCITY = 0.45; // px/ms

export function MobileCheckoutDrawer({ open, onClose, ...cartProps }: MobileCheckoutDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragY = useRef(0);
  const dragStartY = useRef(0);
  const dragStartT = useRef(0);
  const dragging = useRef(false);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragY.current = 0;
    setOffsetY(0);
    setIsDragging(false);
    dragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
    }
  }, []);

  useEffect(() => {
    if (!open) resetDrag();
  }, [open, resetDrag]);

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

  const onPointerDown = (event: React.PointerEvent) => {
    // Only start a dismiss drag from the handle / header chrome — not from cart controls.
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    dragging.current = true;
    setIsDragging(true);
    dragStartY.current = event.clientY;
    dragStartT.current = event.timeStamp;
    dragY.current = 0;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = Math.max(0, event.clientY - dragStartY.current);
    dragY.current = dy;
    setOffsetY(dy);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = dragY.current;
    const dt = Math.max(1, event.timeStamp - dragStartT.current);
    const velocity = dy / dt;
    dragging.current = false;
    setIsDragging(false);

    if (dy > DISMISS_THRESHOLD_PX || velocity > DISMISS_VELOCITY) {
      // Animate the rest of the way off-screen, then close.
      setOffsetY(typeof window !== "undefined" ? window.innerHeight : 800);
      window.setTimeout(() => {
        onClose();
        resetDrag();
      }, 180);
      return;
    }
    // Snap back
    setOffsetY(0);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="ငွေရှင်းရန်"
      aria-hidden={!open}
      // When closed, remove from a11y tree and block all pointer events so the
      // product grid underneath stays fully usable.
      {...(!open ? { inert: true as unknown as boolean } : {})}
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "visible pointer-events-auto" : "invisible pointer-events-none",
      )}
      style={{
        // Avoid a stuck transition leaving the overlay interactive after close.
        transition: open ? undefined : "visibility 0s linear 280ms",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close checkout"
        className={cn(
          "absolute inset-0 bg-foreground/50 backdrop-blur-[2px] transition-opacity duration-200",
          open && offsetY === 0 ? "opacity-100" : open ? "opacity-60" : "opacity-0",
        )}
      />

      <div
        ref={sheetRef}
        className={cn(
          "absolute inset-x-0 bottom-0 top-[max(3.5rem,env(safe-area-inset-top))] flex flex-col rounded-t-2xl border-t border-cart-border bg-cart shadow-pop pb-[env(safe-area-inset-bottom)]",
          !isDragging && (open ? "translate-y-0" : "translate-y-full"),
          !isDragging && "transition-transform duration-280 ease-out",
        )}
        style={{
          transform: open ? `translateY(${offsetY}px)` : undefined,
          touchAction: "none",
        }}
      >
        {/* Drag handle + header — swipe down here to return to product list */}
        <div
          className="relative shrink-0 touch-none select-none rounded-t-2xl border-b border-cart-border bg-cart-header"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex justify-center pt-2 pb-1">
            <span
              aria-hidden="true"
              className="h-1.5 w-12 rounded-full bg-muted-foreground/35"
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-3 pb-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="ငွေရှင်းလွှာ ချုံ့မည်"
              className="press flex min-h-10 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
              <span>ပစ္စည်းစာရင်းသို့</span>
            </button>

            <h2 className="text-sm font-semibold">ငွေရှင်းရန်</h2>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              tabIndex={open ? 0 : -1}
              aria-label="ပိတ်ရန်"
              className="press flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
          <CartPanel {...cartProps} />
        </div>
      </div>
    </div>
  );
}
