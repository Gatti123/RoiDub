import crypto from "crypto";

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string };

/** Verify Telegram Mini App initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app). */
export function verifyInitData(initData: string, botToken: string, maxAgeSec = 86400): TgUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") || "null"); } catch { return null; }
}

/** Internal login e-mail for a Telegram account. Never shown to anyone. */
export const TG_EMAIL_DOMAIN = "tg.yielddesk.app";
export const tgEmail = (id: number) => `tg-${id}@${TG_EMAIL_DOMAIN}`;

export async function tgApi(method: string, body: Record<string, unknown> | FormData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const isForm = body instanceof FormData;
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  return r.json() as Promise<{ ok: boolean; description?: string; error_code?: number; result?: unknown }>;
}
