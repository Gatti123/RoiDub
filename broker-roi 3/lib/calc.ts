import type {
  CalcInputs, CalcResults, FlipResult, HoldResult, PlanItem, RentResult,
} from "./types";

const round = (n: number) => Math.round(n);

/** Monthly mortgage payment (annuity). */
export function monthlyPayment(loan: number, ratePct: number, years: number) {
  if (loan <= 0 || years <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

/** Outstanding loan balance after k monthly payments. */
export function loanBalance(loan: number, ratePct: number, years: number, k: number) {
  if (loan <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (k >= n) return 0;
  if (r === 0) return loan * (1 - k / n);
  const p = monthlyPayment(loan, ratePct, years);
  return loan * Math.pow(1 + r, k) - p * ((Math.pow(1 + r, k) - 1) / r);
}

/** Annualised IRR from monthly cash flows (index = month). Null if undefined. */
export function irrAnnual(flows: number[]): number | null {
  const npv = (r: number) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  let lo = -0.99, hi = 1;
  let fLo = npv(lo), fHi = npv(hi);
  if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) { lo = hi = mid; break; }
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  const monthly = (lo + hi) / 2;
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

/**
 * Simplified off-plan schedule from two numbers brokers always know:
 * booking % at purchase, then equal monthly payments up to the pre-handover total,
 * and the remainder on handover. E.g. booking 20, pre-handover 60 → "60/40".
 */
export function buildPlan(bookingPct: number, preHandoverPct: number, handover: number): PlanItem[] {
  const h = Math.max(1, Math.round(handover));
  const booking = Math.min(Math.max(bookingPct, 0), 100);
  const pre = Math.min(Math.max(preHandoverPct, booking), 100);
  const plan: PlanItem[] = [{ pct: booking, month: 0 }];
  const months = h - 1;
  if (pre > booking) {
    if (months >= 1) for (let m = 1; m <= months; m++) plan.push({ pct: (pre - booking) / months, month: m });
    else plan.push({ pct: pre - booking, month: h });
  }
  if (100 - pre > 0) plan.push({ pct: 100 - pre, month: h });
  return plan;
}

/** Monthly instalment during construction, % of price. */
export function monthlyPct(bookingPct: number, preHandoverPct: number, handover: number) {
  const months = Math.max(1, Math.round(handover)) - 1;
  const pre = Math.min(Math.max(preHandoverPct, bookingPct), 100);
  return months >= 1 ? (pre - bookingPct) / months : 0;
}

export function calculate(i: CalcInputs, areaPsf: number): CalcResults {
  const f = i.fees;
  const vat = 1 + f.vat_pct / 100;
  const warnings: string[] = [];
  const isOff = i.dealType === "offplan";

  const pricePsf = i.sizeSqft > 0 ? i.price / i.sizeSqft : 0;
  const psfDiffPct = areaPsf > 0 && pricePsf > 0 ? (pricePsf / areaPsf - 1) * 100 : 0;

  // ---------- Entry costs ----------
  const entryCosts: { label: string; amount: number }[] = [];
  if (!(isOff && i.dldWaived)) entryCosts.push({ label: "cost_dld", amount: (i.price * f.dld_pct) / 100 });
  entryCosts.push({ label: "cost_dld_admin", amount: f.dld_admin_fee });
  const useMortgage = !isOff && i.financing === "mortgage";
  const loan = useMortgage ? i.price * (1 - i.downPaymentPct / 100) : 0;
  if (!isOff) {
    entryCosts.push({ label: "cost_trustee", amount: f.trustee_fee * vat });
    entryCosts.push({ label: "cost_agent", amount: ((i.price * f.agent_pct) / 100) * vat });
    if (useMortgage) {
      entryCosts.push({ label: "cost_mortgage_reg", amount: (loan * f.mortgage_reg_pct) / 100 + f.mortgage_reg_fixed });
    }
  }
  const entryTotal = entryCosts.reduce((s, c) => s + c.amount, 0);
  const mPay = useMortgage ? monthlyPayment(loan, i.interestRatePct, i.termYears) : 0;

  // ---------- Payment schedule (price only) ----------
  const plan = isOff ? buildPlan(i.bookingPct, i.preHandoverPct, i.handoverMonths) : [{ pct: 100, month: 0 }];
  const planTotalPct = plan.reduce((s, p) => s + p.pct, 0);

  const ownPrincipal = useMortgage ? i.price - loan : null; // secondary + mortgage: down payment only
  const cashAtPurchase = isOff
    ? plan.filter(p => p.month === 0).reduce((s, p) => s + (p.pct / 100) * i.price, 0) + entryTotal
    : (ownPrincipal ?? i.price) + entryTotal;

  // ---------- Rent ----------
  const startsMonth = isOff ? i.handoverMonths + 1 : 1;
  const serviceCharges = i.serviceChargePsf * i.sizeSqft;
  const effectiveRent = i.annualRent * (1 - i.vacancyPct / 100);
  const otherCosts = i.annualRent * ((i.maintenancePct + i.managementPct) / 100);
  const netRent = effectiveRent - serviceCharges - otherCosts;
  const totalBasis = i.price + entryTotal;
  const annualDebt = mPay * 12;
  const cashInvestedSecondary = (ownPrincipal ?? i.price) + entryTotal;
  const rent: RentResult = {
    startsMonth,
    grossRent: i.annualRent,
    netRent,
    serviceCharges,
    otherCosts,
    grossYieldPct: i.price > 0 ? (i.annualRent / i.price) * 100 : 0,
    netYieldPct: totalBasis > 0 ? (netRent / totalBasis) * 100 : 0,
    annualDebtService: annualDebt,
    cashFlowYear: netRent - annualDebt,
    cashOnCashPct: useMortgage && cashInvestedSecondary > 0
      ? ((netRent - annualDebt) / cashInvestedSecondary) * 100 : null,
  };
  if (netRent < 0) warnings.push("warn_negative_rent");

  // ---------- Flip / assignment (off-plan) ----------
  let flip: FlipResult | null = null;
  if (isOff) {
    const m = Math.max(1, Math.round(i.flipMonth));
    const paidPct = plan.filter(p => p.month <= m).reduce((s, p) => s + p.pct, 0);
    const paid = (paidPct / 100) * i.price;
    const salePrice = i.price * (1 + i.flipUpliftPct / 100);
    const premium = salePrice - i.price;
    const sellCosts = i.nocFee * vat + i.assignmentFee * vat + ((salePrice * f.agent_pct) / 100) * vat;
    const invested = paid + entryTotal;
    const profit = premium - sellCosts - entryTotal;

    const flows: number[] = Array(m + 1).fill(0);
    flows[0] -= entryTotal;
    for (const p of plan) if (p.month <= m) flows[p.month] -= (p.pct / 100) * i.price;
    flows[m] += paid + premium - sellCosts;

    const eligible = paidPct + 1e-9 >= i.resaleThresholdPct;
    if (!eligible) warnings.push("warn_flip_threshold");
    if (m > i.handoverMonths) warnings.push("warn_flip_after_handover");

    flip = {
      month: m, paidPct, eligible, thresholdPct: i.resaleThresholdPct, invested,
      salePrice, premium, sellCosts, profit,
      roiPct: invested > 0 ? (profit / invested) * 100 : 0,
      irrPct: irrAnnual(flows),
    };
  }

  // ---------- Hold, rent and sell after N years ----------
  const N = Math.max(1, Math.round(i.horizonYears * 12));
  const flows: number[] = Array(N + 1).fill(0);
  if (isOff) {
    flows[0] -= entryTotal;
    for (const p of plan) {
      const mm = Math.min(p.month, N);
      flows[mm] -= (p.pct / 100) * i.price; // remaining instalments are settled at exit at the latest
    }
  } else {
    flows[0] -= (ownPrincipal ?? i.price) + entryTotal;
  }
  let totalRent = 0;
  for (let t = startsMonth; t <= N; t++) {
    flows[t] += netRent / 12;
    totalRent += netRent / 12;
    if (useMortgage) flows[t] -= mPay;
  }
  const exitPrice = i.price * Math.pow(1 + i.growthPct / 100, N / 12);
  const sellCosts = ((exitPrice * f.agent_pct) / 100) * vat + f.resale_noc_fee * vat;
  const bal = useMortgage ? loanBalance(loan, i.interestRatePct, i.termYears, N) : 0;
  flows[N] += exitPrice - sellCosts - bal;

  let cum = 0, peak = 0;
  for (const cf of flows) { cum += cf; peak = Math.min(peak, cum); }
  const profit = flows.reduce((s, x) => s + x, 0);
  const exitBeforeHandover = isOff && N <= i.handoverMonths;
  if (exitBeforeHandover) warnings.push("warn_hold_before_handover");

  const hold: HoldResult = {
    years: N / 12, exitPrice, sellCosts, loanBalance: bal, totalRent,
    peakCash: -peak, profit,
    roiPct: peak < 0 ? (profit / -peak) * 100 : 0,
    irrPct: irrAnnual(flows),
    exitBeforeHandover,
  };

  return {
    pricePsf: round(pricePsf), areaPsf, psfDiffPct,
    entryCosts, entryTotal, loan, monthlyPayment: mPay,
    cashAtPurchase, planTotalPct, flip, rent, hold, warnings,
  };
}
