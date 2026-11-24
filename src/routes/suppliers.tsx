import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, HandCoins, PackageCheck, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FREE_LIMITS } from "@/lib/subscription";
import { PosShell } from "@/components/pos/pos-shell";
import {
  useAccountingStore,
  canReceiveLegacy,
  PURCHASE_DRAFT,
  PURCHASE_ORDERED,
  type Purchase,
  type Supplier,
} from "@/lib/accounting-store";
import { usePos } from "@/lib/pos-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { cn } from "@/lib/utils";
import { SettleModal } from "./customers";

export const Route = createFileRoute("/suppliers")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ — SMT POS" },
      { name: "description", content: "ကုန်သွင်းသူများ၊ ဝယ်ယူမှု အော်ဒါများနှင့် ပေးရန်ကြွေးများကို စီမံပါ။" },
      { property: "og:title", content: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ — SMT POS" },
      { property: "og:description", content: "SMT POS ဝယ်ယူမှု စီမံခန့်ခွဲမှု။" },
    ],
  }),
  component: SuppliersPage,
});

const PURCHASE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "မူကြမ်း", color: "bg-muted text-muted-foreground" },
  ORDERED: { label: "အော်ဒါတင်ပြီး", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  စောင့်ဆိုင်းဆဲ: { label: "စောင့်ဆိုင်းဆဲ", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  PARTIALLY_RECEIVED: { label: "တစ်စိတ်တစ်ပိုင်း ရရှိပြီး", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  ရရှိပြီး: { label: "ရရှိပြီး", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  RECEIVED: { label: "ရရှိပြီး", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  CANCELLED: { label: "ပယ်ဖျက်ပြီး", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

// Unknown or missing statuses must never crash the list: show the raw value in a neutral badge.
const unknownStatusMeta = (status: string) => ({
  label: status || "—",
  color: "bg-muted text-muted-foreground",
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
    updateDraftPurchase,
    confirmPurchase,
    receivePurchase,
    deletePurchase,
    paySupplierDebt,
  } = useAccountingStore();
  const { items } = usePos();
  const { fmt, isPro } = useStoreSettings();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Purchase | null>(null);
  const [paying, setPaying] = useState<Supplier | null>(null);

  if (!enabled) {
    return (
      <PosShell title="ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ">
        <div className="p-4">
          <p className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
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
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> ကုန်သွင်းသူ အသစ်
          </button>
          <button
            onClick={() => {
              setEditingDraft(null);
              setPurchaseOpen(true);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> ဝယ်ယူမှု အော်ဒါ
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
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
            <p className="rounded-md border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              ဝယ်ယူမှု မှတ်တမ်း မရှိသေးပါ။
            </p>
          )}
          {purchases.map((purchase) => {
            const supplier = suppliers.find((s) => s.id === purchase.supplier_id);
            const statusMeta = PURCHASE_STATUS_LABEL[purchase.status] ?? unknownStatusMeta(purchase.status);
            const isDraft = purchase.status === PURCHASE_DRAFT;
            return (
              <div key={purchase.id} className="rounded-md border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{supplier?.name ?? "ကုန်သွင်းသူ မသတ်မှတ်"}</p>
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium border", statusMeta.color)}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {purchase.created_at.slice(0, 10)} · {statusMeta.label} · {fmt(purchase.total_amount)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {isDraft && (
                      <>
                        <button
                          onClick={() => setEditingDraft(purchase)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" /> ပြင်ရန်
                        </button>
                        <button
                          disabled={purchase.lines.length === 0}
                          onClick={() => {
                            void confirmPurchase(purchase.id)
                              .then(() => toast.success("အော်ဒါကို အတည်ပြုပြီးပါပြီ"))
                              .catch(() => toast.error("အတည်မပြုနိုင်ပါ — ထပ်ကြိုးစားပါ"));
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" /> အတည်ပြုမည်
                        </button>
                      </>
                    )}
                    {canReceiveLegacy(purchase.status) && (
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
                      {line.name || "—"} × {line.quantity} {line.unit_name ? `(${line.unit_name})` : "ခု"} @ {fmt(line.unit_cost)}
                      {line.conversion && line.conversion > 1 && (
                        <span className="ml-1 text-[11px] text-muted-foreground/80">
                          (စုစုပေါင်း {line.quantity * line.conversion} ခု)
                        </span>
                      )}
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
      {(purchaseOpen || editingDraft) && (
        <PurchaseModal
          initial={editingDraft}
          suppliers={suppliers}
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            cost: i.cost_price,
            units: i.units || [],
          }))}
          onClose={() => {
            setPurchaseOpen(false);
            setEditingDraft(null);
          }}
          onSave={async ({ status, ...values }) => {
            if (editingDraft) {
              await updateDraftPurchase({
                purchaseId: editingDraft.id,
                ...values,
                confirm: status === PURCHASE_ORDERED,
              });
            } else {
              await createPurchase({ status, ...values });
            }
            setPurchaseOpen(false);
            setEditingDraft(null);
            toast.success(
              status === PURCHASE_DRAFT
                ? "မူကြမ်းကို သိမ်းဆည်းပြီးပါပြီ"
                : "ဝယ်ယူမှု အော်ဒါကို အတည်ပြုပြီးပါပြီ",
            );
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
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg">
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
          className="mt-5 h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          သိမ်းဆည်းမည်
        </button>
      </div>
    </div>
  );
}

interface PurchaseItemOption {
  id: string;
  name: string;
  cost: number;
  units: { id?: string; unit_name: string; conversion: number; price?: number }[];
}

function PurchaseModal({
  initial,
  suppliers,
  items,
  onClose,
  onSave,
}: {
  /** A draft being reopened for editing; null/undefined starts a new order. */
  initial?: Purchase | null;
  suppliers: Supplier[];
  items: PurchaseItemOption[];
  onClose: () => void;
  onSave: (values: {
    status: typeof PURCHASE_DRAFT | typeof PURCHASE_ORDERED;
    supplierId: string | null;
    lines: {
      item_id: string;
      quantity: number;
      unit_cost: number;
      unit_name?: string | null;
      conversion: number;
    }[];
    amountPaid: number;
    notes: string;
  }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState<string>(
    initial ? (initial.supplier_id ?? "") : (suppliers[0]?.id ?? ""),
  );
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? "");
  const [selectedUnitName, setSelectedUnitName] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState(String(items[0]?.cost ?? 0));
  const [lines, setLines] = useState<{
    item_id: string;
    name: string;
    quantity: number;
    unit_cost: number;
    unit_name?: string | null;
    conversion: number;
  }[]>(
    (initial?.lines ?? []).map((l) => ({
      item_id: l.item_id,
      name: l.name ?? "",
      quantity: l.quantity,
      unit_cost: l.unit_cost,
      unit_name: l.unit_name ?? null,
      conversion: l.conversion ?? 1,
    })),
  );
  const [amountPaid, setAmountPaid] = useState(String(initial?.amount_paid ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const currentItem = items.find((i) => i.id === itemId);
  const currentUnits = currentItem?.units || [];
  const selectedUnit = currentUnits.find((u) => u.unit_name === selectedUnitName);
  const conversion = selectedUnit ? selectedUnit.conversion : 1;

  // Auto-update default unit cost when item or unit changes
  const handleItemChange = (newItemId: string) => {
    setItemId(newItemId);
    setSelectedUnitName("");
    const found = items.find((i) => i.id === newItemId);
    setCost(String(found?.cost ?? 0));
  };

  const handleUnitChange = (unitName: string) => {
    setSelectedUnitName(unitName);
    const u = currentUnits.find((unit) => unit.unit_name === unitName);
    const conv = u ? u.conversion : 1;
    const baseCost = currentItem?.cost ?? 0;
    setCost(String(baseCost * conv));
  };

  const addLine = () => {
    if (!currentItem) return;
    const quantityNum = Math.trunc(Number(qty) || 1);
    const unitCostNum = Number(cost) || 0;
    setLines((prev) => [
      ...prev,
      {
        item_id: currentItem.id,
        name: currentItem.name,
        quantity: quantityNum,
        unit_cost: unitCostNum,
        unit_name: selectedUnitName || null,
        conversion: conversion,
      },
    ]);
    setQty("1");
  };

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  // One in-flight save at a time; failures keep the dialog open so nothing typed is lost.
  const submit = (status: typeof PURCHASE_DRAFT | typeof PURCHASE_ORDERED) => {
    if (busy) return;
    setBusy(true);
    void onSave({
      status,
      supplierId: supplierId || null,
      lines,
      amountPaid: Number(amountPaid) || 0,
      notes: notes.trim(),
    })
      .catch(() => toast.error("မသိမ်းနိုင်ပါ — ထပ်ကြိုးစားပါ"))
      .finally(() => setBusy(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-md border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{initial ? "မူကြမ်း အော်ဒါ ပြင်ရန်" : "ဝယ်ယူမှု အော်ဒါ အသစ်"}</h2>
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

          <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="p-item">ကုန်ပစ္စည်း</label>
                <select id="p-item" value={itemId} onChange={(e) => handleItemChange(e.target.value)} className={inputClass}>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="p-unit">ဝယ်ယူသည့် ယူနစ်</label>
                <select id="p-unit" value={selectedUnitName} onChange={(e) => handleUnitChange(e.target.value)} className={inputClass}>
                  <option value="">အခြေခံယူနစ် (၁ ခု)</option>
                  {currentUnits.map((u) => (
                    <option key={u.unit_name} value={u.unit_name}>
                      {u.unit_name} ({u.conversion} ခုပါ)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="p-qty">အရေအတွက်</label>
                <input id="p-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="p-cost">ဝယ်ယူသည့် ယူနစ်စျေး</label>
                <input id="p-cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={!itemId}
                  onClick={addLine}
                  className="h-11 w-full rounded-md border border-border bg-background text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  + ထည့်မည်
                </button>
              </div>
            </div>

            {conversion > 1 && (
              <p className="text-[11px] text-muted-foreground">
                စုစုပေါင်း အခြေခံအရေအတွက်: <span className="font-semibold text-foreground">{(Number(qty) || 0) * conversion} ခု</span> (အခြေခံ ၁ ခုလျှင် အရင်း {(Number(cost) / conversion).toFixed(2)} Ks)
              </p>
            )}
          </div>

          {lines.length > 0 && (
            <div className="rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">ပစ္စည်း</th>
                    <th className="px-3 py-2 text-center">အရေအတွက်</th>
                    <th className="px-3 py-2 text-right">ယူနစ်စျေး</th>
                    <th className="px-3 py-2 text-right">စုစုပေါင်း</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {l.name}
                        {l.unit_name && <span className="ml-1 text-[10px] text-muted-foreground">({l.unit_name})</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{l.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.unit_cost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{(l.quantity * l.unit_cost).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="p-paid">ကြိုတင်ပေးငွေ</label>
              <input
                id="p-paid"
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="p-notes">မှတ်ချက်</label>
              <input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-right">
            <span className="text-xs text-muted-foreground">ကျသင့်ငွေ စုစုပေါင်း: </span>
            <span className="text-base font-bold tabular-nums">{total.toLocaleString()} Ks</span>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(PURCHASE_DRAFT)}
            className="h-12 rounded-md border border-border bg-background text-sm font-semibold hover:bg-accent disabled:opacity-50"
          >
            မူကြမ်းအဖြစ် သိမ်းမည်
          </button>
          <button
            type="button"
            disabled={busy || lines.length === 0}
            onClick={() => submit(PURCHASE_ORDERED)}
            className="h-12 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            အော်ဒါ အတည်ပြုမည်
          </button>
        </div>
      </div>
    </div>
  );
}
