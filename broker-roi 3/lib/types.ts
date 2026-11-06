export type Lang = "en" | "ru";
export type DealType = "offplan" | "secondary";
export type Financing = "cash" | "mortgage";

export interface Area {
  id: string;
  name_en: string;
  name_ru: string;
  highlights_en: string[];
  highlights_ru: string[];
  has_metro: boolean;
  price_psf: number;
  service_charge_psf: number;
  growth_pct: number;
  price_change_pct: number | null; // observed change, reference only
  source: string | null;
  updated_at: string;
}

export interface AreaRent {
  area_id: string;
  bedrooms: number; // 0 = studio
  annual_rent: number;
}

export interface Developer {
  id: string;
  name: string;
  resale_threshold_pct: number;
  noc_fee: number;
  assignment_fee: number;
  notes: string | null;
}

export interface FeeSettings {
  dld_pct: number;
  dld_admin_fee: number;
  trustee_fee: number;
  agent_pct: number;
  vat_pct: number;
  mortgage_reg_pct: number;
  mortgage_reg_fixed: number;
  resale_noc_fee: number;
}

export interface PlanItem {
  pct: number;   // % of price
  month: number; // months after purchase
}

export interface CalcInputs {
  dealType: DealType;
  clientName: string;
  areaId: string;
  developerId: string | null;
  projectName: string;
  bedrooms: number;
  sizeSqft: number;
  price: number;

  // off-plan
  handoverMonths: number;      // months from purchase to handover
  bookingPct: number;          // paid at purchase, % of price
  preHandoverPct: number;      // total paid before handover incl. booking (e.g. 60 in a 60/40 plan)
  dldWaived: boolean;

  // secondary
  financing: Financing;
  downPaymentPct: number;
  interestRatePct: number;
  termYears: number;

  // assumptions
  annualRent: number;
  vacancyPct: number;
  serviceChargePsf: number;
  maintenancePct: number;   // % of rent
  managementPct: number;    // % of rent
  growthPct: number;        // annual price growth
  horizonYears: number;

  // flip (off-plan)
  flipMonth: number;
  flipUpliftPct: number;

  // fee snapshot (editable per calculation)
  fees: FeeSettings;
  resaleThresholdPct: number;
  nocFee: number;
  assignmentFee: number;
}

export interface FlipResult {
  month: number;
  paidPct: number;
  eligible: boolean;
  thresholdPct: number;
  invested: number;
  salePrice: number;
  premium: number;
  sellCosts: number;
  profit: number;
  roiPct: number;
  irrPct: number | null;
}

export interface RentResult {
  startsMonth: number;
  grossRent: number;
  netRent: number;
  serviceCharges: number;
  otherCosts: number;
  grossYieldPct: number;
  netYieldPct: number;
  annualDebtService: number;
  cashFlowYear: number;
  cashOnCashPct: number | null;
}

export interface HoldResult {
  years: number;
  exitPrice: number;
  sellCosts: number;
  loanBalance: number;
  totalRent: number;
  peakCash: number;
  profit: number;
  roiPct: number;
  irrPct: number | null;
  exitBeforeHandover: boolean;
}

export interface CalcResults {
  pricePsf: number;
  areaPsf: number;
  psfDiffPct: number;
  entryCosts: { label: string; amount: number }[];
  entryTotal: number;
  loan: number;
  monthlyPayment: number;
  cashAtPurchase: number;
  planTotalPct: number;
  flip: FlipResult | null;
  rent: RentResult;
  hold: HoldResult;
  warnings: string[]; // i18n keys
}
