import type { CalcInputs } from "./types";
import type { RefData } from "./data";

export function rentFor(ref: RefData, areaId: string, bedrooms: number) {
  return ref.rents.find((r) => r.area_id === areaId && r.bedrooms === bedrooms)?.annual_rent ?? 0;
}

export function defaultInputs(ref: RefData): CalcInputs {
  const area = ref.areas.find((a) => a.id === "jvc") ?? ref.areas[0];
  const dev = ref.developers[0];
  const bedrooms = 1;
  const sizeSqft = 750;
  return {
    dealType: "offplan",
    clientName: "",
    areaId: area?.id ?? "",
    developerId: dev?.id ?? null,
    projectName: "",
    bedrooms,
    sizeSqft,
    price: Math.round(((area?.price_psf ?? 1500) * sizeSqft) / 1000) * 1000,
    handoverMonths: 30,
    bookingPct: 20,
    preHandoverPct: 60,
    dldWaived: false,
    financing: "cash",
    downPaymentPct: 20,
    interestRatePct: 4.5,
    termYears: 25,
    annualRent: area ? rentFor(ref, area.id, bedrooms) : 0,
    vacancyPct: 5,
    serviceChargePsf: area?.service_charge_psf ?? 15,
    maintenancePct: 3,
    managementPct: 5,
    growthPct: area?.growth_pct ?? 3,
    horizonYears: 5,
    flipMonth: 12,
    flipUpliftPct: 10,
    fees: { ...ref.fees },
    resaleThresholdPct: dev?.resale_threshold_pct ?? 40,
    nocFee: dev?.noc_fee ?? 5000,
    assignmentFee: dev?.assignment_fee ?? 0,
  };
}
