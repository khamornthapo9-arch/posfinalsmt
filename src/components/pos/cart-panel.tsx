import { ChefHat, Minus, PauseCircle, Plus, Trash2 } from "lucide-react";
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
  heldCount?: number;
  onOpenHeld?: () => void;
  onOpenHistory?: () => void;
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
  items,
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
  heldCount = 0,
  onOpenHeld,
  onOpenHistory,
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
  const isCredit = payment === CREDIT_METHOD;
  const lineCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card">
      {/* Header with Cart Title + Text-only Held & History buttons */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">လက်ရှိ ရောင်းချမှု</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {lineCount}
          </span>
        </div>

        {/* Text-only Held & Record buttons (no icons) */}
        <div className="flex items-center gap-1.5">
          {onOpenHeld && (
            <button
              type="button"
              onClick={onOpenHeld}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              ဆိုင်းထား {heldCount > 0 && `(${heldCount})`}
            </button>
          )}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              မှတ်တမ်း
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <p className="text-sm">ဈေးဝယ်ခြင်းတောင်း လွတ်နေပါသည်</p>
            <p className="mt-1 text-xs">ဘယ်ဘက်မှ ကုန်ပစ္စည်းကို နှိပ်၍ ထည့်ပါ</p>
          </div>
        ) : (
          cart.map((line) => (
            <div key={`${line.item_id}-${line.unit_name ?? ""}`} className="flex items-center justify-between p-3 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate font-medium text-foreground">{line.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {money(line.unit_price, currencySymbol)} {line.unit_name ? `· ${line.unit_name}` : ""}
                </p>
              </div>

              {/* Quantity Changer */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, -1, line.unit_name)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-7 text-center font-bold text-foreground">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, 1, line.unit_name)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(line.item_id, line.unit_name)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals & Checkout */}
      <div className="shrink-0 border-t border-border bg-muted/20 p-3 space-y-2.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>စုစုပေါင်း</span>
          <span>{money(subtotal, currencySymbol)}</span>
        </div>
        {taxPercent > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>အခွန် ({taxPercent}%)</span>
            <span>{money(tax, currencySymbol)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border/80 pt-1.5 text-base font-bold text-foreground">
          <span>ကျသင့်ငွေ</span>
          <span className="text-primary">{money(total, currencySymbol)}</span>
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {payments.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPayment(p.id)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                payment === p.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Hold voucher or Pay */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={onPark}
            className="h-10 flex-1 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            ခဏဆိုင်းထားမည်
          </button>
          <button
            type="button"
            disabled={cart.length === 0 || busy}
            onClick={onComplete}
            className="h-10 flex-[2] rounded-md bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            စာရင်းထွက်မည် · {money(total, currencySymbol)}
          </button>
        </div>
      </div>
    </aside>
  );
}
