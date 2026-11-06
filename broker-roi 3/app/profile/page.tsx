"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLang } from "@/components/LangProvider";

type Profile = { full_name: string; agency: string; brn: string; phone: string; whatsapp: string; email: string; logo_url: string | null };
const EMPTY: Profile = { full_name: "", agency: "", brn: "", phone: "", whatsapp: "", email: "", logo_url: null };

export default function ProfilePage() {
  const { t } = useLang();
  const [p, setP] = useState<Profile>(EMPTY);
  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUid(data.user.id);
      const { data: row } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setP({ ...EMPTY, email: data.user.email ?? "", ...(row ?? {}) });
    });
  }, []);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    if (!["png", "jpg", "jpeg"].includes(ext)) return setError("PNG or JPG only.");
    const path = `${uid}/logo-${Date.now()}.${ext}`;
    const sb = supabaseBrowser();
    const { error: upErr } = await sb.storage.from("branding").upload(path, file, { upsert: true });
    if (upErr) return setError(upErr.message);
    const { data } = sb.storage.from("branding").getPublicUrl(path);
    setP({ ...p, logo_url: data.publicUrl });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setError(""); setStatus("");
    const { error: err } = await supabaseBrowser().from("profiles").upsert({ id: uid, ...p });
    if (err) return setError(err.message);
    setStatus(t("saved"));
  };

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <h1>{t("profile_title")}</h1>
      <p className="sub">{t("profile_sub")}</p>
      <form className="section" onSubmit={save}>
        <div className="grid">
          <div className="field"><label htmlFor="fn">{t("full_name")}</label><input id="fn" value={p.full_name} onChange={set("full_name")} /></div>
          <div className="field"><label htmlFor="ag">{t("agency")}</label><input id="ag" value={p.agency} onChange={set("agency")} /></div>
          <div className="field"><label htmlFor="brn">{t("brn")}</label><input id="brn" value={p.brn} onChange={set("brn")} /></div>
          <div className="field"><label htmlFor="em">{t("email")}</label><input id="em" type="email" value={p.email} onChange={set("email")} /></div>
          <div className="field"><label htmlFor="ph">{t("phone")}</label><input id="ph" value={p.phone} onChange={set("phone")} placeholder="+971" /></div>
          <div className="field"><label htmlFor="wa">{t("whatsapp")}</label><input id="wa" value={p.whatsapp} onChange={set("whatsapp")} placeholder="+971" /></div>
          <div className="field full">
            <label htmlFor="logo">{t("logo")}</label>
            {p.logo_url && <img src={p.logo_url} alt="" style={{ maxHeight: 56, maxWidth: 200, marginBottom: 8, objectFit: "contain", alignSelf: "flex-start" }} />}
            <input id="logo" type="file" accept="image/png,image/jpeg" onChange={upload} />
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <button className="btn">{t("save_profile")}</button>
          <span className="ok" style={{ margin: 0 }}>{status}</span>
        </div>
      </form>
    </main>
  );
}
