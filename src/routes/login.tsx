import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PENDING_STORE_NAME_KEY } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "အကောင့်ဝင်ရန် — SMT POS" },
      {
        name: "description",
        content:
          "အီးမေးလ် အတည်ပြုကုဒ်ဖြင့် ဝင်ရောက်ပါ။",
      },
      { property: "og:title", content: "အကောင့်ဝင်ရန် — SMT POS" },
      { property: "og:description", content: "သင့်ဆိုင်အတွက် အီးမေးလ်အတည်ပြုကုဒ်ဖြင့် အကောင့်ဝင်ရန်။" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, store, loading, refreshStore } = useAuth();
  const [step, setStep] = useState<"details" | "code">("details");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!loading && session && store) void navigate({ to: "/", replace: true });
  }, [loading, session, store, navigate]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [seconds]);

  const sendCode = async () => {
    if (!storeName.trim()) {
      toast.error("ဆိုင်အမည် ထည့်သွင်းပေးပါ။");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်သွင်းပေးပါ။");
      return;
    }
    // Persist the store name first so magic-link sign-in in a new tab still has it.
    window.localStorage.setItem(PENDING_STORE_NAME_KEY, storeName.trim());

    // Switch to the code screen immediately, regardless of the network call.
    setStep("code");
    setSeconds(60);
    setDigits(Array(6).fill(""));
    setSending(true);
    window.setTimeout(() => inputs.current[0]?.focus(), 50);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setSeconds(0);
      return;
    }
    toast.success("သင့်အီးမေးလ်သို့ အတည်ပြုလင့် ပို့ပေးလိုက်ပါပြီ။");
  };

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, i) => (i === index ? "" : x)));
      return;
    }
    setDigits((d) => {
      const next = [...d];
      clean.split("").forEach((ch, offset) => {
        if (index + offset < 6) next[index + offset] = ch;
      });
      return next;
    });
    const target = Math.min(index + clean.length, 5);
    inputs.current[target]?.focus();
  };

  const verify = async (code: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "email",
      });
      if (error || !data.user) throw error ?? new Error("အတည်ပြုခြင်း မအောင်မြင်ပါ");
      await refreshStore();
      toast.success("ပြန်လည်ကြိုဆိုပါသည်");
      void navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "အတည်ပြုကုဒ် မမှန်ကန်ပါ။");
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const code = digits.join("");
    if (code.length === 6 && !busy) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary p-2 text-primary-foreground shadow-sm">
            <img
              src="/smt-pos-logo.png"
              alt="SMT POS Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SMT POS</h1>
            <p className="text-sm text-muted-foreground">
              {step === "details" ? "အကောင့်ဝင်ရန် သို့မဟုတ် ဆိုင်အသစ်စတင်ရန်" : "အတည်ပြုကုဒ် ရိုက်ထည့်ပါ"}
            </p>
          </div>
        </div>

        {step === "details" ? (
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="email">အီးမေးလ်</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@store.com"
                maxLength={255}
                className="min-h-11"
                onKeyDown={(e) => e.key === "Enter" && void sendCode()}
              />
            </div>
            <Button onClick={() => void sendCode()} disabled={busy || sending} className="min-h-11 w-full">
              {(busy || sending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              အတည်ပြုကုဒ် ပို့ရန်
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              ဤအီးမေးလ်သို့ အတည်ပြုကုဒ် ပို့ပေးလိုက်ပါပြီ <span className="font-medium text-foreground">{email}</span>
            </p>
            <div className="flex justify-between gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={digit}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-label={`ဂဏန်း ${i + 1}`}
                  className="h-14 w-full rounded-lg border border-input bg-background text-center text-xl font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
            {(busy || sending) && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {sending ? "ကုဒ် ပို့နေသည်..." : "အတည်ပြုနေသည်..."}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                အီးမေးလ် ပြောင်းရန်
              </button>
              <button
                type="button"
                disabled={seconds > 0 || busy || sending}
                onClick={() => void sendCode()}
                className="font-medium text-primary disabled:text-muted-foreground"
              >
                {seconds > 0 ? `${seconds} စက္ကန့်အတွင်း ပြန်ပို့မည်` : "ကုဒ် ပြန်ပို့ရန်"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

