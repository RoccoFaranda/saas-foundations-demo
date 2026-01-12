"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard hydration pattern for next-themes
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by rendering placeholder until mounted
  if (!mounted) {
    return (
      <select
        className="rounded border border-foreground/20 bg-background px-2 py-1 text-sm text-foreground/70"
        disabled
        aria-label="Theme selector"
        data-testid="theme-toggle"
      >
        <option>Theme</option>
      </select>
    );
  }

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="rounded border border-foreground/20 bg-background px-2 py-1 text-sm text-foreground/70 transition-colors hover:border-foreground/40 hover:text-foreground"
      aria-label="Theme selector"
      data-testid="theme-toggle"
    >
      {themes.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
