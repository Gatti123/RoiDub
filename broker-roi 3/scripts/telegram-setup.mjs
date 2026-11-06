// One-time bot setup: webhook for /start, menu button that opens the app, bot description.
// Run:  TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app node scripts/telegram-setup.mjs
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!token || !secret || !site.startsWith("https://")) {
  console.error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL (https://...)");
  process.exit(1);
}
const call = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json();
  console.log(method.padEnd(22), j.ok ? "ok" : `FAILED: ${j.description}`);
};
await call("setWebhook", { url: `${site}/api/tg/webhook`, secret_token: secret, allowed_updates: ["message"] });
await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Калькулятор", web_app: { url: `${site}/login` } } });
await call("setMyCommands", { commands: [{ command: "start", description: "Открыть калькулятор / Open calculator" }] });
await call("setMyDescription", { description: "ROI, доходность и переуступка по недвижимости Дубая. Брендированный PDF для клиента за две минуты." });
await call("setMyShortDescription", { short_description: "Инвестиционные отчёты для брокеров Дубая" });
