import { calculate, irrAnnual } from "../lib/calc";
const fees = { dld_pct:4, dld_admin_fee:580, trustee_fee:4000, agent_pct:2, vat_pct:5, mortgage_reg_pct:0.25, mortgage_reg_fixed:290, resale_noc_fee:3000 };
const base:any = { dealType:"offplan", clientName:"", areaId:"jvc", developerId:"emaar", projectName:"", bedrooms:1, sizeSqft:750, price:1500000,
 handoverMonths:30, bookingPct:20, preHandoverPct:60, dldWaived:false, financing:"cash", downPaymentPct:20, interestRatePct:4.5, termYears:25,
 annualRent:75000, vacancyPct:5, serviceChargePsf:13, maintenancePct:3, managementPct:5, growthPct:4, horizonYears:5,
 flipMonth:8, flipUpliftPct:15, fees, resaleThresholdPct:30, nocFee:5250, assignmentFee:0 };
const r = calculate(base, 1510);
console.log("flip", r.flip);
console.log("rent", r.rent);
console.log("hold", r.hold, r.warnings);
const s = calculate({...base, dealType:"secondary", financing:"mortgage"}, 1510);
console.log("SEC entry", s.entryCosts, s.cashAtPurchase, s.monthlyPayment.toFixed(0));
console.log("SEC rent", s.rent); console.log("SEC hold", s.hold);
console.log("irr check 10%/yr:", irrAnnual([-100, ...Array(11).fill(0), 110]));
