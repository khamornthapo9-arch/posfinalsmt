import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DailyReportInput {
  storeId: string;
  storeName: string;
  currencySymbol: string;
  dateStr: string;
  grossSales: number;
  refunds: number;
  netSales: number;
  estimatedProfit: number;
  ordersCount: number;
  cashIn: number;
  kbzIn: number;
  waveIn: number;
  creditIssued: number;
  closedBy?: string;
  isTest?: boolean;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown, max = 120) => String(v ?? "").slice(0, max);
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const createTelegramLinkToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storeId: string }) => ({ storeId: str(d?.storeId, 64) }))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owned) return { token: null as string | null };
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("telegram_link_tokens").delete().eq("store_id", owned.id);
    await supabaseAdmin.from("telegram_link_tokens").insert({
      token,
      store_id: owned.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    return { token };
  });

export const sendStoreTelegramReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: DailyReportInput): DailyReportInput => ({
    storeId: str(d?.storeId, 64),
    storeName: esc(str(d?.storeName)),
    currencySymbol: esc(str(d?.currencySymbol, 8)),
    dateStr: esc(str(d?.dateStr, 32)),
    grossSales: num(d?.grossSales),
    refunds: num(d?.refunds),
    netSales: num(d?.netSales),
    estimatedProfit: num(d?.estimatedProfit),
    ordersCount: num(d?.ordersCount),
    cashIn: num(d?.cashIn),
    kbzIn: num(d?.kbzIn),
    waveIn: num(d?.waveIn),
    creditIssued: num(d?.creditIssued),
    closedBy: esc(str(d?.closedBy, 60)),
    isTest: Boolean(d?.isTest),
  }))
  .handler(async ({ data, context }) => {
    // Caller must be the owner or an active manager of this store (RLS-scoped checks).
    const { data: visible } = await context.supabase
      .from("stores")
      .select("id, owner_id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!visible) return { success: false, error: "ခွင့်ပြုချက် မရှိပါ" };
    if (visible.owner_id !== context.userId) {
      const { data: member } = await context.supabase
        .from("store_members")
        .select("role, is_active")
        .eq("store_id", data.storeId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!member?.is_active || member.role !== "MANAGER") {
        return { success: false, error: "ခွင့်ပြုချက် မရှိပါ" };
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    if (!token) {
      return { success: false, error: "Telegram Bot Token မရှိပါ" };
    }

    // Look up store chat ID
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select("telegram_chat_id, telegram_notify_enabled")
      .eq("id", data.storeId)
      .single();

    if (error || !store?.telegram_chat_id) {
      return { success: false, error: "ဆိုင်ရှင်၏ Telegram ချိတ်ဆက်မထားပါ" };
    }

    if (!store.telegram_notify_enabled) {
      return { success: false, error: "Telegram အသိပေးချက် ပိတ်ထားသည်" };
    }

    const fmt = (n: number) => `${Math.round(n).toLocaleString()} ${data.currencySymbol}`;

    const message =
      `📊 <b>${data.storeName} — နေ့ချုပ်အရောင်း စာရင်း (EOD)</b>\n` +
      `📅 ရက်စွဲ: ${data.dateStr}\n` +
      `👤 စာရင်းပိတ်သူ: ${data.closedBy || "မန်နေဂျာ"}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 စုစုပေါင်း အရောင်း: <b>${fmt(data.grossSales)}</b>\n` +
      `🔄 ပြန်အမ်းငွေ: <b>-${fmt(data.refunds)}</b>\n` +
      `💸 အသားတင် အရောင်း: <b>${fmt(data.netSales)}</b>\n` +
      `📈 ခန့်မှန်း အမြတ်: <b>${fmt(data.estimatedProfit)}</b>\n\n` +
      `💳 <b>ငွေပေးချေမှု ခွဲခြမ်းချက်:</b>\n` +
      ` • ငွေသား (Cash): ${fmt(data.cashIn)}\n` +
      ` • KBZ Pay: ${fmt(data.kbzIn)}\n` +
      ` • Wave Pay: ${fmt(data.waveIn)}\n` +
      (data.creditIssued > 0 ? ` • အကြွေးထုတ်ငွေ: ${fmt(data.creditIssued)}\n` : "") +
      `\n📦 အော်ဒါ စုစုပေါင်း: <b>${data.ordersCount}</b> စောင်\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ စာရင်းအားလုံး သိမ်းဆည်းပြီးပါပြီ။`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: store.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await res.json();
    return { success: result.ok, error: result.description };
  });
