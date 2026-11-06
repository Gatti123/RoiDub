import path from "node:path";
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Area, CalcInputs, CalcResults, Developer, Lang } from "../types";
import { monthlyPct } from "../calc";
import { fmtMoney, fmtNum, fmtPct, t as tr } from "../i18n";

const fontDir = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "Plex",
  fonts: [
    { src: path.join(fontDir, "IBMPlexSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "IBMPlexSans-Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontDir, "IBMPlexSans-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "IBMPlexSans-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

const C = { ink: "#14232a", muted: "#5d6d72", line: "#d8dfdc", teal: "#0e5a5f", tealSoft: "#e3eeee", brass: "#a8823b", brassSoft: "#f4ecdc", pos: "#1f7a4d", neg: "#b23a3a" };

const s = StyleSheet.create({
  page: { fontFamily: "Plex", fontSize: 9.5, color: C.ink, paddingTop: 30, paddingBottom: 50, paddingHorizontal: 40, lineHeight: 1.35 },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.teal, marginBottom: 14 },
  logo: { maxHeight: 40, maxWidth: 150, objectFit: "contain" },
  agency: { fontSize: 13, fontWeight: 600, color: C.teal },
  brokerBox: { alignItems: "flex-end" },
  brokerName: { fontSize: 10.5, fontWeight: 600 },
  small: { fontSize: 8.5, color: C.muted },
  title: { fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 2 },
  subtitle: { fontSize: 11, color: C.muted, marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  h2: { fontSize: 11.5, fontWeight: 600, color: C.teal, marginBottom: 8, marginTop: 4 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10, marginBottom: 10 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#edf1ef" },
  kvLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  k: { color: C.muted, paddingRight: 8, flexShrink: 1 },
  v: { fontWeight: 500, textAlign: "right" },
  bullet: { flexDirection: "row", marginBottom: 3 },
  dot: { width: 4, height: 4, backgroundColor: C.brass, marginTop: 4.5, marginRight: 7, transform: "rotate(45deg)" },
  market: { backgroundColor: C.tealSoft, borderRadius: 6, padding: 10, marginBottom: 10 },
  scenRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line },
  scenName: { width: 150, fontWeight: 500 },
  scenBarWrap: { flex: 1, height: 8, backgroundColor: "#eef1f0", borderRadius: 4, marginHorizontal: 10 },
  scenBar: { height: 8, backgroundColor: C.brass, borderRadius: 4 },
  scenVal: { width: 62, textAlign: "right", fontSize: 13, fontWeight: 600 },
  scenSub: { width: 110, textAlign: "right", fontSize: 8, color: C.muted },
  warn: { backgroundColor: C.brassSoft, borderRadius: 4, padding: 6, marginBottom: 6, fontSize: 8.5 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6, marginBottom: 14 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4, paddingHorizontal: 8 },
  th: { color: C.muted, fontSize: 8.5 },
  disclaimer: { fontSize: 7.5, color: C.muted, marginTop: 10, lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 6 },
});

export interface BrokerProfile {
  full_name: string; agency: string; brn: string; phone: string; whatsapp: string; email: string;
}

function KV({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return <View style={last ? s.kvLast : s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>;
}

export function ReportDoc({ inputs: i, res, area, developer, profile, logo, lang }: {
  inputs: CalcInputs; res: CalcResults; area: Area | undefined; developer: Developer | undefined;
  profile: BrokerProfile; logo: { data: Buffer; format: "png" | "jpg" } | null; lang: Lang;
}) {
  const t = (k: string, v?: Record<string, string | number>) => tr(lang, k, v);
  const m = (n: number) => fmtMoney(n, lang);
  const p = (n: number | null, d = 1) => fmtPct(n, lang, d);
  const pctShort = (n: number) => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(n) + "%";
  const isOff = i.dealType === "offplan";
  const pre = Math.min(Math.max(i.preHandoverPct, i.bookingPct), 100);
  const areaName = area ? (lang === "ru" ? area.name_ru : area.name_en) : i.areaId;
  const highlights = area ? (lang === "ru" ? area.highlights_ru : area.highlights_en) : [];
  const date = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const beds = i.bedrooms === 0 ? t("studio") : `${i.bedrooms} ${lang === "ru" ? "сп." : "BR"}`;
  const headline = [i.projectName, areaName].filter(Boolean).join(", ");

  const rentHeadline = res.rent.cashOnCashPct ?? res.rent.netYieldPct;
  const scen: { name: string; value: number | null; sub: string }[] = [];
  if (res.flip) scen.push({ name: t("r_flip"), value: res.flip.irrPct, sub: `${t("r_roi")}: ${p(res.flip.roiPct)}` });
  scen.push({ name: t("r_rent"), value: rentHeadline, sub: res.rent.cashOnCashPct !== null ? t("r_coc") : t("r_net_yield") });
  scen.push({ name: t("r_hold", { years: res.hold.years }), value: res.hold.irrPct, sub: `${t("r_roi")}: ${p(res.hold.roiPct)}` });
  const max = Math.max(1, ...scen.map((x) => (x.value && x.value > 0 ? x.value : 0)));

  const warnText = (w: string) => w === "warn_flip_threshold" && res.flip
    ? t(w, { paid: fmtNum(res.flip.paidPct, lang), threshold: fmtNum(res.flip.thresholdPct, lang) }) : t(w);

  const contact = [profile.phone, profile.email].filter(Boolean).join("   ");

  const Footer = () => (
    <View style={s.footer} fixed>
      <Text>{[profile.full_name, profile.agency, profile.brn ? `BRN ${profile.brn}` : ""].filter(Boolean).join(", ")}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`${t("pdf_title")} — ${headline}`} author={profile.full_name || profile.agency}>
      {/* ---------- Page 1: overview ---------- */}
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View>{logo ? <Image style={s.logo} src={logo} /> : <Text style={s.agency}>{profile.agency || " "}</Text>}</View>
          <View style={s.brokerBox}>
            <Text style={s.brokerName}>{profile.full_name}</Text>
            {profile.agency && logo ? <Text style={s.small}>{profile.agency}</Text> : null}
            {profile.brn ? <Text style={s.small}>BRN {profile.brn}</Text> : null}
            {contact ? <Text style={s.small}>{contact}</Text> : null}
          </View>
        </View>

        <Text style={s.title}>{t("pdf_title")}</Text>
        <Text style={s.subtitle}>
          {headline}{i.clientName ? `   ${t("pdf_prepared_for")}: ${i.clientName}` : ""}   {date}
        </Text>

        <View style={s.row}>
          <View style={[s.col, s.box]}>
            <Text style={s.h2}>{t("pdf_property")}</Text>
            <KV k={t("deal_type")} v={t(i.dealType)} />
            <KV k={t("area")} v={areaName} />
            {i.projectName ? <KV k={t("project")} v={i.projectName} /> : null}
            {isOff && developer ? <KV k={t("developer")} v={developer.id === "other" ? t("developer_other") : developer.name} /> : null}
            <KV k={t("bedrooms")} v={beds} />
            <KV k={t("size")} v={fmtNum(i.sizeSqft, lang)} />
            {isOff ? <KV k={t("handover_in")} v={String(i.handoverMonths)} /> : null}
            <KV k={t("price")} v={m(i.price)} last />
          </View>
          <View style={s.col}>
            {res.areaPsf > 0 && (
              <View style={s.market}>
                <Text style={[s.h2, { marginTop: 0 }]}>{t("pdf_market")}</Text>
                <Text>{t("price_vs_area", {
                  psf: fmtNum(res.pricePsf, lang), diff: p(Math.abs(res.psfDiffPct)),
                  dir: t(res.psfDiffPct < 0 ? "below" : "above"), area: fmtNum(res.areaPsf, lang),
                })}</Text>
              </View>
            )}
            {highlights.length > 0 && (
              <View>
                <Text style={s.h2}>{t("pdf_area_highlights")}</Text>
                {highlights.map((h, k) => (
                  <View style={s.bullet} key={k}><View style={s.dot} /><Text style={{ flex: 1 }}>{h}</Text></View>
                ))}
              </View>
            )}
          </View>
        </View>

        <Text style={s.h2}>{t("r_compare")}</Text>
        <View style={{ marginBottom: 6 }}>
          {scen.map((x, k) => (
            <View style={s.scenRow} key={k}>
              <Text style={s.scenName}>{x.name}</Text>
              <View style={s.scenBarWrap}>
                <View style={[s.scenBar, { width: `${Math.max(2, ((x.value && x.value > 0 ? x.value : 0) / max) * 100)}%` }]} />
              </View>
              <Text style={s.scenVal}>{p(x.value)}</Text>
              <Text style={s.scenSub}>{x.sub}</Text>
            </View>
          ))}
          <Text style={[s.small, { marginTop: 4 }]}>{t("r_irr")}</Text>
        </View>

        {res.warnings.map((w) => <Text key={w} style={s.warn}>{warnText(w)}</Text>)}

        <View style={[s.row, { marginTop: 6 }]} wrap={false}>
          <View style={[s.col, s.box]}>
            <Text style={s.h2}>{t("r_entry")}</Text>
            {res.entryCosts.map((c) => <KV key={c.label} k={t(c.label)} v={m(c.amount)} />)}
            <KV k={t("r_entry_total")} v={m(res.entryTotal)} />
            <KV k={t("r_cash_at_purchase")} v={m(res.cashAtPurchase)} last />
          </View>
          {res.flip ? (
            <View style={[s.col, s.box]}>
              <Text style={s.h2}>{t("r_flip")} ({t("r_month", { m: res.flip.month })})</Text>
              <KV k={t("r_paid_pct")} v={p(res.flip.paidPct, 0)} />
              <KV k={t("r_invested")} v={m(res.flip.invested)} />
              <KV k={t("r_sale_price")} v={m(res.flip.salePrice)} />
              <KV k={t("r_premium")} v={m(res.flip.premium)} />
              <KV k={t("r_sell_costs")} v={`−${m(res.flip.sellCosts)}`} />
              <KV k={t("r_profit")} v={m(res.flip.profit)} />
              <KV k={t("r_roi")} v={p(res.flip.roiPct)} />
              <KV k={t("r_irr")} v={p(res.flip.irrPct)} last />
            </View>
          ) : (
            <View style={[s.col, s.box]}>
              <Text style={s.h2}>{t("r_rent")}</Text>
              <KV k={t("annual_rent")} v={m(res.rent.grossRent)} />
              <KV k={t("r_service")} v={`−${m(res.rent.serviceCharges)}`} />
              <KV k={t("r_other")} v={`−${m(res.rent.otherCosts)}`} />
              <KV k={t("r_net_rent")} v={m(res.rent.netRent)} />
              <KV k={t("r_gross_yield")} v={p(res.rent.grossYieldPct)} />
              <KV k={t("r_net_yield")} v={p(res.rent.netYieldPct)} last={res.rent.annualDebtService === 0} />
              {res.rent.annualDebtService > 0 ? <KV k={t("r_debt")} v={`−${m(res.rent.annualDebtService)}`} /> : null}
              {res.rent.annualDebtService > 0 ? <KV k={t("r_cashflow")} v={m(res.rent.cashFlowYear)} /> : null}
              {res.rent.cashOnCashPct !== null ? <KV k={t("r_coc")} v={p(res.rent.cashOnCashPct)} last /> : null}
            </View>
          )}
        </View>
        <Footer />
      </Page>

      {/* ---------- Page 2: details ---------- */}
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          {isOff ? (
            <View style={[s.col, s.box]}>
              <Text style={s.h2}>{t("r_rent")}</Text>
              <Text style={[s.small, { marginBottom: 4 }]}>{t("r_rent_from", { m: res.rent.startsMonth })}</Text>
              <KV k={t("annual_rent")} v={m(res.rent.grossRent)} />
              <KV k={t("r_service")} v={`−${m(res.rent.serviceCharges)}`} />
              <KV k={t("r_other")} v={`−${m(res.rent.otherCosts)}`} />
              <KV k={t("r_net_rent")} v={m(res.rent.netRent)} />
              <KV k={t("r_gross_yield")} v={p(res.rent.grossYieldPct)} />
              <KV k={t("r_net_yield")} v={p(res.rent.netYieldPct)} last />
            </View>
          ) : null}
          <View style={[s.col, s.box]}>
            <Text style={s.h2}>{t("r_hold", { years: res.hold.years })}</Text>
            <KV k={t("r_exit_price")} v={m(res.hold.exitPrice)} />
            <KV k={t("r_sell_costs")} v={`−${m(res.hold.sellCosts)}`} />
            {res.hold.loanBalance > 0 ? <KV k={t("r_loan_balance")} v={`−${m(res.hold.loanBalance)}`} /> : null}
            <KV k={t("r_total_rent")} v={m(res.hold.totalRent)} />
            <KV k={t("r_peak_cash")} v={m(res.hold.peakCash)} />
            <KV k={t("r_profit")} v={m(res.hold.profit)} />
            <KV k={t("r_roi")} v={p(res.hold.roiPct)} />
            <KV k={t("r_irr")} v={p(res.hold.irrPct)} last />
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.h2}>{t("pdf_assumptions")}</Text>
          <View style={s.row}>
            <View style={[s.col, s.box]}>
              <KV k={t("annual_rent")} v={m(i.annualRent)} />
              <KV k={t("vacancy")} v={p(i.vacancyPct, 0)} />
              <KV k={t("service_psf")} v={fmtNum(i.serviceChargePsf, lang)} />
              <KV k={t("maintenance")} v={p(i.maintenancePct, 0)} />
              <KV k={t("management")} v={p(i.managementPct, 0)} last />
            </View>
            <View style={[s.col, s.box]}>
              <KV k={t("growth")} v={p(i.growthPct)} />
              <KV k={t("horizon")} v={String(i.horizonYears)} />
              {isOff ? <KV k={t("plan_name", { pre: fmtNum(pre, lang), post: fmtNum(100 - pre, lang) })} v={`${pctShort(i.bookingPct)} + ${pctShort(monthlyPct(i.bookingPct, i.preHandoverPct, i.handoverMonths))} × ${Math.max(0, Math.round(i.handoverMonths) - 1)} + ${pctShort(100 - pre)}`} /> : null}
              {isOff ? <KV k={t("flip_uplift")} v={p(i.flipUpliftPct)} /> : null}
              {isOff ? <KV k={t("threshold")} v={p(i.resaleThresholdPct, 0)} /> : null}
              {!isOff && i.financing === "mortgage" ? <KV k={t("down_payment")} v={p(i.downPaymentPct, 0)} /> : null}
              {!isOff && i.financing === "mortgage" ? <KV k={t("rate")} v={p(i.interestRatePct, 2)} /> : null}
              {!isOff && i.financing === "mortgage" ? <KV k={t("r_monthly_payment")} v={m(res.monthlyPayment)} /> : null}
              <KV k={t("pdf_metro")} v={area?.has_metro ? t("yes") : t("no")} last />
            </View>
          </View>
        </View>

        <Text style={s.disclaimer}>{t("pdf_disclaimer")}</Text>
        {area?.source ? (
          <Text style={s.disclaimer}>{t("pdf_data_source", { source: area.source, date: area.updated_at })}</Text>
        ) : null}
        <Footer />
      </Page>
    </Document>
  );
}
