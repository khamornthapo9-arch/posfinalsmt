import { Minus, Plus, ShoppingCart, Trash2, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/pos-utils";
import { CREDIT_METHOD, type Customer } from "@/lib/accounting-store";
import type { CachedItem } from "@/lib/pos-db";
import type { PaymentSplit } from "@/lib/pos-store";

export interface CartLine {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit_name?: string | undefined;
  conversion?: number | undefined;
  stock?: number | undefined;
}

interface PaymentOption {
  id: string;
  label: string;
  logo?: string;
  tone: string;
}

interface CartPanelProps {
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
  payments: PaymentOption[];
  onChangeQty: (itemId: string, delta: number, unitName?: string) => void;
  onRemove: (itemId: string, unitName?: string) => void;
  onNotesChange: (value: string) => void;
  onSelectPayment: (methodId: string) => void;
  onToggleSplit: (methodId: string) => void;
  onSplitChange: (methodId: string, amount: number) => void;
  onToggleSplitMode: () => void;
  onPickCustomer: () => void;
  onPark: () => void;
  onComplete: () => void;
  onSendToKitchen: () => void;
  onPayAndClose: () => void;
}

export function CartPanel({
  cart,
  isRestaurant,
  activeTable,
  notes,
  payment,
  splitMode,
  splits,
  creditCustomer,
  busy,
  subtotal,
  tax,
  total,
  taxPercent,
  remaining,
  creditPortion,
  needsCreditCustomer,
  currencySymbol,
  payments,
  onChangeQty,
  onRemove,
  onNotesChange,
  onSelectPayment,
  onToggleSplit,
  onSplitChange,
  onToggleSplitMode,
  onPickCustomer,
  onPark,
  onComplete,
  onSendToKitchen,
  onPayAndClose,
}: CartPanelProps) {
  const lineCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const splitInvalid = splitMode && Math.abs(remaining) > 0.01;
  const checkoutDisabled = cart.length === 0 || busy || splitInvalid || needsCreditCustomer;

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card">
      {/* Header (ဆိုင်းငံ့နှင့် မှတ်တမ်းခလုတ်များကို Register စာမျက်နှာ ထိပ်သို့ ရွှေ့လိုက်ပါသည်) */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">လက်ရှိ ရောင်းချမှု</span>
          <span
            key={lineCount}
            className="badge-pop rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tabular-nums"
          >
            {lineCount}
          </span>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <div className="animate-fade-in flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-muted-foreground">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground/80">ဈေးဝယ်ခြင်းတောင်း လွတ်နေပါသည်</p>
            <p className="text-xs">ကုန်ပစ္စည်းကို နှိပ်၍ ထည့်ပါ</p>
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={`${line.item_id}-${line.unit_name ?? "base"}`}
              className="animate-line-in flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-6 text-foreground">{line.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {money(line.unit_price, currencySymbol)}
                  {line.unit_name ? ` · ${line.unit_name}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1 touch:gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, -1, line.unit_name)}
                  aria-label="အရေအတွက် လျှော့ရန်"
                  className="press flex h-9 w-9 touch:h-11 touch:w-11 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-foreground tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, 1, line.unit_name)}
                  aria-label="အရေအတွက် တိုးရန်"
                  className="press flex h-9 w-9 touch:h-11 touch:w-11 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(line.item_id, line.unit_name)}
                  aria-label="ဖယ်ရှားရန်"
                  className="press ml-0.5 flex h-9 w-9 touch:h-11 touch:w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals, Split Payment & Checkout */}
      <div className="shrink-0 space-y-2.5 border-t border-border bg-muted/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isRestaurant && (
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="မီးဖိုချောင် / စားပွဲ မှတ်ချက်..."
            className="h-9 touch:h-11 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
          />
        )}

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>စုစုပေါင်း</span>
          <span className="tabular-nums">{money(subtotal, currencySymbol)}</span>
        </div>

        {taxPercent > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>အခွန် ({taxPercent}%)</span>
            <span className="tabular-nums">{money(tax, currencySymbol)}</span>
          </div>
        )}

        <div className="flex items-baseline justify-between border-t border-border/80 pt-2 font-bold text-foreground">
          <span className="text-base">ကျသင့်ငွေ</span>
          <span key={total} className="badge-pop text-xl tabular-nums text-primary">
            {money(total, currencySymbol)}
          </span>
        </div>

        {/* Single Payment vs. Split Payment Toggle */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-medium text-muted-foreground">ငွေပေးချေမှု</span>
          <button
            type="button"
            onClick={onToggleSplitMode}
            aria-pressed={splitMode}
            className={cn(
              "press inline-flex min-h-8 touch:min-h-10 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
              splitMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {splitMode ? "ပုံမှန် ငွေရှင်းမည်" : "ခွဲပေးမည် (Split)"}
          </button>
        </div>

        {!splitMode ? (
          <div className="grid grid-cols-2 gap-2">
            {payments.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPayment(p.id)}
                aria-pressed={payment === p.id}
                className={cn(
                  "press flex h-10 touch:h-12 items-center justify-center rounded-md border text-sm font-semibold",
                  payment === p.id
                    ? "border-primary bg-primary text-primary-foreground shadow-btn"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-border bg-background p-2">
            {payments.map((p) => {
              const active = Object.prototype.hasOwnProperty.call(splits, p.id);
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleSplit(p.id)}
                    aria-pressed={active}
                    className={cn(
                      "press h-10 touch:h-12 flex-1 rounded-md border px-2.5 text-left text-sm font-medium",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    {p.label}
                  </button>
                  {active && (
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={splits[p.id] ?? 0}
                      onChange={(e) => onSplitChange(p.id, Number(e.target.value) || 0)}
                      aria-label={`${p.label} ပမာဏ`}
                      className="animate-fade-in h-10 touch:h-12 w-28 rounded-md border border-input bg-card px-2 text-right text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">ကျန်ငွေ (Remaining)</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  Math.abs(remaining) <= 0.01 ? "text-success" : "text-destructive",
                )}
              >
                {money(remaining, currencySymbol)}
              </span>
            </div>
          </div>
        )}

        {/* Credit Customer Selector */}
        {creditPortion > 0 && (
          <button
            type="button"
            onClick={onPickCustomer}
            className={cn(
              "press flex h-10 touch:h-12 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-sm font-medium",
              creditCustomer
                ? "border-border bg-background text-foreground hover:bg-accent"
                : "border-destructive/50 bg-destructive/10 text-destructive",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {creditCustomer
                  ? `${creditCustomer.name} (${creditCustomer.phone || "—"})`
                  : "အကြွေး ဖောက်သည် ရွေးပါ"}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold">ပြောင်းရန်</span>
          </button>
        )}

        {/* Hold or Complete Sale */}
        {isRestaurant && activeTable != null ? (
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              disabled={cart.length === 0 || busy}
              onClick={onSendToKitchen}
              className="press h-12 flex-1 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
            >
              ခေတ္တသိမ်းမည်
            </button>
            <button
              type="button"
              disabled={checkoutDisabled}
              onClick={onPayAndClose}
              className="press h-12 flex-[1.5] rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
            >
              ရှင်းပြီးပိတ်မည် · {money(total, currencySymbol)}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              disabled={cart.length === 0 || busy}
              onClick={onPark}
              className="press h-12 flex-1 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              ခဏဆိုင်းထားမည်
            </button>
            <button
              type="button"
              disabled={checkoutDisabled}
              onClick={onComplete}
              className="press h-12 flex-[2] rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
            >
              စာရင်းထွက်မည် · {money(total, currencySymbol)}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
