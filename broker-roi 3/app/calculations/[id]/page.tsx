import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadRefData } from "@/lib/data";
import { defaultInputs } from "@/lib/defaults";
import Calculator from "@/components/Calculator";
import type { CalcInputs } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditCalc({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const [ref, { data: calc }] = await Promise.all([
    loadRefData(sb),
    sb.from("calculations").select("id, inputs, share_token").eq("id", params.id).maybeSingle(),
  ]);
  if (!calc) notFound();
  // Merge with defaults so calculations saved by older versions still open
  const inputs: CalcInputs = { ...defaultInputs(ref), ...(calc.inputs as CalcInputs) };
  return <Calculator refData={ref} initial={inputs} id={calc.id} shareToken={calc.share_token} />;
}
