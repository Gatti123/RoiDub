import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculate } from "../calc";
import { loadRefData } from "../data";
import type { CalcInputs, Lang } from "../types";
import { ReportDoc, type BrokerProfile } from "./Report";

async function fetchLogo(url: string | null) {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "";
    const format = type.includes("png") || url.toLowerCase().endsWith(".png") ? "png" : "jpg";
    return { data: Buffer.from(await r.arrayBuffer()), format } as const;
  } catch {
    return null;
  }
}

/**
 * Builds the PDF for a calculation. `sb` must be able to read the calculation row
 * (the broker's own session, or the service-role client for shared links).
 */
export async function buildReport(sb: SupabaseClient, where: { id?: string; token?: string }, lang: Lang) {
  let q = sb.from("calculations").select("id, broker_id, client_name, inputs");
  q = where.id ? q.eq("id", where.id) : q.eq("share_token", where.token!);
  const { data: calc } = await q.maybeSingle();
  if (!calc) return null;

  const [ref, { data: prof }] = await Promise.all([
    loadRefData(sb),
    sb.from("profiles").select("*").eq("id", calc.broker_id).maybeSingle(),
  ]);
  const inputs = calc.inputs as CalcInputs;
  const area = ref.areas.find((a) => a.id === inputs.areaId);
  const developer = ref.developers.find((d) => d.id === inputs.developerId);
  // Recompute on the server so the PDF always matches the engine, not stale stored numbers
  const res = calculate(inputs, area?.price_psf ?? 0);
  const profile: BrokerProfile = {
    full_name: prof?.full_name ?? "", agency: prof?.agency ?? "", brn: prof?.brn ?? "",
    phone: prof?.phone ?? "", whatsapp: prof?.whatsapp ?? "", email: prof?.email ?? "",
  };
  const logo = await fetchLogo(prof?.logo_url ?? null);

  const buffer = await renderToBuffer(
    React.createElement(ReportDoc, { inputs, res, area, developer, profile, logo, lang }) as any,
  );
  const slug = (inputs.projectName || area?.name_en || "property").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const client = (calc.client_name || "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${["Investment-analysis", slug, client].filter(Boolean).join("_")}_${lang.toUpperCase()}.pdf`;
  return { buffer, filename };
}

export function pdfResponse(buffer: Buffer, filename: string, disposition: "attachment" | "inline") {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
