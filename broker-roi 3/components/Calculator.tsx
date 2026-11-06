"use client";
import { tg } from "@/lib/tg-client";
import { useEffect, useMemo, useState } from "react";
import { calculate, monthlyPct } from "@/lib/calc";
import { rentFor } from "@/lib/defaults";
import type { RefData } from "@/lib/data";
import type { CalcInputs, CalcResults, Lang } from "@/lib/types";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLang } from "./LangProvider";

function NumField({ id, label, value, onChange, step = "any", min = 0 }: {
  id: string; label: string; value: number; onChange: (n: number) => void; step?: string; min?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="decimal" step={step} min={min}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
    </div>
  );
}

export default function Calculator({ refData, initial, id: initialId, shareToken: initialToken }: {
  refData: RefData; initial: CalcInputs; id?: string; shareToken?: string;
}) {
  const { lang, t } = useLang();
  const [inp, setInp] = useState<CalcInputs>(initial);
  const [id, setId] = useState<string | undefined>(initialId);
  const [token, setToken] = useState<string | undefined>(initialToken);
  const [reportLang, setReportLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const area = refData.areas.find((a) => a.id === inp.areaId);
  const res = useMemo(() => calculate(inp, area?.price_psf ?? 0), [inp, area]);
  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) => setInp((s) => ({ ...s, [k]: v }));
  const isOff = inp.dealType === "offplan";

  // ----- auto-fill from market data -----
  const changeArea = (areaId: string) => {
    const a = refData.areas.find((x) => x.id === areaId);
    setInp((s) => ({
      ...s, areaId,
      annualRent: rentFor(refData, areaId, s.bedrooms) || s.annualRent,
      serviceChargePsf: a?.service_charge_psf ?? s.serviceChargePsf,
      growthPct: a?.growth_pct ?? s.growthPct,
    }));
  };
  const changeBedrooms = (bedrooms: number) =>
    setInp((s) => ({ ...s, bedrooms, annualRent: rentFor(refData, s.areaId, bedrooms) || s.annualRent }));
  const changeDeveloper = (developerId: string) => {
    const d = refData.developers.find((x) => x.id === developerId);
    setInp((s) => ({
      ...s, developerId,
      resaleThresholdPct: d?.resale_threshold_pct ?? s.resaleThresholdPct,
      nocFee: d?.noc_fee ?? s.nocFee,
      assignmentFee: d?.assignment_fee ?? s.assignmentFee,
    }));
  };
  const preClamped = Math.min(Math.max(inp.preHandoverPct, inp.bookingPct), 100);
  const monthly = monthlyPct(inp.bookingPct, inp.preHandoverPct, inp.handoverMonths);

  // ----- persistence -----
  const save = async (): Promise<{ id: string; token: string } | null> => {
    setBusy(true); setStatus(t("saving"));
    const sb = supabaseBrowser();
    const row = {
      client_name: inp.clientName, deal_type: inp.dealType, area_id: inp.areaId,
      inputs: inp, updated_at: new Date().toISOString(),
    };
    try {
      if (id) {
        const { error } = await sb.from("calculations").update(row).eq("id", id);
        if (error) throw error;
        setStatus(t("saved"));
        return { id, token: token! };
      }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb.from("calculations").insert({ ...row, broker_id: user.id })
        .select("id, share_token").single();
      if (error) throw error;
      setId(data.id); setToken(data.share_token);
      window.history.replaceState(null, "", `/calculations/${data.id}`);
      setStatus(t("saved"));
      return { id: data.id, token: data.share_token };
    } catch (e) {
      setStatus((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const [inTg, setInTg] = useState(false);
  useEffect(() => { const app = tg(); if (app) { setInTg(true); app.ready(); } }, []);

  const sendToTelegram = async () => {
    const saved = await save();
    if (!saved) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/tg/send/${saved.id}?lang=${reportLang}`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      const ok = r.ok;
      setStatus(ok ? t("tg_sent") : j.error === "bot_blocked" ? t("tg_bot_blocked") : (j.error || "Error"));
      tg()?.HapticFeedback?.notificationOccurred(ok ? "success" : "error");
    } finally { setBusy(false); }
  };

  const downloadPdf = async () => {
    const saved = await save();
    if (!saved) return;
    const a = document.createElement("a");
    a.href = `/api/report/${saved.id}?lang=${reportLang}`;
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const shareWhatsApp = async () => {
    // Open the window synchronously so popup blockers allow it, then fill in the URL after saving
    const app = tg();
    const w = app ? null : window.open("", "_blank");
    const saved = await save();
    if (!saved) { w?.close(); return; }
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const link = `${base}/r/${saved.token}?lang=${reportLang}`;
    const greet = reportLang === "ru"
      ? `${inp.clientName ? inp.clientName + ", з" : "З"}десь инвестиционный анализ по объекту: ${link}`
      : `${inp.clientName ? "Hi " + inp.clientName + ", h" : "H"}ere is the investment analysis for the property: ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(greet)}`;
    if (app) app.openLink(url);
    else if (w) w.location.href = url; else window.location.href = url;
  };

  const psfDir = res.psfDiffPct < 0 ? "below" : "above";

  return (
    <main className="page">
      <div className="calc">
        <div>
          {/* Property */}
          <section className="section" aria-labelledby="s1">
            <h2 id="s1">{t("s_property")}</h2>
            <div className="seg" role="group" aria-label={t("deal_type")}>
              <button type="button" aria-pressed={isOff} onClick={() => set("dealType", "offplan")}>{t("offplan")}</button>
              <button type="button" aria-pressed={!isOff} onClick={() => set("dealType", "secondary")}>{t("secondary")}</button>
            </div>
            <div className="grid">
              <div className="field full"><label htmlFor="client">{t("client_name")}</label>
                <input id="client" value={inp.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
              <div className="field"><label htmlFor="area">{t("area")}</label>
                <select id="area" value={inp.areaId} onChange={(e) => changeArea(e.target.value)}>
                  {refData.areas.map((a) => <option key={a.id} value={a.id}>{lang === "ru" ? a.name_ru : a.name_en}</option>)}
                </select></div>
              <div className="field"><label htmlFor="project">{t("project")}</label>
                <input id="project" value={inp.projectName} onChange={(e) => set("projectName", e.target.value)} /></div>
              {isOff && (
                <div className="field"><label htmlFor="dev">{t("developer")}</label>
                  <select id="dev" value={inp.developerId ?? ""} onChange={(e) => changeDeveloper(e.target.value)}>
                    {refData.developers.map((d) => <option key={d.id} value={d.id}>{d.id === "other" ? t("developer_other") : d.name}</option>)}
                  </select></div>
              )}
              <div className="field"><label htmlFor="beds">{t("bedrooms")}</label>
                <select id="beds" value={inp.bedrooms} onChange={(e) => changeBedrooms(Number(e.target.value))}>
                  <option value={0}>{t("studio")}</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select></div>
              <NumField id="size" label={t("size")} value={inp.sizeSqft} onChange={(n) => set("sizeSqft", n)} />
              <NumField id="price" label={t("price")} value={inp.price} step="1000" onChange={(n) => set("price", n)} />
            </div>
            {res.areaPsf > 0 && inp.sizeSqft > 0 && (
              <p className={`hint ${res.psfDiffPct <= 0 ? "pos" : "neg"}`}>
                {t("price_vs_area", { psf: fmtNum(res.pricePsf, lang), diff: fmtPct(Math.abs(res.psfDiffPct), lang), dir: t(psfDir), area: fmtNum(res.areaPsf, lang) })}
              </p>
            )}
          </section>

          {/* Payment */}
          <section className="section" aria-labelledby="s2">
            <h2 id="s2">{t("s_payment")}</h2>
            {isOff ? (
              <>
                <div className="grid-3">
                  <NumField id="handover" label={t("handover_in")} value={inp.handoverMonths} step="1" onChange={(n) => set("handoverMonths", n)} />
                  <NumField id="booking" label={t("booking_pct")} value={inp.bookingPct} step="5" onChange={(n) => set("bookingPct", n)} />
                  <NumField id="pre" label={t("pre_handover_pct")} value={inp.preHandoverPct} step="5" onChange={(n) => set("preHandoverPct", n)} />
                </div>
                <p className="hint">
                  {t("plan_name", { pre: fmtNum(preClamped, lang), post: fmtNum(100 - preClamped, lang) })}.{" "}
                  {t("plan_monthly")}: {fmtPct(monthly, lang, 2)} ({fmtMoney((monthly / 100) * inp.price, lang)}).{" "}
                  {t("plan_at_handover")}: {fmtPct(100 - preClamped, lang, 0)} ({fmtMoney(((100 - preClamped) / 100) * inp.price, lang)}).
                </p>
                <label className="check"><input type="checkbox" checked={inp.dldWaived} onChange={(e) => set("dldWaived", e.target.checked)} />{t("dld_waived")}</label>
              </>
            ) : (
              <>
                <div className="seg" role="group" aria-label={t("financing")}>
                  <button type="button" aria-pressed={inp.financing === "cash"} onClick={() => set("financing", "cash")}>{t("cash")}</button>
                  <button type="button" aria-pressed={inp.financing === "mortgage"} onClick={() => set("financing", "mortgage")}>{t("mortgage")}</button>
                </div>
                {inp.financing === "mortgage" && (
                  <div className="grid-3">
                    <NumField id="dp" label={t("down_payment")} value={inp.downPaymentPct} onChange={(n) => set("downPaymentPct", n)} />
                    <NumField id="rate" label={t("rate")} value={inp.interestRatePct} step="0.05" onChange={(n) => set("interestRatePct", n)} />
                    <NumField id="term" label={t("term")} value={inp.termYears} step="1" onChange={(n) => set("termYears", n)} />
                  </div>
                )}
              </>
            )}
          </section>

          {/* Assumptions */}
          <section className="section" aria-labelledby="s3">
            <h2 id="s3">{t("s_assumptions")}</h2>
            <p className="hint" style={{ marginTop: -6 }}>{t("autofill_note")}</p>
            <div className="grid">
              <NumField id="rent" label={t("annual_rent")} value={inp.annualRent} step="1000" onChange={(n) => set("annualRent", n)} />
              <NumField id="vac" label={t("vacancy")} value={inp.vacancyPct} onChange={(n) => set("vacancyPct", n)} />
              <NumField id="sc" label={t("service_psf")} value={inp.serviceChargePsf} step="0.5" onChange={(n) => set("serviceChargePsf", n)} />
              <NumField id="mt" label={t("maintenance")} value={inp.maintenancePct} onChange={(n) => set("maintenancePct", n)} />
              <NumField id="mg" label={t("management")} value={inp.managementPct} onChange={(n) => set("managementPct", n)} />
              <NumField id="gr" label={t("growth")} value={inp.growthPct} step="0.5" min={-50} onChange={(n) => set("growthPct", n)} />
              <NumField id="hz" label={t("horizon")} value={inp.horizonYears} step="1" onChange={(n) => set("horizonYears", n)} />
            </div>
            {area && area.price_change_pct !== null && (
              <p className="hint">{t("growth_hint", {
                area: lang === "ru" ? area.name_ru : area.name_en,
                change: `${area.price_change_pct > 0 ? "+" : ""}${fmtPct(area.price_change_pct, lang)}`,
              })}</p>
            )}
            {isOff && (
              <div className="grid">
                <NumField id="fm" label={t("flip_month")} value={inp.flipMonth} step="1" onChange={(n) => set("flipMonth", n)} />
                <NumField id="fu" label={t("flip_uplift")} value={inp.flipUpliftPct} step="0.5" min={-50} onChange={(n) => set("flipUpliftPct", n)} />
                <NumField id="th" label={t("threshold")} value={inp.resaleThresholdPct} onChange={(n) => set("resaleThresholdPct", n)} />
                <NumField id="noc" label={t("noc_fee")} value={inp.nocFee} step="250" onChange={(n) => set("nocFee", n)} />
                <NumField id="asg" label={t("assignment_fee")} value={inp.assignmentFee} step="250" onChange={(n) => set("assignmentFee", n)} />
              </div>
            )}
          </section>
        </div>

        <ResultsPanel res={res} inp={inp} lang={lang} t={t}>
          <div className="panel-actions">
            <div className="row">
              <span className="muted" style={{ fontSize: 13 }}>{t("lang_report")}</span>
              <div className="seg" role="group" aria-label={t("lang_report")}>
                <button type="button" aria-pressed={reportLang === "en"} onClick={() => setReportLang("en")}>EN</button>
                <button type="button" aria-pressed={reportLang === "ru"} onClick={() => setReportLang("ru")}>RU</button>
              </div>
            </div>
            {inTg
              ? <button className="btn brass" onClick={sendToTelegram} disabled={busy}>{t("send_tg")}</button>
              : <button className="btn brass" onClick={downloadPdf} disabled={busy}>{t("download_pdf")}</button>}
            <div className="row">
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => save()} disabled={busy}>{t("save")}</button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={shareWhatsApp} disabled={busy}>{t("share_whatsapp")}</button>
            </div>
            <div className="status" aria-live="polite">{status}</div>
          </div>
        </ResultsPanel>
      </div>
    </main>
  );
}

function ResultsPanel({ res, inp, lang, t, children }: {
  res: CalcResults; inp: CalcInputs; lang: Lang;
  t: (k: string, v?: Record<string, string | number>) => string; children: React.ReactNode;
}) {
  const m = (n: number) => fmtMoney(n, lang);
  const p = (n: number | null) => fmtPct(n, lang);
  const rentHeadline = res.rent.cashOnCashPct ?? res.rent.netYieldPct;
  const bars = [res.flip?.irrPct ?? null, rentHeadline, res.hold.irrPct].map((x) => (x && x > 0 ? x : 0));
  const max = Math.max(...bars, 1);
  const width = (i: number) => `${Math.max(2, (bars[i] / max) * 100)}%`;

  const warnText = (w: string) => w === "warn_flip_threshold" && res.flip
    ? t(w, { paid: fmtNum(res.flip.paidPct, lang), threshold: fmtNum(res.flip.thresholdPct, lang) })
    : t(w);

  return (
    <aside className="panel" aria-live="polite">
      <h2>{t("r_summary")}</h2>
      <div className="kv"><span>{t("r_cash_at_purchase")}</span><span>{m(res.cashAtPurchase)}</span></div>
      <div className="kv"><span>{t("r_entry_total")}</span><span>{m(res.entryTotal)}</span></div>
      {res.loan > 0 && <div className="kv"><span>{t("r_monthly_payment")}</span><span>{m(res.monthlyPayment)}</span></div>}
      {res.warnings.map((w) => <div className="warn" key={w}>{warnText(w)}</div>)}

      <div style={{ marginTop: 14 }}>
        {res.flip && (
          <div className="scen">
            <div className="scen-head">
              <span className="scen-name">{t("r_flip")} ({t("r_month", { m: res.flip.month })})</span>
            </div>
            <div className="scen-big">{p(res.flip.roiPct)}<small>{t("r_roi")}</small></div>
            <div className="bar"><span style={{ width: width(0) }} /></div>
            <div className="kv"><span>{t("r_irr")}</span><span>{p(res.flip.irrPct)}</span></div>
            <div className="kv"><span>{t("r_paid_pct")}</span><span>{fmtPct(res.flip.paidPct, lang, 0)}</span></div>
            <div className="kv"><span>{t("r_invested")}</span><span>{m(res.flip.invested)}</span></div>
            <div className="kv"><span>{t("r_premium")}</span><span>{m(res.flip.premium)}</span></div>
            <div className="kv"><span>{t("r_sell_costs")}</span><span>−{m(res.flip.sellCosts)}</span></div>
            <div className="kv"><span>{t("r_profit")}</span><span>{m(res.flip.profit)}</span></div>
          </div>
        )}
        <div className="scen">
          <div className="scen-head"><span className="scen-name">{t("r_rent")}</span></div>
          <div className="scen-big">{p(rentHeadline)}<small>{res.rent.cashOnCashPct !== null ? t("r_coc") : t("r_net_yield")}</small></div>
          <div className="bar"><span style={{ width: width(1) }} /></div>
          {inp.dealType === "offplan" && <div className="kv"><span>{t("r_rent_from", { m: res.rent.startsMonth })}</span><span /></div>}
          <div className="kv"><span>{t("r_gross_yield")}</span><span>{p(res.rent.grossYieldPct)}</span></div>
          <div className="kv"><span>{t("r_net_yield")}</span><span>{p(res.rent.netYieldPct)}</span></div>
          <div className="kv"><span>{t("r_net_rent")}</span><span>{m(res.rent.netRent)}</span></div>
          {res.rent.annualDebtService > 0 && <div className="kv"><span>{t("r_cashflow")}</span><span>{m(res.rent.cashFlowYear)}</span></div>}
        </div>
        <div className="scen">
          <div className="scen-head"><span className="scen-name">{t("r_hold", { years: res.hold.years })}</span></div>
          <div className="scen-big">{p(res.hold.irrPct)}<small>{t("r_irr")}</small></div>
          <div className="bar"><span style={{ width: width(2) }} /></div>
          <div className="kv"><span>{t("r_roi")}</span><span>{p(res.hold.roiPct)}</span></div>
          <div className="kv"><span>{t("r_exit_price")}</span><span>{m(res.hold.exitPrice)}</span></div>
          <div className="kv"><span>{t("r_total_rent")}</span><span>{m(res.hold.totalRent)}</span></div>
          <div className="kv"><span>{t("r_peak_cash")}</span><span>{m(res.hold.peakCash)}</span></div>
          <div className="kv"><span>{t("r_profit")}</span><span>{m(res.hold.profit)}</span></div>
        </div>
      </div>
      {children}
    </aside>
  );
}
