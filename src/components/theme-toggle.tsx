"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  type ThemeCookieValue,
  serializeThemeCookieForDocument,
} from "@/src/lib/theme/cookie-contract";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type ThemeValue = ThemeCookieValue;

interface ThemeToggleProps {
  onThemeChange?: (theme: ThemeValue) => void;
  testId?: string;
}

export function ThemeToggle({ onThemeChange, testId }: ThemeToggleProps) {
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
        data-testid={testId}
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
      data-testid={testId}
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
  document.cookie = serializeThemeCookieForDocument({
    theme,
    secure: window.location.protocol === "https:",
  });
}
