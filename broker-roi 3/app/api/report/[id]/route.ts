import { supabaseServer } from "@/lib/supabase/server";
import { buildReport, pdfResponse } from "@/lib/pdf/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Broker downloads their own report (RLS limits reads to their rows)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const lang = new URL(req.url).searchParams.get("lang") === "ru" ? "ru" : "en";
  const out = await buildReport(sb, { id: params.id }, lang);
  if (!out) return new Response("Not found", { status: 404 });
  return pdfResponse(out.buffer, out.filename, "attachment");
}
