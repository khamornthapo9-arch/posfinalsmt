import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];

async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function handleTelegramWebhook({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const update = await request.json();
    const message = update?.message;
    if (!message || !message.text) {
      return new Response("OK", { status: 200 });
    }

    const text: string = message.text.trim();
    const chatId = message.chat.id;
    const username = message.from?.username || message.from?.first_name || "Unknown";

    // Handle Deep-Link: /start store_<storeId>
    if (text.startsWith("/start link_")) {
      const token = text.replace("/start link_", "").trim().slice(0, 80);
      const { data: link } = await supabaseAdmin
        .from("telegram_link_tokens")
        .select("store_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      const storeId = link && new Date(link.expires_at).getTime() > Date.now() ? link.store_id : "";
      if (link) await supabaseAdmin.from("telegram_link_tokens").delete().eq("token", token);

      const { data: store, error } = await supabaseAdmin
        .from("stores")
        .update({
          telegram_chat_id: String(chatId),
          telegram_username: username,
          telegram_notify_enabled: true,
        })
        .eq("id", storeId || "00000000-0000-0000-0000-000000000000")
        .select("name")
        .maybeSingle();

      if (error || !store) {
        await sendTelegramMessage(
          chatId,
          "❌ ဆိုင်ရှာမတွေ့ပါ သို့မဟုတ် ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ SMT POS Settings မှ တစ်ဆင့် ပြန်လည် ကြိုးစားပါ။",
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `🎉 <b>${String(store.name).replace(/[<>&]/g, "")}</b> နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!\n\n` +
            `ယခုမှစ၍ နေ့စဉ် အရောင်းအစီရင်ခံစာ (EOD) များကို ဤနေရာသို့ အလိုအလျောက် ပို့ပေးသွားပါမည်။ ✅`,
        );
      }
    } else if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "မင်္ဂလာပါ 👋 SMT POS Report Bot မှ ကြိုဆိုပါသည်။ သင့်ဆိုင်နှင့် ချိတ်ဆက်ရန် SMT POS Settings > Telegram မှတစ်ဆင့် ချိတ်ဆက်ပေးပါ။",
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response("OK", { status: 200 });
  }
}

export const Route = createFileRoute("/api/public/telegram")({
  server: {
    handlers: {
      POST: handleTelegramWebhook,
      GET: () => new Response("Telegram Webhook is Active", { status: 200 }),
    },
  },
});
