const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

async function tg(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MENU = {
  keyboard: [
    [{ text: "📢 E'lon joylashtirish" }, { text: "🔍 E'lonlarni ko'rish" }],
    [{ text: "📂 Kategoriyalar" }, { text: "📍 Hudud bo'yicha qidirish" }],
    [{ text: "👤 Mening e'lonlarim" }, { text: "⭐ VIP xizmatlar" }],
    [{ text: "📞 Yordam" }],
  ],
  resize_keyboard: true,
};

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json();
  const msg = update.message;

  if (msg?.text === "/start") {
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "🐄 CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang 👇",
      reply_markup: MENU,
    });
  } else if (msg?.text) {
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "🚧 Bu bo'lim tez orada ishga tushadi.",
      reply_markup: MENU,
    });
  }

  return Response.json({ ok: true });
}
