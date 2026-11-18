import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
}

export const sendStoreTelegramReport = createServerFn({ method: "POST" })
  .validator((d: DailyReportInput) => d)
  .handler(async ({ data }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
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
