import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Crown, KeyRound, Loader2, Plus, Trash2, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { ROLE_LABEL, useRole, type StoreRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings_/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ဝန်ထမ်း စီမံခန့်ခွဲမှု — SMT POS" },
      {
        name: "description",
        content:
          "ဆိုင်ပိုင်ရှင်များအတွက် ဝန်ထမ်း အကောင့်များ၊ ရာထူးများနှင့် PIN နံပါတ်များကို စီမံခန့်ခွဲရန်။",
      },
      { property: "og:title", content: "ဝန်ထမ်း စီမံခန့်ခွဲမှု — SMT POS" },
      {
        property: "og:description",
        content: "OWNER / MANAGER / CASHIER ရာထူးများနှင့် PIN အကောင့်များ စီမံခြင်း။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffSettingsPage,
});

interface StaffRow {
  id: string;
  display_name: string | null;
  role: StoreRole;
  pin_code: string | null;
  is_active: boolean;
  user_id: string | null;
}

const ROLES: StoreRole[] = ["OWNER", "MANAGER", "CASHIER"];

function StaffSettingsPage() {
  const { store } = useAuth();
  const { isOwner } = useRole();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<StoreRole>("CASHIER");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    const { data } = await supabase
      .from("store_members")
      .select("id, display_name, role, pin_code, is_active, user_id")
      .eq("store_id", store.id)
      .order("created_at");
    setRows((data as StaffRow[] | null) ?? []);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void load();
  }, [load]);

  const addStaff = async () => {
    if (!store) return;
    if (!name.trim()) return toast.error("ဝန်ထမ်း အမည် ထည့်ပါ");
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN သည် ဂဏန်း ၄ လုံးမှ ၆ လုံးအထိ ဖြစ်ရမည်");
    if (rows.some((r) => r.pin_code === pin)) return toast.error("ဤ PIN ကို အသုံးပြုပြီးဖြစ်သည်");
    setSaving(true);
    const { error } = await supabase.from("store_members").insert({
      store_id: store.id,
      display_name: name.trim(),
      pin_code: pin,
      role,
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error("ဝန်ထမ်း ထည့်၍ မရပါ");
    toast.success("ဝန်ထမ်း ထည့်သွင်းပြီးပါပြီ");
    setName("");
    setPin("");
    setRole("CASHIER");
    setAdding(false);
    void load();
  };

  const patch = async (id: string, values: Partial<StaffRow>) => {
    const { error } = await supabase.from("store_members").update(values).eq("id", id);
    if (error) toast.error("ပြင်ဆင်၍ မရပါ");
    else void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("store_members").delete().eq("id", id);
    if (error) toast.error("ဖျက်၍ မရပါ");
    else {
      toast.success("ဝန်ထမ်း ဖျက်ပြီးပါပြီ");
      void load();
    }
  };

  if (!isOwner) {
    return (
      <PosShell title="ဝန်ထမ်း စီမံခန့်ခွဲမှု">
        <div className="p-6 text-sm text-muted-foreground">
          ဤစာမျက်နှာကို ဆိုင်ပိုင်ရှင်သာ ကြည့်ရှုနိုင်ပါသည်။
        </div>
      </PosShell>
    );
  }

  return (
    <PosShell title="ဝန်ထမ်း စီမံခန့်ခွဲမှု" subtitle={store?.name ?? ""}>
      <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/settings"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> ပြင်ဆင်ချက်များသို့
          </Link>
          <button
            onClick={() => setAdding(true)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" /> ဝန်ထမ်း ထည့်မည်
          </button>
        </div>

        {store && !store.is_pro && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Crown className="h-4 w-4 text-amber-500" />
            ဝန်ထမ်း အများအပြား PIN အကောင့်များသည် Pro Plan အင်္ဂါရပ် ဖြစ်သည်။{" "}
            <Link to="/settings/plan" className="font-medium text-primary underline">
              အဆင့်မြှင့်ရန်
            </Link>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">ဝန်ထမ်း မရှိသေးပါ။</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <UserCog className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.display_name || (row.user_id ? "ဆိုင်ပိုင်ရှင် အကောင့်" : "ဝန်ထမ်း")}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <KeyRound className="h-3 w-3" />
                      {row.pin_code ? `PIN ${row.pin_code}` : "PIN မရှိ (email အကောင့်)"}
                    </p>
                  </div>
                  <select
                    value={row.role}
                    onChange={(e) => void patch(row.id, { role: e.target.value as StoreRole })}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void patch(row.id, { is_active: !row.is_active })}
                    className={cn(
                      "h-9 rounded-md border px-3 text-xs font-medium",
                      row.is_active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {row.is_active ? "အသုံးပြုနေသည်" : "ရပ်ဆိုင်းထား"}
                  </button>
                  <button
                    onClick={() => void remove(row.id)}
                    aria-label="ဝန်ထမ်း ဖျက်ရန်"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">ဝန်ထမ်း အသစ်</h2>
              <button onClick={() => setAdding(false)} aria-label="ပိတ်ရန်" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">အမည်</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  PIN (ဂဏန်း ၄–၆ လုံး)
                </span>
                <input
                  inputMode="numeric"
                  value={pin}
                  maxLength={6}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">ရာထူး</span>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={cn(
                        "h-10 flex-1 rounded-lg border text-xs font-medium",
                        role === r ? "border-primary bg-primary/10 text-primary" : "border-border",
                      )}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              disabled={saving}
              onClick={() => void addStaff()}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} သိမ်းဆည်းမည်
            </button>
          </div>
        </div>
      )}
    </PosShell>
  );
}
