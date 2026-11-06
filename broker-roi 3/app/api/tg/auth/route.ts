import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { tgEmail, TG_EMAIL_DOMAIN, verifyInitData } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signs the broker in with their Telegram account. No passwords, no e-mail confirmation.
export async function POST(req: Request) {
  const { initData } = await req.json().catch(() => ({ initData: "" }));
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  const tg = verifyInitData(String(initData || ""), token);
  if (!tg) return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });

  const admin = supabaseAdmin();
  const email = tgEmail(tg.id);

  // Create the account on first visit (an "already registered" error just means it exists)
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: tg.id } });
  if (created.error && !/already|exists|registered/i.test(created.error.message)) {
    return NextResponse.json({ error: created.error.message }, { status: 500 });
  }

  // Mint a one-time login token and exchange it for a session cookie
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) return NextResponse.json({ error: link.error.message }, { status: 500 });
  const sb = supabaseServer();
  const { data, error } = await sb.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Login failed" }, { status: 500 });

  // Link the Telegram chat and pre-fill the name on first login
  const { data: prof } = await admin.from("profiles").select("full_name, phone, email").eq("id", data.user.id).single();
  const patch: Record<string, unknown> = { telegram_id: tg.id };
  if (!prof?.full_name) patch.full_name = [tg.first_name, tg.last_name].filter(Boolean).join(" ");
  if (prof?.email?.endsWith("@" + TG_EMAIL_DOMAIN)) patch.email = "";
  await admin.from("profiles").update(patch).eq("id", data.user.id);

  // Interface language follows the Telegram app language on first visit
  if (!cookies().get("lang")) {
    cookies().set("lang", tg.language_code?.startsWith("ru") ? "ru" : "en",
      { path: "/", maxAge: 31536000, sameSite: "none", secure: true });
  }
  return NextResponse.json({ ok: true, needsProfile: !prof?.phone });
}
