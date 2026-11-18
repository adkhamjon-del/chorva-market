// /sitemap.xml: faol e'lonlar ro'yxati (Google uchun)
const SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SB_KEY = (process.env.SUPABASE_SECRET_KEY || "").trim();
const SITE_URL = "https://chorva-market-olive.vercel.app";

module.exports = async (req, res) => {
  try {
    const headers = { apikey: SB_KEY };
    if (SB_KEY.startsWith("eyJ")) headers.Authorization = "Bearer " + SB_KEY;
    const r = await fetch(SB_URL + "/rest/v1/listings?status=eq.active&select=id,created_at,updated_at&order=created_at.desc&limit=5000", { method: "GET", headers: headers });
    if (!r.ok) throw new Error("db " + r.status);
    const rows = await r.json();
    const urls = ["<url><loc>" + SITE_URL + "/</loc></url>"].concat(
      rows.map((l) => {
        const d = String(l.updated_at || l.created_at || "").slice(0, 10);
        return "<url><loc>" + SITE_URL + "/l/" + l.id + "</loc>" + (d ? "<lastmod>" + d + "</lastmod>" : "") + "</url>";
      })
    );
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join("") + "</urlset>");
  } catch (e) {
    res.statusCode = 500;
    return res.end("Vaqtincha xatolik");
  }
};
