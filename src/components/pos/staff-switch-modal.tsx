import { useState } from "react";
import { Loader2, LogIn, X } from "lucide-react";
import { toast } from "sonner";
import { useRole, ROLE_LABEL } from "@/lib/roles";

/** PIN pad that switches the active staff member (and therefore page access). */
export function StaffSwitchModal({ onClose }: { onClose: () => void }) {
  const { switchStaffByPin, clearActiveStaff, activeStaff } = useRole();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pin.length < 4) {
      toast.error("PIN ဂဏန်း ၄ လုံး အနည်းဆုံး ထည့်ပါ");
      return;
    }
    setBusy(true);
    try {
      const staff = await switchStaffByPin(pin);
      toast.success(`${staff.name} · ${ROLE_LABEL[staff.role]} အဖြစ် ဝင်ရောက်ပြီးပါပြီ`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PIN မမှန်ပါ");
    } finally {
      setBusy(false);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">ဝန်ထမ်း ပြောင်းရန် (PIN)</h2>
          <button onClick={onClose} aria-label="ပိတ်ရန်" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          value={pin}
          maxLength={6}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="••••"
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === "C") setPin("");
                else if (key === "⌫") setPin((p) => p.slice(0, -1));
                else setPin((p) => (p.length < 6 ? p + key : p));
              }}
              className="h-11 rounded-lg border border-border text-sm font-semibold hover:bg-accent active:scale-95"
            >
              {key}
            </button>
          ))}
        </div>
        <button
          disabled={busy}
          onClick={() => void submit()}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          ဝင်ရောက်မည်
        </button>
        {activeStaff && (
          <button
            onClick={() => {
              clearActiveStaff();
              toast.success("ကိုယ်ပိုင် အကောင့်သို့ ပြန်ပြောင်းပြီးပါပြီ");
              onClose();
            }}
            className="mt-2 h-9 w-full rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            ကိုယ်ပိုင် အကောင့်သို့ ပြန်သွားမည်
          </button>
        )}
      </div>
    </div>
  );
}
