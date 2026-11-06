import type { SupabaseClient } from "@supabase/supabase-js";
import type { Area, AreaRent, Developer, FeeSettings } from "./types";

export const DEFAULT_FEES: FeeSettings = {
  dld_pct: 4, dld_admin_fee: 580, trustee_fee: 4000, agent_pct: 2, vat_pct: 5,
  mortgage_reg_pct: 0.25, mortgage_reg_fixed: 290, resale_noc_fee: 3000,
};

export interface RefData {
  areas: Area[];
  rents: AreaRent[];
  developers: Developer[];
  fees: FeeSettings;
}

export async function loadRefData(sb: SupabaseClient): Promise<RefData> {
  const [a, r, d, f] = await Promise.all([
    sb.from("areas").select("*").order("name_en"),
    sb.from("area_rents").select("*"),
    sb.from("developers").select("*").order("sort"),
    sb.from("fee_settings").select("key,value"),
  ]);
  const fees: FeeSettings = { ...DEFAULT_FEES };
  for (const row of f.data ?? []) {
    if (row.key in fees) (fees as unknown as Record<string, number>)[row.key] = Number(row.value);
  }
  const num = <T extends object>(rows: T[] | null, keys: (keyof T)[]) =>
    (rows ?? []).map((x) => { const y = { ...x } as Record<string, unknown>; keys.forEach((k) => (y[k as string] = Number(y[k as string]))); return y as T; });
  return {
    areas: num<Area>(a.data as Area[], ["price_psf", "service_charge_psf", "growth_pct"]).map((x) => ({
      ...x, price_change_pct: x.price_change_pct === null || x.price_change_pct === undefined ? null : Number(x.price_change_pct),
    })),
    rents: num<AreaRent>(r.data as AreaRent[], ["annual_rent", "bedrooms"]),
    developers: num<Developer>(d.data as Developer[], ["resale_threshold_pct", "noc_fee", "assignment_fee"]),
    fees,
  };
}
