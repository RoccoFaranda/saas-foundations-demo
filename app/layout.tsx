import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "SaaS Foundations Demo",
  description: "A demo application showcasing SaaS foundations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCookie = await getThemeCookie();
  const themeSyncScript = `
(() => {
  try {
    const match = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    if (!match) return;
    const theme = decodeURIComponent(match[1]);
    if (!["light", "dark", "system"].includes(theme)) return;
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
        <Providers defaultTheme={themeCookie ?? "system"}>{children}</Providers>
      </body>
    </html>
  );
}
