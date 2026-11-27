import { ShoppingCart } from "lucide-react";
import { money } from "@/lib/pos-utils";
import type { CartLine } from "./cart-panel";

interface MobileCheckoutBarProps {
  cart: CartLine[];
  total: number;
  currencySymbol: string;
  onCheckout: () => void;
}

export function MobileCheckoutBar({
  cart,
  total,
  currencySymbol,
  onCheckout,
}: MobileCheckoutBarProps) {
  const fmt = (n: number) => money(n, currencySymbol);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="flex items-center gap-3 border-t border-cart-border bg-cart/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-dock backdrop-blur-md supports-[backdrop-filter]:bg-cart/90">
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
        <p className="truncate text-lg font-bold leading-7 tabular-nums tracking-tight sm:text-xl">
          {fmt(total)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="press h-12 min-h-12 min-w-[8.5rem] shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-btn hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none touch:h-14 touch:min-h-14 touch:min-w-[9.5rem] touch:text-base"
      >
        Checkout
      </button>
    </div>
  );
}
