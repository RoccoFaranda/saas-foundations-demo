"use client";

import Script from "next/script";
import { useEffect } from "react";
import { BackButton } from "@/src/components/error/back-button";
import { PageContainer } from "@/src/components/layout/page-container";
import { getSupportEmail } from "@/src/lib/config/support-email";
import { reportAppError } from "@/src/lib/observability/report-app-error";
import { THEME_COOKIE_NAME, THEME_COOKIE_VALUES } from "@/src/lib/theme/cookie-contract";
import "./globals.css";

function applyThemeFromBrowserState(): void {
  const allowedThemes = THEME_COOKIE_VALUES;
  const fromStorage = (() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  })();
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]+)`));
  const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1] ?? "") : null;
  const selectedTheme = allowedThemes.includes(fromStorage as (typeof THEME_COOKIE_VALUES)[number])
    ? (fromStorage as (typeof THEME_COOKIE_VALUES)[number])
    : allowedThemes.includes(fromCookie as (typeof THEME_COOKIE_VALUES)[number])
      ? (fromCookie as (typeof THEME_COOKIE_VALUES)[number])
      : null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme =
    selectedTheme === "system" ? (prefersDark ? "dark" : "light") : selectedTheme;

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const serializedThemeValues = JSON.stringify([...THEME_COOKIE_VALUES]);
  const themeBootstrapScript = `
(() => {
  try {
    const allowedThemes = ${serializedThemeValues};
    const fromStorage = (() => {
      try {
        return localStorage.getItem("theme");
      } catch {
        return null;
      }
    })();
    const cookieMatch = document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);
    const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const selectedTheme = allowedThemes.includes(fromStorage)
      ? fromStorage
      : allowedThemes.includes(fromCookie)
        ? fromCookie
        : null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = selectedTheme === "system" ? (prefersDark ? "dark" : "light") : selectedTheme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  } catch {}
})();
  `;
  const supportEmail = getSupportEmail();
  const supportSubject = error.digest
    ? `Support request (Ref: ${error.digest})`
    : "Support request";
  const supportBody = error.digest
    ? `Reference ID: ${error.digest}\n\nWhat were you doing when this happened?`
    : "What were you doing when this happened?";
  const supportHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`
    : null;

  useEffect(() => {
    applyThemeFromBrowserState();
  }, []);

  useEffect(() => {
    reportAppError({ boundary: "global", error });
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="global-error-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <title>Critical error | SaaS Foundations</title>
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-background py-16 text-foreground sm:py-20">
          <PageContainer size="narrow">
            <section className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Critical error
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                The app failed to load
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                A critical problem interrupted the app shell. Try reloading, or contact support if
                this keeps happening.
              </p>

              {error.digest ? (
                <p className="mt-3 rounded-md border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
                  Reference ID: <span className="font-mono text-foreground">{error.digest}</span>
                  <br />
                  Please include this ID in your support email.
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-primary btn-md"
                >
                  Reload page
                </button>
                <BackButton className="btn-secondary btn-md" />
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className="btn-secondary btn-md">
                  Go Home
                </a>
                {supportHref ? (
                  <a href={supportHref} className="btn-outline btn-md">
                    Email Support
                  </a>
                ) : null}
              </div>
              {supportHref ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Support email:{" "}
                  <a href={supportHref} className="focus-ring font-mono text-link hover:underline">
                    {supportEmail}
                  </a>
                </p>
              ) : null}
            </section>
          </PageContainer>
        </div>
      </body>
    </html>
  );
}
