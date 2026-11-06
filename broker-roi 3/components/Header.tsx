"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tg } from "@/lib/tg-client";
import { usePathname, useRouter } from "next/navigation";
import { LangToggle, useLang } from "./LangProvider";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Header() {
  const { t } = useLang();
  const path = usePathname();
  const router = useRouter();
  const [inTg, setInTg] = useState(false);
  useEffect(() => setInTg(!!tg()), []);
  if (path.startsWith("/login")) return null;
  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };
  const link = (href: string, label: string) => (
    <Link href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
  );
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/calculations" className="brand"><span className="brand-mark" />{t("app_name")}</Link>
        <nav className="nav">
          {link("/calculations", t("nav_calcs"))}
          {link("/calculations/new", t("nav_new"))}
          {link("/profile", t("nav_profile"))}
        </nav>
        <LangToggle />
        {!inTg && <button className="linkish" onClick={signOut}>{t("sign_out")}</button>}
      </div>
    </header>
  );
}
