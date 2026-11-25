/**
 * Colour per payment method. Each register payment has a `tone` key (see PAYMENTS in
 * routes/register.tsx); the colours themselves are theme tokens in styles.css (`--pay-*`), so they
 * follow light/dark mode. Class names are written out in full so Tailwind can see them.
 *
 *   cash   -> green
 *   kbz    -> blue   (KBZ Pay)
 *   wave   -> yellow (Wave Pay, dark text on the fill)
 *   credit -> rose   (customer credit / အကြွေး)
 */
export type PaymentTone = "cash" | "kbz" | "wave" | "credit";

export interface PaymentStyle {
  /** Not selected: soft tinted tile with a coloured outline. */
  idle: string;
  /** Selected: solid colour fill with a ring. */
  active: string;
}

const STYLES: Record<PaymentTone, PaymentStyle> = {
  cash: {
    idle: "border-pay-cash-border bg-pay-cash-soft text-pay-cash-ink hover:border-pay-cash",
    active:
      "border-pay-cash bg-pay-cash text-pay-cash-foreground shadow-btn ring-2 ring-pay-cash/30",
  },
  kbz: {
    idle: "border-pay-kbz-border bg-pay-kbz-soft text-pay-kbz-ink hover:border-pay-kbz",
    active: "border-pay-kbz bg-pay-kbz text-pay-kbz-foreground shadow-btn ring-2 ring-pay-kbz/30",
  },
  wave: {
    idle: "border-pay-wave-border bg-pay-wave-soft text-pay-wave-ink hover:border-pay-wave",
    active:
      "border-pay-wave bg-pay-wave text-pay-wave-foreground shadow-btn ring-2 ring-pay-wave/40",
  },
  credit: {
    idle: "border-pay-credit-border bg-pay-credit-soft text-pay-credit-ink hover:border-pay-credit",
    active:
      "border-pay-credit bg-pay-credit text-pay-credit-foreground shadow-btn ring-2 ring-pay-credit/30",
  },
};

/** Unknown / future payment methods keep the neutral brand look. */
const FALLBACK: PaymentStyle = {
  idle: "border-border bg-card text-foreground hover:bg-accent",
  active: "border-primary bg-primary text-primary-foreground shadow-btn ring-2 ring-primary/30",
};

export function paymentStyle(tone: string | undefined): PaymentStyle {
  return (tone && (STYLES as Record<string, PaymentStyle>)[tone]) || FALLBACK;
}
