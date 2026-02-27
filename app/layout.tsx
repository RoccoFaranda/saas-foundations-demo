import type { Metadata } from "next";
import { getConsentCookieState } from "@/src/lib/consent/cookies";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/src/lib/seo/metadata";
import { THEME_COOKIE_NAME, THEME_COOKIE_VALUES } from "@/src/lib/theme/cookie-contract";
import { getThemeCookie } from "@/src/lib/theme/cookies";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingSiteVerification = process.env.BING_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  manifest: "/manifest.webmanifest",
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: googleSiteVerification || undefined,
    other: bingSiteVerification
      ? {
          "msvalidate.01": bingSiteVerification,
        }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const consentState = await getConsentCookieState();
  const themeCookie = await getThemeCookie();
  const serializedThemeValues = JSON.stringify([...THEME_COOKIE_VALUES]);
  const themeSyncScript = `
(() => {
  try {
    const match = document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);
    if (!match) return;
    const theme = decodeURIComponent(match[1]);
    if (!${serializedThemeValues}.includes(theme)) return;
    localStorage.setItem("theme", theme);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch {}
})();
  `;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-cookie-sync"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeSyncScript }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers defaultTheme={themeCookie ?? "system"} initialConsentState={consentState}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
