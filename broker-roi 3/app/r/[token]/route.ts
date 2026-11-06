import { supabaseAdmin } from "@/lib/supabase/server";
import { buildReport, pdfResponse } from "@/lib/pdf/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public link the broker sends to a client: the unguessable share_token is the access key
export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) return new Response("Not found", { status: 404 });
  const lang = new URL(req.url).searchParams.get("lang") === "ru" ? "ru" : "en";
  const out = await buildReport(supabaseAdmin(), { token: params.token }, lang);
  if (!out) return new Response("Not found", { status: 404 });
  return pdfResponse(out.buffer, out.filename, "inline");
}
