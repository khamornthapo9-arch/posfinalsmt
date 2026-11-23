import { useState } from "react";
import { X } from "lucide-react";
import type { Customer } from "@/lib/accounting-store";
import { Button } from "@/components/ui/button";

export interface CustomerFormValues {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-destructive";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneKey = (phone: string) => phone.replace(/\D/g, "");

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

/** Pure validation, so it can be reused and tested without rendering. */
export function validateCustomer(
  values: Omit<CustomerFormValues, "id">,
  existing: Customer[],
  selfId?: string,
): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "အမည် ထည့်ပါ";
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "အီးမေးလ် ပုံစံ မမှန်ပါ";
  }
  const key = phoneKey(values.phone);
  if (values.phone.trim() && key.length < 5) errors.phone = "ဖုန်းနံပါတ် မမှန်ပါ";
  else if (key) {
    const dup = existing.find((c) => c.id !== selfId && phoneKey(c.phone ?? "") === key);
    if (dup) {
      errors.phone = `ဤဖုန်းနံပါတ်ကို "${dup.name}" အတွက် သုံးပြီးဖြစ်သည်${dup.archived_at ? " (သိမ်းထား)" : ""}`;
    }
  }
  return errors;
}

/**
 * Create/edit customer. Bottom sheet on phones, centred dialog elsewhere; scrolls inside the
 * viewport so the keyboard never hides the save button.
 */
export function CustomerForm({
  customer,
  customers,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (values: CustomerFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (saving) return;
    const values = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      note: note.trim(),
    };
    const found = validateCustomer(values, customers, customer?.id);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    void onSave({ ...(customer ? { id: customer.id } : {}), ...values }).finally(() => setSaving(false));
  };

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { error?: string | undefined; type?: string; inputMode?: "tel" | "email"; required?: boolean } = {},
  ) => (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
        {opts.required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={id}
        type={opts.type ?? "text"}
        {...(opts.inputMode ? { inputMode: opts.inputMode } : {})}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={Boolean(opts.error)}
        aria-describedby={opts.error ? `${id}-err` : undefined}
        className={inputClass}
      />
      {opts.error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-destructive">
          {opts.error}
        </p>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={customer ? "ဖောက်သည် ပြင်ဆင်ရန်" : "ဖောက်သည် အသစ်"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 sm:items-center sm:px-4 sm:py-6"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl border border-border bg-card shadow-lg sm:rounded-md"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-sm font-semibold">{customer ? "ဖောက်သည် ပြင်ဆင်ရန်" : "ဖောက်သည် အသစ်"}</h2>
          <Button type="button" onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-2">
          {field("c-name", "အမည်", name, setName, { error: errors.name, required: true })}
          {field("c-phone", "ဖုန်းနံပါတ်", phone, setPhone, { error: errors.phone, inputMode: "tel" })}
          {field("c-email", "အီးမေးလ်", email, setEmail, { error: errors.email, type: "email", inputMode: "email" })}
          {field("c-address", "လိပ်စာ", address, setAddress)}
          {field("c-note", "မှတ်ချက်", note, setNote)}
        </div>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "သိမ်းနေသည်…" : "သိမ်းဆည်းမည်"}
          </Button>
        </div>
      </form>
    </div>
  );
}
