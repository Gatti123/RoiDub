import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Header from "@/components/Header";
import { getLang } from "@/lib/lang-server";

const plex = localFont({
  src: [
    { path: "../assets/fonts/IBMPlexSans-Regular.ttf", weight: "400" },
    { path: "../assets/fonts/IBMPlexSans-Medium.ttf", weight: "500" },
    { path: "../assets/fonts/IBMPlexSans-SemiBold.ttf", weight: "600" },
  ],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yield Desk — investment reports for Dubai brokers",
  description: "ROI, rental yield and off-plan resale analysis with branded PDF reports.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang} className={plex.variable}>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <LangProvider lang={lang}>
          <Header />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
