import { supabaseServer } from "@/lib/supabase/server";
import { loadRefData } from "@/lib/data";
import { defaultInputs } from "@/lib/defaults";
import Calculator from "@/components/Calculator";

export const dynamic = "force-dynamic";

export default async function NewCalc() {
  const ref = await loadRefData(supabaseServer());
  return <Calculator refData={ref} initial={defaultInputs(ref)} />;
}
