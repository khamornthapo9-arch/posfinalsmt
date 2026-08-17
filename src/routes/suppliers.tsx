import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins, PackageCheck, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import { useAccountingStore, PURCHASE_RECEIVED, type Supplier } from "@/lib/accounting-store";
import { usePos } from "@/lib/pos-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";
import { SettleModal } from "./customers";

export const Route = createFileRoute("/suppliers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ — SMT POS" },
      { name: "description", content: "ကုန်သွင်းသူများ၊ ဝယ်ယူမှု အော်ဒါများနှင့် ပေးရန်ကြွေးများကို စီမံပါ။" },
      { property: "og:title", content: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ — SMT POS" },
      { property: "og:description", content: "SMT POS ဝယ်ယူမှု စီမံခန့်ခွဲမှု။" },
    ],
  }),
  component: SuppliersPage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

function SuppliersPage() {
  const {
    enabled,
    suppliers,
    purchases,
    saveSupplier,
    deleteSupplier,
    createPurchase,
    receivePurchase,
    deletePurchase,
    paySupplierDebt,
  } = useAccountingStore();
  const { items } = usePos();
  const { fmt, isPro } = useStoreSettings();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [paying, setPaying] = useState<Supplier | null>(null);

  if (!enabled) {
    return (
      <PosShell title="ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ">
        <div className="p-4">
          <p className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
            ဤမော်ဂျူးကို အသုံးပြုရန် ပြုပြင်ခြင်းတွင် အဆင့်မြင့် စာရင်းကိုင် မုဒ်ကို ဖွင့်ပါ။
          </p>
        </div>
      </PosShell>
    );
  }

  return (
    <PosShell title="ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ" subtitle="ကုန်သွင်းသူ ကြွေးများနှင့် ဝယ်ယူမှု အော်ဒါများ">
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSupplierOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> ကုန်သွင်းသူ အသစ်
          </button>
          <button
            onClick={() => setPurchaseOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> ဝယ်ယူမှု အော်ဒါ
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ကုန်သွင်းသူ</th>
                <th className="px-4 py-3">ဖုန်း</th>
                <th className="px-4 py-3 text-right">ပေးရန် ကြွေး</th>
                <th className="px-4 py-3 text-right">လုပ်ဆောင်ချက်များ</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{supplier.phone ?? "—"}</td>
                  <td className={cn("px-4 py-3 text-right tabular-nums", supplier.balance > 0 && "font-semibold text-destructive")}>
                    {fmt(supplier.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setPaying(supplier)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
                      >
                        <HandCoins className="h-3.5 w-3.5" /> ငွေပေးမည်
                      </button>
                      <button
                        onClick={() => void deleteSupplier(supplier.id)}
                        aria-label="ဖျက်ရန်"
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    ကုန်သွင်းသူ စာရင်း မရှိသေးပါ။
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">ဝယ်ယူမှု အော်ဒါများ</h2>
          {purchases.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              ဝယ်ယူမှု မှတ်တမ်း မရှိသေးပါ။
            </p>
          )}
          {purchases.map((purchase) => {
            const supplier = suppliers.find((s) => s.id === purchase.supplier_id);
            return (
              <div key={purchase.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{supplier?.name ?? "ကုန်သွင်းသူ မသတ်မှတ်"}</p>
                    <p className="text-xs text-muted-foreground">
                      {purchase.created_at.slice(0, 10)} · {purchase.status} · {fmt(purchase.total_amount)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {purchase.status !== PURCHASE_RECEIVED && (
                      <button
                        onClick={() => {
                          void receivePurchase(purchase.id).then(() => toast.success("ကုန်ပစ္စည်း လက်ခံရရှိပြီးပါပြီ"));
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> ရရှိပြီး
                      </button>
                    )}
                    <button
                      onClick={() => void deletePurchase(purchase.id)}
                      aria-label="ဖျက်ရန်"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {purchase.lines.map((line, i) => (
                    <li key={i}>
                      {line.name || "—"} × {line.quantity} @ {fmt(line.unit_cost)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {supplierOpen && (
        <SupplierModal
          onClose={() => setSupplierOpen(false)}
          onSave={async (values) => {
            if (!isPro && suppliers.length >= FREE_LIMITS.suppliers) {
              toast.error(`Standard အစီအစဉ်တွင် ကုန်သွင်းသူ ${FREE_LIMITS.suppliers} ဦးသာ သိမ်းနိုင်သည်`);
              return;
            }
            await saveSupplier(values);
            setSupplierOpen(false);
            toast.success("ကုန်သွင်းသူကို သိမ်းဆည်းပြီးပါပြီ");
          }}
        />
      )}
      {purchaseOpen && (
        <PurchaseModal
          suppliers={suppliers}
          items={items.map((i) => ({ id: i.id, name: i.name, cost: i.cost_price }))}
          onClose={() => setPurchaseOpen(false)}
          onSave={async (values) => {
            await createPurchase(values);
            setPurchaseOpen(false);
            toast.success("ဝယ်ယူမှု အော်ဒါကို မှတ်တမ်းတင်ပြီးပါပြီ");
          }}
        />
      )}
      {paying && isPro && (
        <SettleModal
          title={`${paying.name} — ငွေပေးချေခြင်း`}
          balance={paying.balance}
          fmt={fmt}
          onClose={() => setPaying(null)}
          onConfirm={async (amount, method) => {
            await paySupplierDebt({ supplierId: paying.id, amount, method });
            setPaying(null);
            toast.success("ငွေပေးချေမှုကို မှတ်တမ်းတင်ပြီးပါပြီ");
          }}
        />
      )}
    </PosShell>
  );
}

function SupplierModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (values: { name: string; phone: string; note: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">ကုန်သွင်းသူ အသစ်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="s-name">အမည်</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="s-phone">ဖုန်းနံပါတ်</label>
            <input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="s-note">မှတ်ချက်</label>
            <input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          disabled={busy || !name.trim()}
          onClick={() => {
            setBusy(true);
            void onSave({ name: name.trim(), phone: phone.trim(), note: note.trim() }).finally(() => setBusy(false));
          }}
          className="mt-5 h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          သိမ်းဆည်းမည်
        </button>
      </div>
    </div>
  );
}

function PurchaseModal({
  suppliers,
  items,
  onClose,
  onSave,
}: {
  suppliers: Supplier[];
  items: { id: string; name: string; cost: number }[];
  onClose: () => void;
  onSave: (values: {
    supplierId: string | null;
    lines: { item_id: string; quantity: number; unit_cost: number }[];
    amountPaid: number;
    notes: string;
  }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? "");
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState(String(items[0]?.cost ?? 0));
  const [lines, setLines] = useState<{ item_id: string; quantity: number; unit_cost: number }[]>([]);
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">ဝယ်ယူမှု အော်ဒါ အသစ်</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="p-supplier">ကုန်သွင်းသူ</label>
            <select id="p-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">— မသတ်မှတ် —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className={labelClass} htmlFor="p-item">ကုန်ပစ္စည်း</label>
              <select
                id="p-item"
                value={itemId}
                onChange={(e) => {
                  setItemId(e.target.value);
                  const found = items.find((i) => i.id === e.target.value);
                  if (found) setCost(String(found.cost));
                }}
                className={inputClass}
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="p-qty">အရေအတွက်</label>
              <input id="p-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="p-cost">အရင်းစျေး</label>
              <input id="p-cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
            </div>
            <div className="flex items-end">
              <button
                disabled={!itemId}
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    { item_id: itemId, quantity: Math.trunc(Number(qty) || 1), unit_cost: Number(cost) || 0 },
                  ])
                }
                className="h-11 w-full rounded-md border border-border text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                စာရင်းထည့်မည်
              </button>
            </div>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            {lines.map((line, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{items.find((it) => it.id === line.item_id)?.name} × {line.quantity}</span>
                <button
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="ဖျက်ရန"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div>
            <label className={labelClass} htmlFor="p-paid">ပေးချေပြီး ပမာဏ</label>
            <input id="p-paid" type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="p-notes">မှတ်ချက်</label>
            <input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          disabled={busy || lines.length === 0}
          onClick={() => {
            setBusy(true);
            void onSave({
              supplierId: supplierId || null,
              lines,
              amountPaid: Number(amountPaid) || 0,
              notes: notes.trim(),
            }).finally(() => setBusy(false));
          }}
          className="mt-5 h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          သိမ်းဆည်းမည် ({total.toFixed(2)})
        </button>
      </div>
    </div>
  );
}
