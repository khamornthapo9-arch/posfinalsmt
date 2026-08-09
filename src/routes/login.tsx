import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Counter POS" },
      {
        name: "description",
        content:
          "Sign in to your Counter point of sale account with a 6-digit email verification code.",
      },
      { property: "og:title", content: "Sign in — Counter POS" },
      { property: "og:description", content: "Secure email code sign-in for your store register." },
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
      toast.error("Enter your store name");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter a valid business email");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.sessionStorage.setItem("pos-pending-store-name", storeName.trim());
    setStep("code");
    setSeconds(60);
    setDigits(Array(6).fill(""));
    toast.success("We sent a 6-digit code to your email");
    window.setTimeout(() => inputs.current[0]?.focus(), 50);
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
      if (error || !data.user) throw error ?? new Error("Verification failed");

      const { data: existing } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      if (!existing) {
        const name =
          window.sessionStorage.getItem("pos-pending-store-name") || storeName.trim() || "My Store";
        const { error: insertError } = await supabase
          .from("stores")
          .insert({ name, owner_id: data.user.id });
        if (insertError) throw insertError;
      }
      window.sessionStorage.removeItem("pos-pending-store-name");
      await refreshStore();
      toast.success("Welcome back");
      void navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Counter POS</h1>
            <p className="text-sm text-muted-foreground">
              {step === "details" ? "Sign in or create your store" : "Enter your verification code"}
            </p>
          </div>
        </div>

        {step === "details" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store">Store name</Label>
              <Input
                id="store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Corner Market"
                maxLength={80}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business email</Label>
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
            <Button onClick={() => void sendCode()} disabled={busy} className="min-h-11 w-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send 6-digit verification code
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              We sent a code to <span className="font-medium text-foreground">{email}</span>
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
                  aria-label={`Digit ${i + 1}`}
                  className="h-14 w-full rounded-lg border border-input bg-background text-center text-xl font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
            {busy && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={seconds > 0 || busy}
                onClick={() => void sendCode()}
                className="font-medium text-primary disabled:text-muted-foreground"
              >
                {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
