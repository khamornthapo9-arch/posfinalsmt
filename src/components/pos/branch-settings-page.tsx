import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, LogOut, Receipt, Store } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

/**
 * Cut-down settings screen for a branch shop login: only the receipt/voucher
 * template is editable here, plus the shift clock and sign-out. Everything
 * else (plan, staff, business info, suppliers, Telegram) stays owner-only.
 */
export function BranchSettingsPage() {
  const { store, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{store?.name ?? "ဆိုင်ခွဲ"}</p>
          <p className="text-xs text-muted-foreground">ဆိုင်ခွဲ အကောင့်</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Link
          to="/settings/receipt"
          className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-accent"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-foreground">
            <Receipt className="h-4 w-4 text-muted-foreground" /> ဘောက်ချာ ပုံစံ ပြင်ဆင်ရန်
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="border-t border-border" />
        <Link
          to="/shift"
          className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-accent"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" /> အလုပ်ချိန် (အဝင်/အထွက်)
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> ထွက်မည်
      </button>
    </div>
  );
}
