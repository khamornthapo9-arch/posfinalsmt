import { ShoppingCart } from "lucide-react";
import { money } from "@/lib/pos-utils";
import type { CartLine } from "./cart-panel";

interface MobileCheckoutBarProps {
  cart: CartLine[];
  total: number;
  currencySymbol: string;
  onCheckout: () => void;
}

export function MobileCheckoutBar({ cart, total, currencySymbol, onCheckout }: MobileCheckoutBarProps) {
  const fmt = (n: number) => money(n, currencySymbol);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="border-t border-border bg-card p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <button
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShoppingCart className="h-4 w-4" />
          {count} ခု
        </span>
        <span className="text-base font-bold tabular-nums">
          {fmt(total)} <span className="ml-1 text-sm font-normal opacity-90">→ Checkout</span>
        </span>
      </button>
    </div>
  );
}
