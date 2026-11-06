"use client";
import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { t as translate } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const Ctx = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useLang() {
  const lang = useContext(Ctx);
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { lang, t };
}

export function LangToggle() {
  const { lang } = useLang();
  const router = useRouter();
  const set = (l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=none; secure`;
    router.refresh();
  };
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button aria-pressed={lang === "en"} onClick={() => set("en")}>EN</button>
      <button aria-pressed={lang === "ru"} onClick={() => set("ru")}>RU</button>
    </div>
  );
}
