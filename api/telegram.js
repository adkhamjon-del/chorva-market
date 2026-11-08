const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

// Emoji lar \u{...} kodlari bilan yozilgan, shuning uchun fayl faqat oddiy ASCII belgilardan iborat.
const MENU = {
  keyboard: [
    [{ text: "\u{1F4E2} E'lon joylashtirish" }, { text: "\u{1F50D} E'lonlarni ko'rish" }],
    [{ text: "\u{1F4C2} Kategoriyalar" }, { text: "\u{1F4CD} Hudud bo'yicha qidirish" }],
    [{ text: "\u{1F464} Mening e'lonlarim" }, { text: "\u{2B50} VIP xizmatlar" }],
    [{ text: "\u{1F4DE} Yordam" }],
  ],
  resize_keyboard: true,
};

const CATEGORIES = [
  { key: "qoramol", title: "\u{1F404} Qoramol" },
  { key: "qoy", title: "\u{1F411} Qo'y" },
  { key: "echki", title: "\u{1F410} Echki" },
  { key: "ot", title: "\u{1F40E} Ot" },
  { key: "yem", title: "\u{1F33E} Yem-xashak" },
  { key: "fermer", title: "\u{1F69C} Fermer" },
];

function categoryKeyboard() {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    rows.push(
      CATEGORIES.slice(i, i + 2).map((c) => ({
        text: c.title,
        callback_data: "cat:" + c.key,
      }))
    );
  }
  return { inline_keyboard: rows };
}

async function tg(method, body) {
  const r = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    console.error("Telegram API xatosi:", method, r.status, await r.text());
  }
  return r;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Chorva Market bot ishlayapti");
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
    return res.status(403).send("forbidden");
  }

  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const chat_id = cq.message.chat.id;
      const message_id = cq.message.message_id;
      await tg("answerCallbackQuery", { callback_query_id: cq.id });

      if (cq.data === "cats") {
        await tg("editMessageText", {
          chat_id: chat_id,
          message_id: message_id,
          text: "\u{1F4C2} Kategoriyani tanlang:",
          reply_markup: categoryKeyboard(),
        });
      } else if (cq.data && cq.data.startsWith("cat:")) {
        const cat = CATEGORIES.find((c) => c.key === cq.data.slice(4));
        if (cat) {
          await tg("editMessageText", {
            chat_id: chat_id,
            message_id: message_id,
            text: cat.title + "\n\n\u{1F6A7} E'lonlar tez orada shu yerda chiqadi.",
            reply_markup: {
              inline_keyboard: [[{ text: "\u{2B05}\u{FE0F} Orqaga", callback_data: "cats" }]],
            },
          });
        }
      }
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;

    if (msg && msg.text === "/start") {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "\u{1F404} CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang \u{1F447}",
        reply_markup: MENU,
      });
    } else if (msg && msg.text && msg.text.includes("Kategoriyalar")) {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "\u{1F4C2} Kategoriyani tanlang:",
        reply_markup: categoryKeyboard(),
      });
    } else if (msg && msg.text) {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "\u{1F6A7} Bu bo'lim tez orada ishga tushadi.",
        reply_markup: MENU,
      });
    }
  } catch (e) {
    console.error("Bot xatosi:", e);
  }

  return res.status(200).json({ ok: true });
};
