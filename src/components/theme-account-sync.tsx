"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useToast } from "@/src/components/ui/toast";

type ThemeSyncResponse = {
  theme?: string | null;
};

export function ThemeAccountSync() {
  const { theme, setTheme } = useTheme();
  const { pushToast } = useToast();
  const didSyncRef = useRef(false);

  useEffect(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;

    const syncTheme = async () => {
      try {
        const response = await fetch("/app/theme/sync", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ThemeSyncResponse;
        const currentTheme = theme ?? "system";
        if (data?.theme && data.theme !== currentTheme) {
          setTheme(data.theme);
          pushToast({
            title: "Account theme applied",
            description: `Using your saved ${data.theme} preference.`,
          });
        }
      } catch {
        // Ignore sync failures
      }
    };

    void syncTheme();
  }, [pushToast, setTheme, theme]);

  return null;
}
