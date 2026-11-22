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
    <div className="flex items-center gap-3 border-t border-border bg-card px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-dock">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {/* Landing spot for the fly-to-cart effect on phones */}
          <span data-cart-target className="inline-flex">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          </span>
          <span key={count} className="badge-pop inline-block tabular-nums">
            {count}
          </span>{" "}
          ခု
        </p>
        <p className="truncate text-lg font-bold leading-7 tabular-nums">{fmt(total)}</p>
      </div>
      <button
        type="button"
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="press h-12 min-w-32 shrink-0 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none"
      >
        Checkout
      </button>
    </div>
  );
}
