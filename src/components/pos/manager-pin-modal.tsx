import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/roles";

/**
 * Asks for a Manager/Owner PIN before a sensitive action (refund, price edit).
 * Calls `onApproved` only after the PIN is verified.
 */
export function ManagerPinModal({
  title = "မန်နေဂျာ ခွင့်ပြုချက် လိုအပ်သည်",
  onClose,
  onApproved,
}: {
  title?: string;
  onClose: () => void;
  onApproved: () => void;
}) {
  const { verifyManagerPin } = useRole();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setBusy(true);
    void verifyManagerPin(pin)
      .then((ok) => {
        if (!ok) {
          toast.error("PIN မမှန်ပါ");
          setPin("");
          return;
        }
        onApproved();
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> {title}
          </h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          autoFocus
          placeholder="PIN"
          aria-label="မန်နေဂျာ PIN"
          className="h-12 w-full rounded-lg border border-input bg-background text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          disabled={busy || pin.length < 4}
          onClick={submit}
          className="mt-4 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          အတည်ပြုမည်
        </button>
      </div>
    </div>
  );
}
