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
    <div className="flex items-center gap-3 border-t border-border bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span className="tabular-nums">{count}</span> ခု
        </p>
        <p className="truncate text-lg font-bold leading-7 tabular-nums">{fmt(total)}</p>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="h-12 shrink-0 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        Checkout
      </button>
    </div>
  );
}
