import { NextResponse } from "next/server";
import { tgApi } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Replies to /start (and any other text) with a button that opens the calculator
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (msg?.chat?.id && msg.chat.type === "private") {
    const ru = String(msg.from?.language_code || "").startsWith("ru");
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    await tgApi("sendMessage", {
      chat_id: msg.chat.id,
      text: ru
        ? "Yield Desk — инвестиционный отчёт для клиента за две минуты.\n\nОткройте калькулятор, один раз заполните профиль (имя, телефон, логотип по желанию), и отчёты будут приходить сюда в PDF."
        : "Yield Desk — an investment report for your client in two minutes.\n\nOpen the calculator, fill in your profile once (name, phone, optional logo), and reports will arrive here as PDFs.",
      reply_markup: { inline_keyboard: [[{ text: ru ? "Открыть калькулятор" : "Open calculator", web_app: { url: `${site}/login` } }]] },
    });
  }
  return NextResponse.json({ ok: true });
}
