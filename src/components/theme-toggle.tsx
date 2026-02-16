"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type ThemeValue = (typeof themes)[number]["value"];

export function ThemeToggle({ onThemeChange }: { onThemeChange?: (theme: ThemeValue) => void }) {
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
        className="form-field form-field-sm w-auto"
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
      onChange={(e) => {
        const nextTheme = e.target.value as ThemeValue;
        setTheme(nextTheme);
        syncThemeCookie(nextTheme);
        onThemeChange?.(nextTheme);
      }}
      className="form-field form-field-sm w-auto"
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

function syncThemeCookie(theme: ThemeValue) {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const cookieParts = [
    `theme=${encodeURIComponent(theme)}`,
    "path=/",
    "samesite=lax",
    `max-age=${maxAge}`,
  ];
  if (isSecure) {
    cookieParts.push("secure");
  }
  document.cookie = cookieParts.join("; ");
}
