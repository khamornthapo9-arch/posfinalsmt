import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { usePlatformAdmin } from "@/lib/use-platform-admin";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err || !data.user) {
      setError("အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်");
      setBusy(false);
      return;
    }
    const { data: row } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!row) {
      await supabase.auth.signOut();
      setError("ဤအကောင့်သည် Admin မဟုတ်ပါ");
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">SMT POS Admin</h1>
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin Email"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} ဝင်မည်
        </button>
      </form>
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  children,
  requireLogin,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  requireLogin?: boolean;
}) {
  const { session, signOut } = useAuth();
  const { isAdmin, loading } = usePlatformAdmin();
  const navigate = useNavigate();

  if (requireLogin || (!loading && (!session || !isAdmin))) return <AdminLogin />;

  return (
    <div className="flex h-dvh flex-col bg-muted text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{session?.user.email}</span>
          <button
            onClick={async () => {
              await signOut();
              void navigate({ to: "/admin/admin", replace: true });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <LogOut className="h-3.5 w-3.5" /> ထွက်မည်
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
