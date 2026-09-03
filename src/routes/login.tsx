import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PENDING_STORE_NAME_KEY } from "@/lib/auth-store";
import smtPosLogo from "@/assets/smt-pos-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: search['mode'] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "အကောင့်ဝင်ရန် — SMT POS" },
      {
        name: "description",
        content: "အီးမေးလ်နှင့် စကားဝှက် သို့မဟုတ် Google ဖြင့် SMT POS သို့ ဝင်ရောက်ပါ။",
      },
      { property: "og:title", content: "အကောင့်ဝင်ရန် — SMT POS" },
      {
        property: "og:description",
        content: "သင့်ဆိုင်အတွက် အီးမေးလ်/စကားဝှက် သို့မဟုတ် Google ဖြင့် အကောင့်ဝင်ရန်။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4.01-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.18 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { session, store, loading, refreshStore } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && store) void navigate({ to: "/register", replace: true });
  }, [loading, session, store, navigate]);

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      toast.error("မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်သွင်းပေးပါ။");
      return;
    }
    if (password.length < 6) {
      toast.error("စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။");
      return;
    }
    if (mode === "signup" && !storeName.trim()) {
      toast.error("ဆိုင်အမည် ထည့်သွင်းပေးပါ။");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        window.localStorage.setItem(PENDING_STORE_NAME_KEY, storeName.trim());
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { store_name: storeName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          await refreshStore();
          void navigate({ to: "/register", replace: true });
          return;
        }
        setSentTo(mail);
        toast.success("အတည်ပြုလင့်ခ်ကို သင့်အီးမေးလ်သို့ ပို့ပြီးပါပြီ။");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        await refreshStore();
        toast.success("ပြန်လည်ကြိုဆိုပါသည်");
        void navigate({ to: "/register", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      if (storeName.trim()) {
        window.localStorage.setItem(PENDING_STORE_NAME_KEY, storeName.trim());
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google ဖြင့် ဝင်ရောက်မှု မအောင်မြင်ပါ။");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/">
            <img
              src={smtPosLogo}
              alt="SMT POS"
              width={72}
              height={72}
              className="h-18 w-18 max-h-20 object-contain"
            />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {sentTo ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">အီးမေးလ် အတည်ပြုပေးပါ</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{sentTo}</span> သို့ အတည်ပြုလင့်ခ်
                ပို့ပြီးပါပြီ။ လင့်ခ်ကို နှိပ်ပြီးနောက် ဤနေရာမှ ပြန်လည်ဝင်ရောက်နိုင်ပါသည်။
              </p>
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => {
                  setSentTo(null);
                  setMode("signin");
                }}
              >
                အကောင့်ဝင်ရန် ပြန်သွားမည်
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">SMT POS</h1>
                  <p className="text-sm text-muted-foreground">
                    {mode === "signin" ? "အကောင့်ဝင်ရန်" : "ဆိုင်အသစ် စတင်ရန်"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="store">ဆိုင်အမည်</Label>
                    <Input
                      id="store"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="ဥပမာ - မြို့မ စတိုး"
                      maxLength={80}
                      className="min-h-11"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">အီးမေးလ်</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    maxLength={255}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">စကားဝှက်</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-11"
                    onKeyDown={(e) => e.key === "Enter" && void submit()}
                  />
                </div>

                <Button onClick={() => void submit()} disabled={busy} className="min-h-11 w-full">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "အကောင့်ဝင်ရန်" : "အကောင့်ဖွင့်ရန်"}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">သို့မဟုတ်</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void signInWithGoogle()}
                  className="min-h-11 w-full"
                >
                  <GoogleIcon /> Google ဖြင့် ဆက်လက်ဆောင်ရွက်ရန်
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signin" ? "အကောင့် မရှိသေးဘူးလား?" : "အကောင့် ရှိပြီးသားလား?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {mode === "signin" ? "အကောင့်ဖွင့်ရန်" : "အကောင့်ဝင်ရန်"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
