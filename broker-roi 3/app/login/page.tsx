"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LangToggle, useLang } from "@/components/LangProvider";
import { tg } from "@/lib/tg-client";

export default function Login() {
  const { t } = useLang();
  const router = useRouter();
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // Inside Telegram: sign in automatically with the Telegram account, no form
  useEffect(() => {
    const app = tg();
    setInTelegram(!!app);
    if (!app) return;
    app.ready(); app.expand();
    (async () => {
      const r = await fetch("/api/tg/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: app.initData }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setError(j.error || t("tg_login_failed"));
      window.location.replace(j.needsProfile ? "/profile" : "/calculations/new");
    })();
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const sb = supabaseBrowser();
    const res = mode === "in"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    if (mode === "up" && !res.data.session) return setInfo(t("check_email"));
    router.push(mode === "up" ? "/profile" : "/calculations");
    router.refresh();
  };

  if (inTelegram !== false) {
    return (
      <main className="auth" style={{ textAlign: "center" }}>
        <span style={{ fontWeight: 600, color: "var(--teal)" }}>{t("app_name")}</span>
        {error ? <div className="error" style={{ marginTop: 24 }}>{error}</div>
               : <p className="sub" style={{ marginTop: 24 }}>{inTelegram ? t("tg_signing_in") : ""}</p>}
      </main>
    );
  }

  return (
    <main className="auth">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 600, color: "var(--teal)" }}>{t("app_name")}</span>
        <div style={{ background: "var(--teal)", borderRadius: 6 }}><LangToggle /></div>
      </div>
      <h1>{t("login_title")}</h1>
      <p className="sub">{t("login_sub")}</p>
      <p className="ok" style={{ marginBottom: 16 }}>{t("tg_open_in_bot")}</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="email">{t("email")}</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="field"><label htmlFor="pw">{t("password")}</label>
          <input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
        {error && <div className="error">{error}</div>}
        {info && <div className="ok">{info}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>{mode === "in" ? t("sign_in") : t("sign_up")}</button>
      </form>
      <p style={{ marginTop: 18, textAlign: "center" }}>
        <button className="linkish" style={{ color: "var(--teal)" }} onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? t("no_account") : t("have_account")}
        </button>
      </p>
    </main>
  );
}
