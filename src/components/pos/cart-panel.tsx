import { Minus, Plus, Trash2, UserCheck, Users } from "lucide-react";
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
          <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tabular-nums">
            {lineCount}
          </span>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <p className="text-sm">ဈေးဝယ်ခြင်းတောင်း လွတ်နေပါသည်</p>
            <p className="mt-1 text-xs">ဘယ်ဘက်မှ ကုန်ပစ္စည်းကို နှိပ်၍ ထည့်ပါ</p>
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={`${line.item_id}-${line.unit_name ?? "base"}`}
              className="flex items-center justify-between p-3 text-xs"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate font-medium text-foreground">{line.name}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {money(line.unit_price, currencySymbol)}
                  {line.unit_name ? ` · ${line.unit_name}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, -1, line.unit_name)}
                  aria-label="အရေအတွက် လျှော့ရန်"
                  className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-background hover:bg-accent"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-7 text-center font-bold text-foreground tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, 1, line.unit_name)}
                  aria-label="အရေအတွက် တိုးရန်"
                  className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-background hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(line.item_id, line.unit_name)}
                  aria-label="ဖယ်ရှားရန်"
                  className="ml-1 rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals, Split Payment & Checkout */}
      <div className="shrink-0 space-y-2.5 border-t border-border bg-muted/20 p-3">
        {isRestaurant && (
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="မီးဖိုချောင် / စားပွဲ မှတ်ချက်..."
            className="h-8 w-full rounded-sm border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>စုစုပေါင်း</span>
          <span className="tabular-nums">{money(subtotal, currencySymbol)}</span>
        </div>

        {taxPercent > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>အခွန် ({taxPercent}%)</span>
            <span className="tabular-nums">{money(tax, currencySymbol)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-border/80 pt-1.5 text-base font-bold text-foreground">
          <span>ကျသင့်ငွေ</span>
          <span className="tabular-nums text-primary">{money(total, currencySymbol)}</span>
        </div>

        {/* Single Payment vs. Split Payment Toggle */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] font-medium text-muted-foreground">ငွေပေးချေမှု</span>
          <button
            type="button"
            onClick={onToggleSplitMode}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold transition-colors",
              splitMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3 w-3" />
            {splitMode ? "ပုံမှန် ငွေရှင်းမည်" : "ခွဲပေးမည် (Split)"}
          </button>
        </div>

        {!splitMode ? (
          <div className="grid grid-cols-2 gap-1.5">
            {payments.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPayment(p.id)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-sm border text-xs font-semibold transition-colors",
                  payment === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 rounded-sm border border-border bg-background p-2">
            {payments.map((p) => {
              const active = Object.prototype.hasOwnProperty.call(splits, p.id);
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleSplit(p.id)}
                    className={cn(
                      "h-8 flex-1 rounded-sm border px-2 text-left text-xs font-medium transition-colors",
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
                      min={0}
                      step="any"
                      value={splits[p.id] ?? 0}
                      onChange={(e) => onSplitChange(p.id, Number(e.target.value) || 0)}
                      aria-label={`${p.label} ပမာဏ`}
                      className="h-8 w-28 rounded-sm border border-input bg-card px-2 text-right text-xs font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-[11px]">
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
              "flex h-9 w-full items-center justify-between rounded-sm border px-2.5 text-xs font-medium transition-colors",
              creditCustomer
                ? "border-border bg-background text-foreground hover:bg-accent"
                : "border-destructive/50 bg-destructive/10 text-destructive",
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              {creditCustomer
                ? `${creditCustomer.name} (${creditCustomer.phone || "—"})`
                : "အကြွေး ဖောက်သည် ရွေးပါ"}
            </span>
            <span className="text-[11px] font-semibold">ပြောင်းရန်</span>
          </button>
        )}

        {/* Hold or Complete Sale */}
        {isRestaurant && activeTable != null ? (
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              disabled={cart.length === 0 || busy}
              onClick={onSendToKitchen}
              className="h-10 flex-1 rounded-sm border border-border bg-background text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
            >
              ခေတ္တသိမ်းမည်
            </button>
            <button
              type="button"
              disabled={checkoutDisabled}
              onClick={onPayAndClose}
              className="h-10 flex-[1.5] rounded-sm bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
              className="h-10 flex-1 rounded-sm border border-border bg-background text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              ခဏဆိုင်းထားမည်
            </button>
            <button
              type="button"
              disabled={checkoutDisabled}
              onClick={onComplete}
              className="h-10 flex-[2] rounded-sm bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              စာရင်းထွက်မည် · {money(total, currencySymbol)}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
