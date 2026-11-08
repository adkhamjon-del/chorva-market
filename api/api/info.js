module.exports = async (req, res) => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || “”).trim();
  if (!token) {
    return res.status(200).json({ error: “token topilmadi” });
  }

  const info = await fetch(
    https://api.telegram.org/bot${token}/getWebhookInfo
  ).then((r) => r.json());

  const r = info.result || {};
  return res.status(200).json({
    ok: info.ok,
    url: r.url,
    pending_update_count: r.pending_update_count,
    last_error_date: r.last_error_date,
    last_error_message: r.last_error_message,
  });
};
