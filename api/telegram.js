// Chorva Market Telegram boti: kategoriyalar, e'lon joylash, e'lonlarni ko'rish.
// Fayl faqat ASCII belgilardan iborat (emoji lar kod bilan yozilgan), shuning uchun kodlash buzilmaydi.

const crypto = require("crypto");

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SB_KEY = (process.env.SUPABASE_SECRET_KEY || "").trim();
const SITE_URL = "https://chorva-market-olive.vercel.app";
const DAILY_LIMIT = 5;
const MAX_PHOTOS = 6;

const E = (c) => String.fromCodePoint(c);
const EM = {
  megaphone: E(0x1F4E2), search: E(0x1F50D), folder: E(0x1F4C2), pin: E(0x1F4CD),
  user: E(0x1F464), star: E(0x2B50), phone: E(0x1F4DE), cow: E(0x1F404),
  sheep: E(0x1F411), goat: E(0x1F410), horse: E(0x1F40E), wheat: E(0x1F33E),
  carrot: E(0x1F955), construction: E(0x1F6A7), back: E(0x2B05) + E(0xFE0F),
  check: E(0x2705), cross: E(0x274C), money: E(0x1F4B0), cart: E(0x1F6D2),
  camera: E(0x1F4F7), mobile: E(0x1F4F1), skip: E(0x23ED) + E(0xFE0F),
  down: E(0x1F447), party: E(0x1F389), warn: E(0x26A0) + E(0xFE0F), link: E(0x1F517),
};

const MENU = {
  keyboard: [
    [{ text: EM.megaphone + " E'lon joylashtirish" }, { text: EM.search + " E'lonlarni ko'rish" }],
    [{ text: EM.folder + " Kategoriyalar" }, { text: EM.pin + " Hudud bo'yicha qidirish" }],
    [{ text: EM.user + " Mening e'lonlarim" }, { text: EM.star + " VIP xizmatlar" }],
    [{ text: EM.phone + " Yordam" }],
  ],
  resize_keyboard: true,
};

const CATEGORIES = [
  { key: "qoramol", title: EM.cow + " Qoramol" },
  { key: "qoy", title: EM.sheep + " Qo'y" },
  { key: "echki", title: EM.goat + " Echki" },
  { key: "ot", title: EM.horse + " Ot" },
  { key: "yem", title: EM.wheat + " Yem-xashak" },
  { key: "fermer", title: EM.carrot + " Fermer" },
];
const ANIMAL_CATS = ["qoramol", "qoy", "ot", "echki"];

const REGIONS = [
  "Qoraqalpog'iston Respublikasi", "Andijon viloyati", "Buxoro viloyati", "Farg'ona viloyati",
  "Jizzax viloyati", "Xorazm viloyati", "Namangan viloyati", "Navoiy viloyati",
  "Qashqadaryo viloyati", "Samarqand viloyati", "Sirdaryo viloyati", "Surxondaryo viloyati",
  "Toshkent viloyati", "Toshkent shahri",
];

const BREEDS = {
  qoramol: ["Simmental", "Angus", "Holstein", "Qizil cho'l", "Mahalliy"],
  qoy: ["Qorako'l", "Edilbay", "Hisor", "Jaydari", "Mahalliy"],
  ot: ["Qarabayir", "Lokay", "Qirg'iz oti", "Ahaltekin", "Mahalliy"],
  echki: ["Angora", "Boer", "Mahalliy"],
};
const GENDERS = {
  qoramol: ["Buqa", "Sigir", "G'unajin"],
  qoy: ["Qo'chqor", "Sovliq", "Qo'zi"],
  ot: ["Ayg'ir", "Baytal", "Toy"],
  echki: ["Serka", "Echki", "Uloq"],
};
const PRODUCTS = {
  yem: ["Pichan", "Somon", "Beda", "Silos", "Arpa", "Bug'doy", "Kombikorm", "Kepak"],
  fermer: ["Pomidor", "Bodring", "Kartoshka", "Piyoz", "Ko'chat", "Urug'", "Olma", "Uzum"],
};
const HEALTH = [["soglom", "Sog'lom"], ["ortacha", "O'rtacha"], ["davolanishda", "Davolanishda"]];
const PURPOSE = [["gosht", "Go'sht"], ["sut", "Sut"], ["nasl", "Nasl"]];
const UNITS = [["kg", "kg"], ["tonna", "tonna"], ["boglam", "bog'lam"], ["qop", "qop"], ["dona", "dona"]];
const LABELS = {};
[].concat(HEALTH, PURPOSE, UNITS).forEach((p) => { LABELS[p[0]] = p[1]; });

const ANIMAL_STEPS = ["breed", "gender", "age", "weight", "health", "purpose", "price", "region", "district", "photos", "phone", "confirm"];
const PRODUCT_STEPS = ["product", "quantity", "unit", "price", "region", "district", "photos", "phone", "confirm"];

// ---------- Telegram ----------
async function tg(method, body) {
  try {
    const r = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) console.error("Telegram xatosi:", method, JSON.stringify(j));
    return j;
  } catch (e) {
    console.error("Telegram tarmoq xatosi:", method, e);
    return { ok: false };
  }
}
function send(chat_id, text, extra) {
  return tg("sendMessage", Object.assign({ chat_id: chat_id, text: text, link_preview_options: { is_disabled: true } }, extra || {}));
}

// ---------- Supabase ----------
function sbHeaders(extra) {
  const h = { apikey: SB_KEY, "Content-Type": "application/json" };
  if (SB_KEY.startsWith("eyJ")) h.Authorization = "Bearer " + SB_KEY;
  return Object.assign(h, extra || {});
}
async function rest(method, path, body, prefer) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    method: method,
    headers: sbHeaders(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error("Supabase xatosi:", method, path, r.status, text);
    throw new Error("db " + r.status + " " + text.slice(0, 300));
  }
  try { return text ? JSON.parse(text) : null; } catch (e) { return null; }
}

async function getSession(tid) {
  const rows = await rest("GET", "bot_sessions?telegram_id=eq." + tid + "&select=*");
  return rows && rows[0] ? rows[0] : null;
}
async function saveSession(tid, step, data) {
  await rest("POST", "bot_sessions?on_conflict=telegram_id",
    { telegram_id: tid, step: step, data: data, updated_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=minimal");
}
async function clearSession(tid) {
  await rest("DELETE", "bot_sessions?telegram_id=eq." + tid);
  await rest("DELETE", "bot_photos?telegram_id=eq." + tid);
}
async function lockSession(tid, fromStep, toStep) {
  const rows = await rest("PATCH", "bot_sessions?telegram_id=eq." + tid + "&step=eq." + fromStep,
    { step: toStep }, "return=representation");
  return rows && rows.length > 0 ? rows[0] : null;
}
async function listPhotos(tid) {
  return (await rest("GET", "bot_photos?telegram_id=eq." + tid + "&select=id,file_id&order=id.asc")) || [];
}

async function findProfile(tid) {
  const rows = await rest("GET", "profiles?telegram_id=eq." + tid + "&select=id,phone,full_name");
  return rows && rows[0] ? rows[0] : null;
}

async function ensureProfile(from, phone, verified) {
  const existing = await findProfile(from.id);
  if (existing) {
    if (phone && !existing.phone) {
      await rest("PATCH", "profiles?id=eq." + existing.id, { phone: phone, phone_verified: verified }, "return=minimal");
    }
    return existing.id;
  }
  const name = ((from.first_name || "") + " " + (from.last_name || "")).trim() || "Telegram foydalanuvchi";
  const r = await fetch(SB_URL + "/auth/v1/admin/users", {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({
      email: "tg" + from.id + "@telegram.invalid",
      password: crypto.randomBytes(24).toString("hex"),
      email_confirm: true,
      user_metadata: { full_name: name, telegram_id: from.id, source: "telegram" },
    }),
  });
  const u = await r.json().catch(() => ({}));
  if (!r.ok || !u.id) {
    console.error("Akkaunt yaratilmadi:", r.status, JSON.stringify(u));
    throw new Error("auth " + r.status);
  }
  const fields = { telegram_id: from.id, full_name: name, phone: phone || null, phone_verified: !!verified, rules_accepted: true };
  const upd = await rest("PATCH", "profiles?id=eq." + u.id, fields, "return=representation");
  if (!upd || !upd.length) {
    await rest("POST", "profiles", Object.assign({ id: u.id }, fields), "return=minimal");
  }
  return u.id;
}

async function uploadPhoto(file_id, listingId, i) {
  const f = await tg("getFile", { file_id: file_id });
  if (!f.ok) throw new Error("getFile");
  const dl = await fetch("https://api.telegram.org/file/bot" + TOKEN + "/" + f.result.file_path);
  if (!dl.ok) throw new Error("rasm yuklab olinmadi");
  const buf = Buffer.from(await dl.arrayBuffer());
  const path = listingId + "/" + Date.now() + "_" + i + ".jpg";
  const up = await fetch(SB_URL + "/storage/v1/object/listing-photos/" + path, {
    method: "POST",
    headers: sbHeaders({ "Content-Type": "image/jpeg" }),
    body: buf,
  });
  if (!up.ok) throw new Error("storage " + up.status + " " + (await up.text()));
  const url = SB_URL + "/storage/v1/object/public/listing-photos/" + path;
  await rest("POST", "listing_images", { listing_id: listingId, url: url, sort_order: i }, "return=minimal");
}

// ---------- Yordamchi ----------
const isAnimal = (cat) => ANIMAL_CATS.indexOf(cat) >= 0;
const catTitle = (key) => { const c = CATEGORIES.find((x) => x.key === key); return c ? c.title : key; };
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const stepsOf = (d) => (isAnimal(d.category) ? ANIMAL_STEPS : PRODUCT_STEPS);

function rowsOf(buttons, perRow) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += perRow) rows.push(buttons.slice(i, i + perRow));
  return rows;
}
function categoryKeyboard() {
  return { inline_keyboard: rowsOf(CATEGORIES.map((c) => ({ text: c.title, callback_data: "cat:" + c.key })), 2) };
}
function backCats() {
  return { inline_keyboard: [[{ text: EM.back + " Orqaga", callback_data: "cats" }]] };
}
function nextStep(d, cur) {
  if (cur === "type") return "cat";
  if (cur === "cat") return stepsOf(d)[0];
  const list = stepsOf(d);
  let n = list[list.indexOf(cur) + 1];
  if (n === "phone" && d.hasPhone) n = "confirm";
  return n;
}

function listingLine(l) {
  const title = isAnimal(l.category)
    ? ((l.breed || "") + " " + (l.gender || "")).trim() + (l.weight_kg ? ", " + l.weight_kg + " kg" : "")
    : (l.product_name || "") + (l.quantity ? ", " + l.quantity + " " + (LABELS[l.unit] || l.unit || "") : "");
  const kind = l.listing_type === "xarid" ? " (sotib olinadi)" : "";
  return catTitle(l.category) + ": " + title + kind + "\n" + EM.money + " " + fmt(l.price) + " so'm, " + (l.region || "") +
    "\n" + EM.link + " " + SITE_URL + "/?listing=" + l.id;
}
async function showListings(chat_id, filter, header, markup) {
  const rows = await rest("GET", "listings?status=eq.active" + filter +
    "&select=id,category,listing_type,breed,gender,weight_kg,product_name,quantity,unit,price,region&order=created_at.desc&limit=5");
  const text = rows && rows.length
    ? header + "\n\n" + rows.map(listingLine).join("\n\n")
    : header + "\n\nHozircha e'lonlar yo'q. Birinchi bo'ling: " + EM.megaphone + " E'lon joylashtirish";
  return send(chat_id, text, markup ? { reply_markup: markup } : {});
}

// ---------- Savollar ----------
async function prompt(chat_id, step, d) {
  const cb = (text, data) => ({ text: text, callback_data: data });
  switch (step) {
    case "type":
      return send(chat_id, "Nima qilmoqchisiz?", { reply_markup: { inline_keyboard: [[cb(EM.money + " Sotaman", "t:sotuv"), cb(EM.cart + " Sotib olaman", "t:xarid")]] } });
    case "cat":
      return send(chat_id, "Kategoriyani tanlang:", { reply_markup: { inline_keyboard: rowsOf(CATEGORIES.map((c) => cb(c.title, "c:" + c.key)), 2) } });
    case "breed":
      return send(chat_id, "Zotini tanlang yoki yozing:", { reply_markup: { inline_keyboard: rowsOf((BREEDS[d.category] || []).map((b) => cb(b, "s:breed:" + b)), 2) } });
    case "gender":
      return send(chat_id, "Jinsini tanlang yoki yozing:", { reply_markup: { inline_keyboard: rowsOf((GENDERS[d.category] || []).map((g) => cb(g, "s:gender:" + g)), 3) } });
    case "age":
      return send(chat_id, "Yoshini yozing (masalan: 2 yosh yoki 8 oylik):");
    case "weight":
      return send(chat_id, "Taxminiy vaznini kg da yozing (masalan: 450):");
    case "health":
      return send(chat_id, "Holati qanday?", { reply_markup: { inline_keyboard: [HEALTH.map((h) => cb(h[1], "s:health:" + h[0]))] } });
    case "purpose":
      return send(chat_id, "Maqsadi:", { reply_markup: { inline_keyboard: [PURPOSE.map((p) => cb(p[1], "s:purpose:" + p[0]))] } });
    case "product":
      return send(chat_id, "Mahsulot nomini tanlang yoki yozing:", { reply_markup: { inline_keyboard: rowsOf((PRODUCTS[d.category] || []).map((p) => cb(p, "s:product:" + p)), 2) } });
    case "quantity":
      return send(chat_id, "Miqdorini yozing (faqat raqam, masalan: 500):");
    case "unit":
      return send(chat_id, "O'lchov birligi:", { reply_markup: { inline_keyboard: rowsOf(UNITS.map((u) => cb(u[1], "s:unit:" + u[0])), 3) } });
    case "price":
      return send(chat_id, d.type === "xarid"
        ? "Eng ko'pi bilan necha so'm to'lay olasiz? (masalan: 15000000)"
        : "Narxini so'mda yozing (umumiy narx, masalan: 15000000):");
    case "region":
      return send(chat_id, "Viloyatni tanlang:", { reply_markup: { inline_keyboard: rowsOf(REGIONS.map((r, i) => cb(r, "r:" + i)), 2) } });
    case "district":
      return send(chat_id, "Tumanni yozing (masalan: Pastdarg'om):");
    case "photos": {
      const rows = [[cb(EM.check + " Tayyor", "p:done")]];
      if (d.type === "xarid") rows.push([cb(EM.skip + " Rasmsiz davom etish", "p:skip")]);
      return send(chat_id, EM.camera + " Rasmlarni yuboring (1 dan " + MAX_PHOTOS + " tagacha). Tugagach \"Tayyor\" tugmasini bosing.", { reply_markup: { inline_keyboard: rows } });
    }
    case "phone":
      return send(chat_id, EM.mobile + " Xaridorlar bog'lanishi uchun telefon raqamingizni ulashing. Pastdagi tugmani bosing:", {
        reply_markup: { keyboard: [[{ text: EM.mobile + " Raqamni ulashish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      });
    case "confirm":
      return send(chat_id, await summary(d), {
        reply_markup: { inline_keyboard: [[cb(EM.check + " Joylash", "ok"), cb(EM.cross + " Bekor qilish", "cancel")]] },
      });
  }
}

async function summary(d) {
  const lines = [EM.megaphone + " E'lonni tekshiring:", "", catTitle(d.category) + (d.type === "xarid" ? " (sotib olinadi)" : " (sotiladi)")];
  if (isAnimal(d.category)) {
    lines.push("Zot: " + d.breed + ", " + d.gender, "Yosh: " + d.age, "Vazn: " + d.weight + " kg",
      "Holati: " + (LABELS[d.health] || d.health), "Maqsadi: " + (LABELS[d.purpose] || d.purpose));
  } else {
    lines.push("Mahsulot: " + d.product, "Miqdor: " + d.quantity + " " + (LABELS[d.unit] || d.unit));
  }
  lines.push("Narx: " + fmt(d.price) + " so'm", "Hudud: " + d.region + ", " + d.district);
  lines.push("Rasmlar: " + d.photoCount + " ta");
  if (d.phone) lines.push("Telefon: " + d.phone);
  lines.push("", "\"Joylash\" tugmasini bosib, platforma qoidalariga rozilik bildirasiz.");
  return lines.join("\n");
}

async function advance(chat_id, tid, d, cur) {
  const step = nextStep(d, cur);
  if (step === "confirm") d.photoCount = (await listPhotos(tid)).length;
  await saveSession(tid, step, d);
  return prompt(chat_id, step, d);
}

// ---------- E'lonni bazaga yozish ----------
async function publish(chat_id, from, d) {
  const tid = from.id;
  let profileId;
  try {
    profileId = await ensureProfile(from, d.phone, d.phoneVerified);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recent = await rest("GET", "listings?seller_id=eq." + profileId + "&created_at=gte." + encodeURIComponent(since) + "&select=id");
    if (recent && recent.length >= DAILY_LIMIT) {
      await clearSession(tid);
      return send(chat_id, EM.warn + " Bir kunda ko'pi bilan " + DAILY_LIMIT + " ta e'lon joylash mumkin. Ertaga qayta urinib ko'ring.", { reply_markup: MENU });
    }
    const payload = { seller_id: profileId, category: d.category, listing_type: d.type, price: d.price, region: d.region, district: d.district };
    if (isAnimal(d.category)) {
      Object.assign(payload, { breed: d.breed, gender: d.gender, age_text: d.age, weight_kg: d.weight, weight_source: "seller", health_status: d.health, purpose: d.purpose });
    } else {
      Object.assign(payload, { product_name: d.product, quantity: d.quantity, unit: d.unit });
    }
    const rows = await rest("POST", "listings", payload, "return=representation");
    const listing = Array.isArray(rows) ? rows[0] : rows;

    const photos = await listPhotos(tid);
    const results = await Promise.allSettled(photos.map((p, i) => uploadPhoto(p.file_id, listing.id, i)));
    const failed = results.filter((x) => x.status === "rejected");
    failed.forEach((x) => console.error("Rasm yuklanmadi:", x.reason));
    await clearSession(tid);

    let text = EM.party + " E'lon joylandi!" + (listing.listing_code ? " Kod: " + listing.listing_code : "") + "\n" + EM.link + " " + SITE_URL + "/?listing=" + listing.id;
    if (failed.length) text += "\n\n" + EM.warn + " " + failed.length + " ta rasm yuklanmadi. Saytdan qo'shishingiz mumkin.";
    return send(chat_id, text, { reply_markup: MENU });
  } catch (e) {
    console.error("Joylashda xato:", e);
    await saveSession(tid, "confirm", d).catch(() => {});
    return send(chat_id, EM.warn + " Xatolik yuz berdi. Birozdan keyin \"Joylash\" tugmasini qayta bosing.", {
      reply_markup: { inline_keyboard: [[{ text: EM.check + " Joylash", callback_data: "ok" }, { text: EM.cross + " Bekor qilish", callback_data: "cancel" }]] },
    });
  }
}

// ---------- Menyu ----------
function menuAction(text) {
  if (!text || text.length > 40) return null;
  if (text.indexOf("joylashtirish") >= 0) return "add";
  if (text.indexOf("Kategoriyalar") >= 0) return "cats";
  if (text.indexOf("ko'rish") >= 0) return "browse";
  if (text.indexOf("Mening") >= 0) return "mine";
  if (text.indexOf("Hudud") >= 0 || text.indexOf("VIP") >= 0) return "soon";
  if (text.indexOf("Yordam") >= 0) return "help";
  return null;
}

async function startListing(chat_id, from) {
  const p = await findProfile(from.id);
  const d = { hasPhone: !!(p && p.phone) };
  await saveSession(from.id, "type", d);
  await send(chat_id, EM.megaphone + " Yangi e'lon. Istalgan paytda bekor qilish uchun /cancel yozing.", { reply_markup: MENU });
  return prompt(chat_id, "type", d);
}

async function runMenu(action, chat_id, from) {
  if (action === "add") return startListing(chat_id, from);
  if (action === "cats") return send(chat_id, EM.folder + " Kategoriyani tanlang:", { reply_markup: categoryKeyboard() });
  if (action === "browse") return showListings(chat_id, "", EM.search + " So'nggi e'lonlar:");
  if (action === "mine") {
    const p = await findProfile(from.id);
    if (!p) return send(chat_id, "Sizda hali e'lon yo'q.", { reply_markup: MENU });
    const rows = await rest("GET", "listings?seller_id=eq." + p.id + "&select=id,category,listing_type,listing_code,status,breed,gender,weight_kg,product_name,quantity,unit,price,region&order=created_at.desc&limit=10");
    if (!rows || !rows.length) return send(chat_id, "Sizda hali e'lon yo'q.", { reply_markup: MENU });
    return send(chat_id, EM.user + " Sizning e'lonlaringiz:\n\n" + rows.map((l) => listingLine(l) + (l.status === "sold" ? "\n(sotilgan)" : "")).join("\n\n"), { reply_markup: MENU });
  }
  if (action === "help") return send(chat_id, EM.phone + " Savol va takliflar uchun saytimizga kiring: " + SITE_URL, { reply_markup: MENU });
  return send(chat_id, EM.construction + " Bu bo'lim tez orada ishga tushadi.", { reply_markup: MENU });
}

// ---------- Xabarlar ----------
async function onMessage(msg) {
  if (!msg.chat || msg.chat.type !== "private" || !msg.from) return;
  const chat_id = msg.chat.id;
  const from = msg.from;
  const text = (msg.text || "").trim();

  if (text.indexOf("/start") === 0) {
    await clearSession(from.id);
    return send(chat_id, EM.cow + " CHORVA MARKET\n\nMolni bozorga olib bormang. Xaridoringizni toping.\n\nQuyidagi menyudan tanlang " + EM.down, { reply_markup: MENU });
  }
  if (text.indexOf("/cancel") === 0) {
    await clearSession(from.id);
    return send(chat_id, "Bekor qilindi.", { reply_markup: MENU });
  }

  const session = await getSession(from.id);
  const action = menuAction(text);
  if (action) {
    if (session) await clearSession(from.id);
    return runMenu(action, chat_id, from);
  }
  if (!session) {
    return send(chat_id, "Quyidagi menyudan tanlang " + EM.down, { reply_markup: MENU });
  }

  const d = session.data || {};
  const step = session.step;

  if (step === "photos" && msg.photo) {
    const count = (await listPhotos(from.id)).length;
    if (count >= MAX_PHOTOS) return send(chat_id, "Ko'pi bilan " + MAX_PHOTOS + " ta rasm. \"Tayyor\" tugmasini bosing.");
    const best = msg.photo[msg.photo.length - 1];
    await rest("POST", "bot_photos", { telegram_id: from.id, file_id: best.file_id }, "return=minimal");
    return send(chat_id, EM.check + " Rasm qabul qilindi. Yana yuboring yoki \"Tayyor\" tugmasini bosing.");
  }

  if (step === "phone" && msg.contact) {
    if (msg.contact.user_id !== from.id) return send(chat_id, "Iltimos, faqat o'zingizning raqamingizni ulashing.");
    d.phone = "+" + String(msg.contact.phone_number).replace(/\D/g, "");
    d.phoneVerified = true;
    await send(chat_id, EM.check + " Raqam qabul qilindi.", { reply_markup: MENU });
    return advance(chat_id, from.id, d, "phone");
  }

  if (!text) return send(chat_id, "Iltimos, so'ralgan ma'lumotni yuboring yoki /cancel yozing.");

  if (step === "breed" || step === "gender" || step === "product") {
    if (text.length > 60) return send(chat_id, "Juda uzun. Qisqaroq yozing.");
    d[step] = text;
    return advance(chat_id, from.id, d, step);
  }
  if (step === "age" || step === "district") {
    if (text.length > 60) return send(chat_id, "Juda uzun. Qisqaroq yozing.");
    d[step] = text;
    return advance(chat_id, from.id, d, step);
  }
  if (step === "weight" || step === "quantity") {
    const n = parseFloat(text.replace(",", ".").replace(/\s/g, ""));
    if (!n || n <= 0 || n > 1000000) return send(chat_id, "Iltimos, faqat raqam yozing (masalan: 450).");
    d[step] = n;
    return advance(chat_id, from.id, d, step);
  }
  if (step === "price") {
    const n = parseInt(text.replace(/\D/g, ""), 10);
    if (!n || n <= 0 || n > 100000000000) return send(chat_id, "Iltimos, narxni raqam bilan yozing (masalan: 15000000).");
    d.price = n;
    return advance(chat_id, from.id, d, step);
  }
  return send(chat_id, "Iltimos, yuqoridagi tugmalardan birini tanlang yoki /cancel yozing.");
}

// ---------- Tugmalar ----------
async function onCallback(cq) {
  const chat_id = cq.message.chat.id;
  const message_id = cq.message.message_id;
  const from = cq.from;
  const data = cq.data || "";
  const answer = (text, alert) => tg("answerCallbackQuery", { callback_query_id: cq.id, text: text, show_alert: !!alert });
  const mark = (label) => tg("editMessageText", { chat_id: chat_id, message_id: message_id, text: (cq.message.text || "") + "\n\n" + EM.check + " " + label });

  // Kategoriyalar bo'yicha ko'rish
  if (data === "cats") {
    await answer();
    return tg("editMessageText", { chat_id: chat_id, message_id: message_id, text: EM.folder + " Kategoriyani tanlang:", reply_markup: categoryKeyboard() });
  }
  if (data.indexOf("cat:") === 0) {
    await answer();
    const key = data.slice(4);
    if (!CATEGORIES.find((c) => c.key === key)) return;
    return showListings(chat_id, "&category=eq." + key, catTitle(key) + " - so'nggi e'lonlar:", backCats());
  }

  // E'lon joylash
  const session = await getSession(from.id);
  if (!session) {
    await answer("Bu so'rov eskirgan. Qaytadan boshlang.", true);
    return;
  }
  const d = session.data || {};
  const step = session.step;

  if (data === "cancel") {
    await answer();
    await clearSession(from.id);
    await tg("editMessageReplyMarkup", { chat_id: chat_id, message_id: message_id, reply_markup: { inline_keyboard: [] } });
    return send(chat_id, "Bekor qilindi.", { reply_markup: MENU });
  }
  if (data === "ok") {
    if (step !== "confirm") { await answer(); return; }
    const locked = await lockSession(from.id, "confirm", "publishing");
    if (!locked) { await answer(); return; }
    await answer("Joylanmoqda...");
    await tg("editMessageReplyMarkup", { chat_id: chat_id, message_id: message_id, reply_markup: { inline_keyboard: [] } });
    return publish(chat_id, from, locked.data || d);
  }

  if (data.indexOf("t:") === 0 && step === "type") {
    const v = data.slice(2);
    if (v !== "sotuv" && v !== "xarid") return answer();
    d.type = v;
    await answer();
    await mark(v === "sotuv" ? "Sotaman" : "Sotib olaman");
    return advance(chat_id, from.id, d, "type");
  }
  if (data.indexOf("c:") === 0 && step === "cat") {
    const key = data.slice(2);
    if (!CATEGORIES.find((c) => c.key === key)) return answer();
    d.category = key;
    await answer();
    await mark(catTitle(key));
    return advance(chat_id, from.id, d, "cat");
  }
  if (data.indexOf("s:") === 0) {
    const parts = data.split(":");
    const field = parts[1];
    const value = parts.slice(2).join(":");
    if (field !== step) return answer();
    if (field === "health" && !HEALTH.find((x) => x[0] === value)) return answer();
    if (field === "purpose" && !PURPOSE.find((x) => x[0] === value)) return answer();
    if (field === "unit" && !UNITS.find((x) => x[0] === value)) return answer();
    d[field] = value;
    await answer();
    await mark(LABELS[value] || value);
    return advance(chat_id, from.id, d, field);
  }
  if (data.indexOf("r:") === 0 && step === "region") {
    const region = REGIONS[parseInt(data.slice(2), 10)];
    if (!region) return answer();
    d.region = region;
    await answer();
    await mark(region);
    return advance(chat_id, from.id, d, "region");
  }
  if (data === "p:done" && step === "photos") {
    const count = (await listPhotos(from.id)).length;
    if (count < 1 && d.type !== "xarid") return answer("Kamida 1 ta rasm yuboring.", true);
    await answer();
    await tg("editMessageReplyMarkup", { chat_id: chat_id, message_id: message_id, reply_markup: { inline_keyboard: [] } });
    return advance(chat_id, from.id, d, "photos");
  }
  if (data === "p:skip" && step === "photos" && d.type === "xarid") {
    await answer();
    await tg("editMessageReplyMarkup", { chat_id: chat_id, message_id: message_id, reply_markup: { inline_keyboard: [] } });
    return advance(chat_id, from.id, d, "photos");
  }
  return answer();
}

// ---------- Kirish nuqtasi ----------
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Chorva Market bot ishlayapti");
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
    return res.status(403).send("forbidden");
  }
  const update = req.body || {};
  try {
    if (update.callback_query) await onCallback(update.callback_query);
    else if (update.message) await onMessage(update.message);
  } catch (e) {
    console.error("Bot xatosi:", e);
    try {
      const chat = (update.message && update.message.chat) || (update.callback_query && update.callback_query.message.chat);
      if (chat) await send(chat.id, EM.warn + " Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.", { reply_markup: MENU });
    } catch (e2) { /* e'tiborsiz */ }
  }
  return res.status(200).json({ ok: true });
};
