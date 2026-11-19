import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, KeyRound, Loader2, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/pos-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useStoreSettings } from "@/lib/use-store-settings";
import { createBranch, resetBranchPin, setBranchActive } from "@/lib/branches.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings_/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ဆိုင်ခွဲများ — SMT POS" },
      { name: "description", content: "Pro ပိုင်ရှင်များအတွက် ဆိုင်ခွဲ ဖွင့်ခြင်း၊ ကုဒ်နှင့် PIN စီမံခြင်း။" },
      { property: "og:title", content: "ဆိုင်ခွဲများ — SMT POS" },
      { property: "og:description", content: "ဆိုင်ခွဲ ကုဒ် + PIN ဖြင့် ဝင်ရောက်နိုင်သော စနစ်။" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BranchesPage,
});

interface BranchRow {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

function BranchesPage() {
  const { store, refreshStore } = useAuth();
  const { isPro } = useStoreSettings();
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createBranch);
  const reset = useServerFn(resetBranchPin);
  const toggle = useServerFn(setBranchActive);
  const isMain = !!store && !store.parent_store_id;

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    const { data } = await supabase
      .from("branches")
      .select("id, code, name, is_active")
      .eq("parent_store_id", store.id)
      .order("created_at");
    setRows((data as BranchRow[] | null) ?? []);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const r = await create({ data: { storeId: store.id, name, pin } });
      toast.success(`ဆိုင်ခွဲ ဖွင့်ပြီး · ကုဒ် ${r.code}`);
      setName("");
      setPin("");
      void load();
      void refreshStore();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "မအောင်မြင်ပါ");
    } finally {
      setSaving(false);
    }
  };

  const doReset = async (id: string) => {
    const p = window.prompt("PIN အသစ် (ဂဏန်း ၄-၆ လုံး)");
    if (!p) return;
    try {
      await reset({ data: { branchId: id, pin: p } });
      toast.success("PIN ပြောင်းပြီးပါပြီ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "မအောင်မြင်ပါ");
    }
  };

  const doToggle = async (id: string, active: boolean) => {
    try {
      await toggle({ data: { branchId: id, active } });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "မအောင်မြင်ပါ");
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/login?code=${code}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link ကူးပြီး · Viber/Telegram တွင် ပို့ပါ");
  };

  return (
    <PosShell title="ဆိုင်ခွဲများ" subtitle={store?.name ?? ""}>
      <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-4">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> ဆက်တင်
        </Link>
        {!isMain ? (
          <p className="text-sm text-muted-foreground">ပင်မဆိုင် ပိုင်ရှင်သာ ဆိုင်ခွဲ စီမံနိုင်ပါသည်။</p>
        ) : !isPro ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm">
            ဆိုင်ခွဲ ဖွင့်ရန် Pro Plan လိုအပ်ပါသည်။{" "}
            <Link to="/settings/plan" className="font-medium text-primary underline">
              Admin ကို ဆက်သွယ်ရန်
            </Link>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="font-semibold">ဆိုင်ခွဲ အသစ်</h2>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ဆိုင်ခွဲ အမည်" maxLength={80} />
              <Input
                value={pin}
                inputMode="numeric"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="PIN (၄-၆)"
              />
              <Button onClick={() => void add()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                ဖွင့်ရန်
              </Button>
            </div>
          </div>
        )}
        {isMain && (
          <div className="divide-y divide-border rounded-md border border-border bg-card">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">ဆိုင်ခွဲ မရှိသေးပါ</p>
            ) : (
              rows.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{b.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyLink(b.code)}>
                    <Copy className="h-4 w-4" /> Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void doReset(b.id)}>
                    <KeyRound className="h-4 w-4" /> PIN
                  </Button>
                  <Switch checked={b.is_active} onCheckedChange={(v) => void doToggle(b.id, v)} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PosShell>
  );
}
