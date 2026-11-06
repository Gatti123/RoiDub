import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildReport } from "@/lib/pdf/build";
import { tgApi } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends the PDF into the broker's chat with the bot, ready to forward to the client
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await sb.from("profiles").select("telegram_id").eq("id", user.id).single();
  if (!prof?.telegram_id) return NextResponse.json({ error: "no_telegram" }, { status: 400 });

  const lang = new URL(req.url).searchParams.get("lang") === "ru" ? "ru" : "en";
  const out = await buildReport(sb, { id: params.id }, lang);
  if (!out) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = new FormData();
  form.append("chat_id", String(prof.telegram_id));
  form.append("document", new Blob([out.buffer], { type: "application/pdf" }), out.filename);
  form.append("caption", lang === "ru" ? "Отчёт готов. Перешлите его клиенту." : "Your report is ready. Forward it to the client.");
  const r = await tgApi("sendDocument", form);
  if (!r.ok) {
    const blocked = r.error_code === 403;
    return NextResponse.json({ error: blocked ? "bot_blocked" : r.description || "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
