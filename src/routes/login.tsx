import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PENDING_STORE_NAME_KEY } from "@/lib/auth-store";

import smtPosLogo from "@/assets/smt-pos-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { branchLogin } from "@/lib/branches.functions";

type Mode = "signin" | "signup" | "branch";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: Mode | undefined; code?: string | undefined } => ({
    mode: search['mode'] === "signup" ? "signup" : search['mode'] === "branch" ? "branch" : undefined,
    code: typeof search['code'] === "string" ? search['code'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "အကောင့်ဝင်ရန် — SMT POS" },
      {
        name: "description",
        content: "အီးမေးလ်နှင့် စကားဝှက်ဖြင့် SMT POS သို့ ဝင်ရောက်ပါ။",
      },
      { property: "og:title", content: "အကောင့်ဝင်ရန် — SMT POS" },
      {
        property: "og:description",
        content: "သင့်ဆိုင်အတွက် အီးမေးလ်/စကားဝှက်ဖြင့် အကောင့်ဝင်ရန်။",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { session, store, loading, refreshStore } = useAuth();
  const [mode, setMode] = useState<Mode>(
    search.mode ?? (search.code ? "branch" : "signin"),
  );
  const [branchCode, setBranchCode] = useState(search.code ?? "");
  const [branchPin, setBranchPin] = useState("");
  const loginBranch = useServerFn(branchLogin);
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  

  useEffect(() => {
    if (!loading && session && store) void navigate({ to: "/register", replace: true });
  }, [loading, session, store, navigate]);

  const submitBranch = async () => {
    setBusy(true);
    try {
      const tokens = await loginBranch({ data: { code: branchCode, pin: branchPin } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      await refreshStore();
      toast.success("ဆိုင်ခွဲသို့ ကြိုဆိုပါသည်");
      void navigate({ to: "/register", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ဝင်ရောက်မှု မအောင်မြင်ပါ");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      toast.error("မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်သွင်းပေးပါ။");
      return;
    }
    if (password.length < 8) {
      toast.error("စကားဝှက်သည် အနည်းဆုံး ၈ လုံး ရှိရပါမည်။");
      return;
    }
    if (mode === "signup") {
      if (!storeName.trim()) {
        toast.error("ဆိုင်အမည် ထည့်သွင်းပေးပါ။");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("စကားဝှက်နှစ်ခု မတူညီပါ။ ထပ်စစ်ပေးပါ။");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        window.localStorage.setItem(PENDING_STORE_NAME_KEY, storeName.trim());
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { data: { store_name: storeName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: mail,
            password,
          });
          if (signInError) throw signInError;
        }
        await refreshStore();
        toast.success("အကောင့် ဖွင့်ပြီးပါပြီ။ ကြိုဆိုပါသည်");
        void navigate({ to: "/register", replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        await refreshStore();
        toast.success("ပြန်လည်ကြိုဆိုပါသည်");
        void navigate({ to: "/register", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /failed to fetch|network/i.test(msg)
          ? "ကွန်ရက် ချိတ်ဆက်မှု မရပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ထပ်စမ်းကြည့်ပါ။"
          : /weak|easy to guess/i.test(msg)
            ? "ဤစကားဝှက်သည် အလွန်ရိုးရှင်း/လုံခြုံမှုမရှိပါ။ ပိုခက်ခဲသော စကားဝှက် အသစ်တစ်ခု ရွေးပါ။"
            : /invalid login|invalid_credentials/i.test(msg)
              ? "အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။"
              : msg || "အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="hero-glow relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-md">
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

        <div className="rounded-2xl border border-border bg-card p-6 shadow-pop sm:p-8">
          <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-brand">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">SMT POS</h1>
                  <p className="text-sm text-muted-foreground">
                    {mode === "signin" ? "အကောင့်ဝင်ရန်" : "ဆိုင်အသစ် စတင်ရန်"}
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-md py-2 transition-colors ${mode !== "branch" ? "bg-card font-semibold text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
                >
                  ပိုင်ရှင်
                </button>
                <button
                  type="button"
                  onClick={() => setMode("branch")}
                  className={`rounded-md py-2 transition-colors ${mode === "branch" ? "bg-card font-semibold text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
                >
                  ဆိုင်ခွဲဝင်ရန်
                </button>
              </div>
              {mode === "branch" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bcode">ဆိုင်ခွဲ ကုဒ်</Label>
                    <Input
                      id="bcode"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={12}
                      className="min-h-11 font-mono tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpin">PIN</Label>
                    <Input
                      id="bpin"
                      type="password"
                      inputMode="numeric"
                      value={branchPin}
                      onChange={(e) => setBranchPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••"
                      className="min-h-11 tracking-widest"
                      onKeyDown={(e) => e.key === "Enter" && void submitBranch()}
                    />
                  </div>
                  <Button onClick={() => void submitBranch()} disabled={busy} className="min-h-11 w-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    ဆိုင်ခွဲ ဝင်ရန်
                  </Button>
                </div>
              ) : (
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
                  />
                </div>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">စကားဝှက် အတည်ပြုရန်</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="min-h-11"
                      onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                  </div>
                )}

                <Button onClick={() => void submit()} disabled={busy} className="min-h-11 w-full">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "အကောင့်ဝင်ရန်" : "အကောင့်ဖွင့်ရန်"}
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
              )}
          </>
        </div>
      </div>
    </main>
  );
}
