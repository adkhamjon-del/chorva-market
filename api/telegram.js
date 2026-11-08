const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

const MENU = {
  keyboard: [
    [{ text: "ðŸ“¢ E'lon joylashtirish" }, { text: "ðŸ” E'lonlarni ko'rish" }],
    [{ text: "ðŸ“‚ Kategoriyalar" }, { text: "ðŸ“ Hudud bo'yicha qidirish" }],
    [{ text: "ðŸ‘¤ Mening e'lonlarim" }, { text: "â­ VIP xizmatlar" }],
    [{ text: "ðŸ“ž Yordam" }],
  ],
  resize_keyboard: true,
};

const CATEGORIES = [
  { key: "qoramol", title: "ðŸ„ Qoramol" },
  { key: "qoy", title: "ðŸ‘ Qo'y" },
  { key: "echki", title: "ðŸ Echki" },
  { key: "ot", title: "ðŸŽ Ot" },
  { key: "yem", title: "ðŸŒ¾ Yem-xashak" },
  { key: "fermer", title: "ðŸšœ Fermer" },
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
          text: "ðŸ“‚ Kategoriyani tanlang:",
          reply_markup: categoryKeyboard(),
        });
      } else if (cq.data && cq.data.startsWith("cat:")) {
        const cat = CATEGORIES.find((c) => c.key === cq.data.slice(4));
        if (cat) {
          await tg("editMessageText", {
            chat_id: chat_id,
            message_id: message_id,
            text: cat.title + "\n\nðŸš§ E'lonlar tez orada shu yerda chiqadi.",
            reply_markup: {
              inline_keyboard: [[{ text: "â¬…ï¸ Orqaga", callback_data: "cats" }]],
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
        text: "ðŸ„ CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang ðŸ‘‡",
        reply_markup: MENU,
      });
    } else if (msg && msg.text && msg.text.includes("Kategoriyalar")) {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "ðŸ“‚ Kategoriyani tanlang:",
        reply_markup: categoryKeyboard(),
      });
    } else if (msg && msg.text) {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "ðŸš§ Bu bo'lim tez orada ishga tushadi.",
        reply_markup: MENU,
      });
    }
  } catch (e) {
    console.error("Bot xatosi:", e);
  }

  return res.status(200).json({ ok: true });
};
