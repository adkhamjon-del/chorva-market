const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

const MENU = {
  keyboard: [
    [{ text: "📢 E'lon joylashtirish" }, { text: "🔍 E'lonlarni ko'rish" }],
    [{ text: "📂 Kategoriyalar" }, { text: "📍 Hudud bo'yicha qidirish" }],
    [{ text: "👤 Mening e'lonlarim" }, { text: "⭐ VIP xizmatlar" }],
    [{ text: "📞 Yordam" }],
  ],
  resize_keyboard: true,
};

async function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Chorva Market bot ishlayapti");
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
    return res.status(403).send("forbidden");
  }

  const msg = req.body && req.body.message;

  if (msg && msg.text === "/start") {
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "🐄 CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang 👇",
      reply_markup: MENU,
    });
  } else if (msg && msg.text) {
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "🚧 Bu bo'lim tez orada ishga tushadi.",
      reply_markup: MENU,
    });
  }

  return res.status(200).json({ ok: true });
};
