// E'lon ulashish sahifasi: /l/<id>
// Telegram, WhatsApp va Google kabi botlarga rasm va matn bilan chiroyli ko'rinish beradi,
// oddiy foydalanuvchini esa saytdagi e'lon sahifasiga yo'naltiradi.
const SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SB_KEY = (process.env.SUPABASE_SECRET_KEY || "").trim();
const SITE_URL = "https://chorva-market-olive.vercel.app";
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|viber|twitter|slack|discord|linkedin|pinterest|skype|applebot|embedly|preview/i;
const UNITS = { kg: "kg", tonna: "tonna", boglam: "bog'lam", qop: "qop", dona: "dona" };
const ANIMALS = ["qoramol", "qoy", "ot", "echki"];

const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

async function rest(path) {
  const headers = { apikey: SB_KEY };
  if (SB_KEY.startsWith("eyJ")) headers.Authorization = "Bearer " + SB_KEY;
  const r = await fetch(SB_URL + "/rest/v1/" + path, { method: "GET", headers: headers });
  if (!r.ok) throw new Error("db " + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "").trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    res.statusCode = 404;
    return res.end("Topilmadi");
  }
  const target = SITE_URL + "/?listing=" + id;
  const ua = String((req.headers && req.headers["user-agent"]) || "");

  // Oddiy foydalanuvchi: to'g'ridan-to'g'ri saytga
  if (!BOT_RE.test(ua)) {
    res.statusCode = 302;
    res.setHeader("Location", target);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "User-Agent");
    return res.end();
  }

  try {
    const rows = await rest("listings?id=eq." + encodeURIComponent(id) + "&status=eq.active&select=id,category,listing_type,breed,gender,age_text,weight_kg,health_status,product_name,quantity,unit,price,region,district,listing_code,created_at");
    const l = rows && rows[0];
    if (!l) {
      res.statusCode = 404;
      return res.end("E'lon topilmadi yoki sotilgan");
    }
    const imgs = await rest("listing_images?listing_id=eq." + encodeURIComponent(id) + "&select=url&order=sort_order.asc&limit=1").catch(() => []);
    const image = imgs && imgs[0] ? imgs[0].url : "";

    const animal = ANIMALS.indexOf(l.category) >= 0;
    const name = animal
      ? ((l.breed || "") + " " + (l.gender || "")).trim() + (l.weight_kg ? ", " + l.weight_kg + " kg" : "")
      : (l.product_name || "E'lon") + (l.quantity ? ", " + l.quantity + " " + (UNITS[l.unit] || l.unit || "") : "");
    const kind = l.listing_type === "xarid" ? "Sotib olinadi: " : "";
    const title = kind + name + " - " + fmt(l.price) + " so'm | Chorva Market";
    const where = [l.region, l.district].filter(Boolean).join(", ");
    const desc = [where, animal && l.age_text ? "Yosh: " + l.age_text : "", l.listing_code ? "Kod: " + l.listing_code : ""].filter(Boolean).join(". ");
    const url = SITE_URL + "/l/" + l.id;

    const ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: name,
      description: desc,
      url: url,
      offers: { "@type": "Offer", price: String(l.price), priceCurrency: "UZS", availability: "https://schema.org/InStock" },
    };
    if (image) ld.image = image;

    const html = '<!doctype html><html lang="uz"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>" + esc(title) + "</title>" +
      '<meta name="description" content="' + esc(desc) + '">' +
      '<link rel="canonical" href="' + esc(url) + '">' +
      '<meta property="og:type" content="product"><meta property="og:site_name" content="Chorva Market">' +
      '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
      '<meta property="og:url" content="' + esc(url) + '">' +
      (image ? '<meta property="og:image" content="' + esc(image) + '">' : "") +
      '<meta name="twitter:card" content="' + (image ? "summary_large_image" : "summary") + '">' +
      '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>" +
      "<script>if(!/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)){location.replace(" + JSON.stringify(target) + ");}</script>" +
      "</head><body><h1>" + esc(name) + "</h1><p>" + esc(fmt(l.price)) + " so'm</p><p>" + esc(desc) + '</p><p><a href="' + esc(target) + '">Saytda ochish</a></p></body></html>';

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
    return res.end(html);
  } catch (e) {
    res.statusCode = 500;
    return res.end("Vaqtincha xatolik");
  }
};
