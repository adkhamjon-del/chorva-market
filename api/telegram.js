const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || ``).trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || ``).trim();

const MENU = {
  keyboard: [
    [{ text: 📢 E’lon joylashtirish }, { text: 🔍 E’lonlarni ko’rish }],
    [{ text: 📂 Kategoriyalar }, { text: 📍 Hudud bo’yicha qidirish }],
    [{ text: 👤 Mening e’lonlarim }, { text: ⭐ VIP xizmatlar }],
    [{ text: 📞 Yordam }],
  ],
  resize_keyboard: true,
};

const CATEGORIES = [
  { key: qoramol, title: 🐄 Qoramol },
  { key: qoy, title: 🐑 Qo’y },
  { key: echki, title: 🐐 Echki },
  { key: ot, title: 🐎 Ot },
  { key: yem, title: 🌾 Yem-xashak },
  { key: fermer, title: 🚜 Fermer },
];

function categoryKeyboard() {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    rows.push(
      CATEGORIES.slice(i, i + 2).map((c) => ({
        text: c.title,
        callback_data: cat: + c.key,
      }))
    );
  }
  return { inline_keyboard: rows };
}

async function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: POST,
    headers: { [`Content-Type`]: application/json },
    body: JSON.stringify(body),
  });
}

module.exports = async (req, res) => {
  if (req.method !== `POST`) {
    return res.status(200).send(`Chorva Market bot ishlayapti`);
  }
  if (req.headers[`x-telegram-bot-api-secret-token`] !== SECRET) {
    return res.status(403).send(`forbidden`);
  }

  const update = req.body || {};

  if (update.callback_query) {
    const cq = update.callback_query;
    const chat_id = cq.message.chat.id;
    const message_id = cq.message.message_id;
    await tg(`answerCallbackQuery`, { callback_query_id: cq.id });

    if (cq.data === `cats`) {
      await tg(`editMessageText`, {
        chat_id,
        message_id,
        text: 📂 Kategoriyani tanlang:,
        reply_markup: categoryKeyboard(),
      });
    } else if (cq.data && cq.data.startsWith(`cat:`)) {
      const cat = CATEGORIES.find((c) => c.key === cq.data.slice(4));
      if (cat) {
        await tg(`editMessageText`, {
          chat_id,
          message_id,
          text: cat.title + \n\n🚧 E’lonlar tez orada shu yerda chiqadi.,
          reply_markup: {
            inline_keyboard: [[{ text: ⬅️ Orqaga, callback_data: cats }]],
          },
        });
      }
    }
    return res.status(200).json({ ok: true });
  }

  const msg = update.message;

  if (msg && msg.text === `/start`) {
    await tg(`sendMessage`, {
      chat_id: msg.chat.id,
      text: 🐄 CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang 👇,
      reply_markup: MENU,
    });
  } else if (msg && msg.text && msg.text.includes(`Kategoriyalar`)) {
    await tg(`sendMessage`, {
      chat_id: msg.chat.id,
      text: 📂 Kategoriyani tanlang:,
      reply_markup: categoryKeyboard(),
    });
  } else if (msg && msg.text) {
    await tg(`sendMessage`, {
      chat_id: msg.chat.id,
      text: 🚧 Bu bo’lim tez orada ishga tushadi.,
      reply_markup: MENU,
    });
  }

  return res.status(200).json({ ok: true });
};
