// Renders sample reports locally without Supabase: npx tsx scripts/pdf-preview.tsx
import React from "react";
import fs from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDoc } from "../lib/pdf/Report";
import { calculate } from "../lib/calc";
import { DEFAULT_FEES } from "../lib/data";
import type { Area, CalcInputs, Developer } from "../lib/types";

const area: Area = {
  id: "jvc", name_en: "Jumeirah Village Circle", name_ru: "Джумейра Вилладж Серкл (JVC)",
  highlights_en: ["No metro: nearest station Mall of the Emirates (Red Line), feeder bus J01", "By car: Dubai Mall ~21 min, Dubai Marina ~20 min, DXB airport ~38 min", "Schools: JSS International (1 km), Sunmarke (1.8 km); 14 nearby schools rated Very Good or Outstanding", "Circle Mall with cinema, 33 landscaped parks, Miracle Garden 3.7 km"],
  highlights_ru: ["Метро в районе нет: ближайшая станция Mall of the Emirates (красная ветка), автобус J01", "На машине: Dubai Mall ~21 мин, Дубай Марина ~20 мин, аэропорт DXB ~38 мин", "Школы: JSS International (1 км), Sunmarke (1,8 км); рядом 14 школ с рейтингом Very Good или Outstanding", "Circle Mall с кинотеатром, 33 парка, Miracle Garden в 3,7 км"],
  has_metro: false, price_psf: 1313, service_charge_psf: 13, growth_pct: 3, price_change_pct: 3.7,
  source: "Prices: Property Monitor H1 2026; rents: Bayut asking Oct 2026", updated_at: "2026-10-01",
};
const dev: Developer = { id: "emaar", name: "Emaar", resale_threshold_pct: 30, noc_fee: 5250, assignment_fee: 0, notes: null };
const base: CalcInputs = {
  dealType: "offplan", clientName: "Alexey Ivanov", areaId: "jvc", developerId: "emaar", projectName: "Sample Residences",
  bedrooms: 1, sizeSqft: 750, price: 1100000, handoverMonths: 30, bookingPct: 20, preHandoverPct: 60, dldWaived: false,
  financing: "cash", downPaymentPct: 20, interestRatePct: 4.5, termYears: 25, annualRent: 68000, vacancyPct: 5,
  serviceChargePsf: 13, maintenancePct: 3, managementPct: 5, growthPct: 4, horizonYears: 5, flipMonth: 12, flipUpliftPct: 10,
  fees: DEFAULT_FEES, resaleThresholdPct: 30, nocFee: 5250, assignmentFee: 0,
};
const profile = { full_name: "Maria Petrova", agency: "Palm Bay Realty", brn: "54321", phone: "+971 50 123 4567", whatsapp: "", email: "maria@palmbay.ae" };

(async () => {
  for (const [name, inp, lang] of [
    ["offplan_ru", base, "ru"], ["offplan_en", base, "en"],
    ["secondary_en", { ...base, dealType: "secondary", financing: "mortgage" } as CalcInputs, "en"],
  ] as const) {
    const res = calculate(inp, area.price_psf);
    const buf = await renderToBuffer(<ReportDoc inputs={inp} res={res} area={area} developer={dev} profile={profile} logo={null} lang={lang} />);
    fs.writeFileSync(`/tmp/${name}.pdf`, buf);
    console.log(name, buf.length);
  }
})();
