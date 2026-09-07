import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

const DISMISS_KEY = "pos-announcement-dismissed";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Scrolling admin announcement shown at the top of the app. */
export function AnnouncementMarquee() {
  const { store } = useAuth();
  const [messages, setMessages] = useState<{ id: string; message: string }[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      const parsed = raw ? (JSON.parse(raw) as { day: string; ids: string[] }) : null;
      if (parsed && parsed.day === todayKey()) setDismissed(parsed.ids);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!store) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, message")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (active) setMessages(data ?? []);
    })();
    return () => {
      active = false;
    };
  }, [store]);

  const visible = messages.filter((m) => !dismissed.includes(m.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify({ day: todayKey(), ids: next }));
  };

  const current = visible[0]!;

  return (
    <div className="no-print flex items-center gap-2 overflow-hidden border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
      <Megaphone className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <p className="animate-marquee whitespace-nowrap text-xs font-medium text-amber-700 dark:text-amber-200">
          {current.message}
        </p>
      </div>
      <button
        onClick={() => dismiss(current.id)}
        aria-label="ပိတ်ရန်"
        className="shrink-0 text-amber-700/70 hover:text-amber-700 dark:text-amber-200/70"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
