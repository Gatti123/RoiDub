import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Calculations() {
  const lang = getLang();
  const sb = supabaseServer();
  const [{ data: calcs }, { data: areas }] = await Promise.all([
    sb.from("calculations").select("id, client_name, deal_type, area_id, inputs, created_at").order("created_at", { ascending: false }).limit(200),
    sb.from("areas").select("id, name_en, name_ru"),
  ]);
  const areaName = (id: string) => {
    const a = areas?.find((x) => x.id === id);
    return a ? (lang === "ru" ? a.name_ru : a.name_en) : id;
  };
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB");
  const price = (n: number) => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(n) + " AED";

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>{t(lang, "calcs_title")}</h1>
        <Link href="/calculations/new" className="btn" style={{ textDecoration: "none" }}>{t(lang, "nav_new")}</Link>
      </div>
      {!calcs?.length ? (
        <div className="empty">
          <p>{t(lang, "calcs_empty")}</p>
          <Link href="/calculations/new" className="btn" style={{ textDecoration: "none", display: "inline-block" }}>{t(lang, "nav_new")}</Link>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr>
              <th>{t(lang, "client")}</th><th>{t(lang, "area")}</th><th>{t(lang, "deal_type")}</th>
              <th>{t(lang, "price")}</th><th>{t(lang, "created")}</th><th />
            </tr></thead>
            <tbody>
              {calcs.map((c) => (
                <tr key={c.id}>
                  <td>{c.client_name || "—"}</td>
                  <td>{areaName(c.area_id)}</td>
                  <td>{t(lang, c.deal_type)}</td>
                  <td>{price(Number(c.inputs?.price ?? 0))}</td>
                  <td>{date(c.created_at)}</td>
                  <td><Link href={`/calculations/${c.id}`}>{t(lang, "open")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
