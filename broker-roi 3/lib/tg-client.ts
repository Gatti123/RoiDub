"use client";
// Thin typed wrapper around window.Telegram.WebApp (loaded in app/layout.tsx)
type WebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  showAlert: (msg: string) => void;
  HapticFeedback?: { notificationOccurred: (t: "success" | "error") => void };
};
declare global { interface Window { Telegram?: { WebApp?: WebApp } } }

/** Returns the WebApp object only when actually running inside Telegram. */
export function tg(): WebApp | null {
  if (typeof window === "undefined") return null;
  const w = window.Telegram?.WebApp;
  return w && w.initData ? w : null;
}
