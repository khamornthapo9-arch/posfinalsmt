import { useEffect, useState } from "react";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { money } from "@/lib/pos-utils";
import { paymentStyle } from "@/lib/payment-style";
import { CREDIT_METHOD, type Customer } from "@/lib/accounting-store";
import type { CachedItem } from "@/lib/pos-db";

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
  payments: PaymentOption[];
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

function quickAmounts(due: number): number[] {
  if (due <= 0) return [];
  const set = new Set<number>();
  set.add(due);
  const magnitudes = [500, 1000, 5000, 10000, 50000];
  for (const step of magnitudes) {
    if (step > due) {
      set.add(step);
      break;
    }
  }
  for (const step of [1000, 5000, 10000, 50000]) {
    const next = Math.ceil(due / step) * step;
    if (next > due) set.add(next);
  }
  return Array.from(set).sort((a, b) => a - b).slice(0, 4);
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
  customer,
  busy,
  subtotal,
  tax,
  total,
  taxPercent,
  remaining,
  creditPortion,
  cashReceived,
  cashDue,
  cashShort,
  changeDue,
  digitalDue,
  digitalConfirmed,
  onCashReceivedChange,
  onDigitalConfirmedChange,
  onSetQty,
  onClear,
  onClearCustomer,
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
  const unitCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);

  useEffect(() => {
    if (cart.length === 0) {
      setConfirmClear(false);
    }
  }, [cart.length]);

  useEffect(() => {
    if (needsCreditCustomer) {
      setShowCustomer(true);
    }
  }, [needsCreditCustomer]);

  const splitInvalid =
    splitMode &&
    (Math.round(remaining * 100) !== 0 || Object.values(splits).some((amount) => amount < 0));

  const digitalUnconfirmed = digitalDue > 0 && !digitalConfirmed;

  const checkoutDisabled =
    cart.length === 0 ||
    busy ||
    splitInvalid ||
    needsCreditCustomer ||
    cashShort ||
    digitalUnconfirmed;

  const digitalMethods = payments.filter(
    (p) => p.id !== "ငွေသား" && p.id !== CREDIT_METHOD,
  );

  const activeDigital = splitMode
    ? digitalMethods.filter((p) => (splits[p.id] ?? 0) > 0).map((p) => p.label)
    : digitalMethods.filter((p) => p.id === payment).map((p) => p.label);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-cart">
      {/* Cart header */}
      <div className="flex shrink-0 items-center justify-between border-b border-cart-border bg-cart-header px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold">လက်ရှိ ရောင်းချမှု</span>
          <span data-cart-target className="inline-flex">
            <span
              key={unitCount}
              title="ရောင်းချမည့် ယူနစ် စုစုပေါင်း"
              className="badge-pop whitespace-nowrap rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tabular-nums"
            >
              {cart.length} မျိုး · {unitCount} ခု
            </span>
          </span>
        </div>

        {cart.length > 0 &&
          (confirmClear ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
                className="press min-h-8 touch:min-h-10 rounded-md bg-destructive px-2 text-xs font-semibold text-white"
              >
                ရှင်းမည်
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="press min-h-8 touch:min-h-10 rounded-md border border-border bg-background px-2 text-xs"
              >
                မလုပ်တော့ပါ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              aria-label="ဈေးဝယ်ခြင်းတောင်း ရှင်းလင်းရန်"
              className="press flex h-8 w-8 touch:h-10 touch:w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ))}
      </div>

      {/* Customer bar (Compact) */}
      <div className="shrink-0 border-b border-cart-border bg-background/50 px-3 py-1.5">
        {customer ? (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="font-semibold truncate">{customer.name}</span>
              {customer.phone && (
                <span className="text-[11px] text-muted-foreground truncate">({customer.phone})</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClearCustomer}
              className="press ml-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickCustomer}
            className="press flex w-full items-center justify-between rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <span className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              <span>ဝယ်သူ ရွေးချယ်ရန်</span>
            </span>
            <span className="text-[10px] text-primary font-semibold">+ ရွေးမည်</span>
          </button>
        )}
      </div>

      {/* Cart items: Priority scrollable area with independent scrolling */}
      <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 stroke-[1.25] text-muted-foreground/40" />
            <p className="mt-2 text-xs font-semibold">ပစ္စည်း မရှိသေးပါ</p>
            <p className="text-[11px]">ဘယ်ဘက်မှ ပစ္စည်းများကို နှိပ်၍ ထည့်ပါ</p>
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={`${line.item_id}-${line.unit_name ?? "base"}`}
              className="flex items-center justify-between gap-2 p-2.5 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{line.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="tabular-nums font-medium text-foreground">
                    {money(line.unit_price, currencySymbol)}
                  </span>
                  {line.unit_name && (
                    <span className="rounded bg-muted px-1 text-[10px]">{line.unit_name}</span>
                  )}
                </div>
              </div>

              {/* Quantity buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, -1, line.unit_name)}
                  aria-label={`${line.name} အရေအတွက် လျှော့ရန်`}
                  className="press flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      onSetQty(line.item_id, val, line.unit_name);
                    }
                  }}
                  className="h-7 w-10 rounded border border-input bg-card text-center text-xs font-semibold tabular-nums outline-none"
                />

                <button
                  type="button"
                  onClick={() => onChangeQty(line.item_id, 1, line.unit_name)}
                  aria-label={`${line.name} အရေအတွက် တိုးရန်`}
                  className="press flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onRemove(line.item_id, line.unit_name)}
                  aria-label={`${line.name} ဖယ်ရှားရန်`}
                  className="press ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compact Checkout Panel at the Bottom */}
      <div className="shrink-0 space-y-2 border-t border-cart-border bg-card/90 p-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-xs">
        {/* Subtotal & Tax */}
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>စုစုပေါင်း</span>
            <span className="tabular-nums">{money(subtotal, currencySymbol)}</span>
          </div>
          {taxPercent > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>အခွန် ({taxPercent}%)</span>
              <span className="tabular-nums">{money(tax, currencySymbol)}</span>
            </div>
          )}
        </div>

        {/* Total Due */}
        <div className="flex items-center justify-between border-t border-border/80 pt-1.5 font-bold text-foreground">
          <span className="text-sm">ကျသင့်ငွေ</span>
          <span key={total} className="badge-pop text-lg tabular-nums text-primary">
            {money(total, currencySymbol)}
          </span>
        </div>

        {/* Payment mode selector */}
        <div className="flex flex-wrap gap-1">
          {payments.map((p) => {
            const active = splitMode ? (splits[p.id] ?? 0) > 0 : payment === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => (splitMode ? onToggleSplit(p.id) : onSelectPayment(p.id))}
                className={cn(
                  "press flex-1 min-w-[70px] rounded-md border py-1.5 px-2 text-center text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Cash quick amounts & change */}
        {payment === "ငွေသား" && !splitMode && (
          <div className="space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">လက်ခံငွေ</span>
              <input
                type="text"
                inputMode="numeric"
                value={cashReceived}
                onChange={(e) => onCashReceivedChange(e.target.value)}
                className="h-8 w-28 rounded-md border border-input bg-card px-2 text-right text-xs font-semibold tabular-nums outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {quickAmounts(cashDue).map((amount, idx) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onCashReceivedChange(String(amount))}
                  className="press rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium hover:bg-accent"
                >
                  {idx === 0 ? "အတိအကျ" : money(amount, currencySymbol)}
                </button>
              ))}
            </div>
            {cashShort ? (
              <p className="text-[11px] font-medium text-destructive">လက်ခံရရှိငွေ မလောက်ပါ</p>
            ) : (
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">အမ်းငွေ</span>
                <span className="tabular-nums">{money(changeDue, currencySymbol)}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1.5 pt-1">
          <button
            type="button"
            disabled={cart.length === 0 || busy}
            onClick={onPark}
            className="press h-9 flex-1 rounded-md border border-border bg-background text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            ခဏဆိုင်း
          </button>
          <button
            type="button"
            disabled={checkoutDisabled}
            onClick={onComplete}
            className="press h-9 flex-[2] rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-btn hover:bg-primary/90 disabled:opacity-50"
          >
            စာရင်းထွက်မည် · {money(total, currencySymbol)}
          </button>
        </div>
      </div>
    </aside>
  );
}
