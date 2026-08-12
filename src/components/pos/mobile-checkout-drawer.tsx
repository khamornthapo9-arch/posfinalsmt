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
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none opacity-0",
      )}
    >
      <button
        onClick={onClose}
        aria-label="Close checkout"
        className={cn(
          "absolute inset-0 bg-slate-900/60 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">ငွေရှင်းရန်</h2>
          <button
            onClick={onClose}
            aria-label="ပိတ်ရန်"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground"
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
