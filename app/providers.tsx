"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ConsentProvider } from "@/src/components/consent/consent-provider";
import { ToastProvider } from "@/src/components/ui/toast";
import type { ConsentState } from "@/src/lib/consent/types";

export function Providers({
  children,
  defaultTheme = "system",
  initialConsentState,
}: {
  children: React.ReactNode;
  defaultTheme?: string;
  initialConsentState: ConsentState | null;
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
        <ConsentProvider initialConsentState={initialConsentState}>
          <ToastProvider>{children}</ToastProvider>
        </ConsentProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
