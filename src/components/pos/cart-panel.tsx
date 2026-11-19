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
  const fmt = (n: number) => money(n, currencySymbol);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          {isRestaurant ? `စားပွဲ ${activeTable} အော်ဒါ` : "လက်ရှိ ရောင်းချမှု"}
        </h2>
        <span className="text-xs text-muted-foreground">{cart.length} မျိုး</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">ဈေးဝယ်ခြင်းတောင်း လွတ်နေပါသည်</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {cart.map((line) => {
              const item = items.find((i) => i.id === line.item_id);
              const stock = item?.stock_quantity ?? line.stock ?? 0;
              const unitKey = line.unit_name ?? "base";
              return (
                <div
                  key={`${line.item_id}:${unitKey}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-6">{line.name}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {fmt(line.unit_price)} / {line.unit_name ?? "အရပ်"} · ကျန် {stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onChangeQty(line.item_id, -1, unitKey)}
                      aria-label="အရေအတွက် လျှော့ရန်"
                      className="press grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-accent"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => onChangeQty(line.item_id, 1, unitKey)}
                      aria-label="အရေအတွက် တိုးရန်"
                      className="press grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-accent"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">
                    {fmt(line.quantity * line.unit_price)}
                  </span>
                  <button
                    onClick={() => onRemove(line.item_id, unitKey)}
                    aria-label={`${line.name} ကို ဖျက်ရန်`}
                    className="ml-1 grid h-8 w-8 place-items-center rounded-md border-l border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-4">
        {isRestaurant && (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              မီးဖိုချောင် မှတ်ချက်
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="ကြက်သွန်မပါ၊ အစပ်ကဲ…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <div className="mb-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>စုစုပေါင်း</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>အခွန် ({taxPercent}%)</span>
            <span className="tabular-nums">{fmt(tax)}</span>
          </div>
          <div className="mt-2 flex items-end justify-between border-t border-border pt-2.5">
            <span className="text-sm font-semibold leading-7">ကျသင့်ငွေ</span>
            <span className="text-2xl font-bold leading-8 tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">ငွေခွဲပေးမည်</span>
          <button
            role="switch"
            aria-checked={splitMode}
            aria-label="ငွေခွဲပေးမည်"
            onClick={onToggleSplitMode}
            className={cn(
              "press relative h-6 w-11 rounded-full transition-colors",
              splitMode ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all",
                splitMode ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {payments.map((method) => {
            const active = splitMode ? (splits[method.id] ?? 0) > 0 : payment === method.id;
            return (
              <div key={method.id} className="space-y-1">
                <button
                  onClick={() => (splitMode ? onToggleSplit(method.id) : onSelectPayment(method.id))}
                  className={cn(
                    "press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {method.logo && (
                    <img
                      src={method.logo}
                      alt={`${method.label} logo`}
                      className="h-4 w-4 rounded-xs bg-card object-contain p-px"
                    />
                  )}
                  {method.label}
                </button>
                {splitMode && (
                  <input
                    value={splits[method.id] ?? ""}
                    onChange={(e) => onSplitChange(method.id, Number(e.target.value) || 0)}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`${method.label} ပမာဏ`}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            );
          })}
        </div>

        {splitMode && (
          <div
            className={cn(
              "mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold",
              remaining === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            <span>ကျန်ငွေ</span>
            <span className="tabular-nums">{fmt(remaining)}</span>
          </div>
        )}

        {creditPortion > 0 && (
          <div
            className={cn(
              "mb-3 rounded-md border px-3 py-2 text-xs",
              needsCreditCustomer
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-muted/40",
            )}
          >
            <p className="mb-1 font-medium">အကြွေး {fmt(creditPortion)} — ဖောက်သည် ရွေးရန် လိုအပ်သည်</p>
            {creditCustomer ? (
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{creditCustomer.name}</span>{" "}
                  <span className="text-muted-foreground">{creditCustomer.phone ?? ""}</span>
                </span>
                <button onClick={onPickCustomer} className="shrink-0 text-primary underline">
                  ပြောင်းရန်
                </button>
              </div>
            ) : (
              <button onClick={onPickCustomer} className="text-primary underline">
                ဖောက်သည် ရွေးပါ
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {isRestaurant ? (
            <>
              <button
                onClick={onSendToKitchen}
                disabled={cart.length === 0 || busy}
                className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                <ChefHat className="h-4 w-4" /> ခေတ္တသိမ်း / မီးဖိုချောင်သို့ပို့ရန်
              </button>
              <button
                onClick={onPayAndClose}
                disabled={cart.length === 0 || busy}
                className="press h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "လုပ်ဆောင်နေသည်…" : `ငွေရှင်းပြီး စားပွဲပိတ်မည် · ${fmt(total)}`}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onPark}
                disabled={cart.length === 0 || busy}
                className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-card text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
              >
                <PauseCircle className="h-4 w-4" /> ခဏဆိုင်းထားမည်
              </button>
              <button
                onClick={onComplete}
                disabled={cart.length === 0 || busy || needsCreditCustomer || (splitMode && remaining !== 0)}
                className="press h-14 w-full rounded-md bg-primary text-base font-bold tabular-nums text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {busy ? "လုပ်ဆောင်နေသည်…" : `စာရင်းတွက်မည် · ${fmt(total)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
