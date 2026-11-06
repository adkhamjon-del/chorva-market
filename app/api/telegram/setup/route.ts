export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!token || !secret) {
    return Response.json({ error: "env topilmadi", token: !!token, secret: !!secret });
  }

  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());

  const hook = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://chorva-market-olive.vercel.app/api/telegram",
      secret_token: secret,
    }),
  }).then((r) => r.json());

  return Response.json({
    getMe_ok: me.ok,
    username: me.result?.username,
    getMe_error: me.description,
    webhook: hook,
  });
}
