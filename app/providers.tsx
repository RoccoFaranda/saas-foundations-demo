"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/src/components/ui/toast";

export function Providers({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
