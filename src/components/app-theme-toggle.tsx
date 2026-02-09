"use client";

import { useTransition } from "react";
import { ThemeToggle } from "./theme-toggle";
import { updateThemePreferenceAction } from "@/src/lib/theme/actions";
import type { ThemePreference } from "@/src/generated/prisma/enums";

export function AppThemeToggle() {
  const [, startTransition] = useTransition();

  const handleThemeChange = (theme: ThemePreference) => {
    startTransition(() => {
      void updateThemePreferenceAction(theme);
    });
  };

  return <ThemeToggle onThemeChange={handleThemeChange} />;
}
