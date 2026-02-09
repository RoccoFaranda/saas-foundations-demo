"use server";

import prisma from "@/src/lib/db";
import { requireVerifiedUser } from "@/src/lib/auth";
import { ThemePreference } from "@/src/generated/prisma/enums";

const validThemePreferences = new Set(Object.values(ThemePreference));

export type ThemePreferenceUpdateResult = { success: true } | { success: false; error: string };

export async function updateThemePreferenceAction(
  theme: ThemePreference
): Promise<ThemePreferenceUpdateResult> {
  if (!validThemePreferences.has(theme)) {
    return { success: false, error: "Invalid theme preference." };
  }

  const user = await requireVerifiedUser();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { themePreference: theme },
    });
  } catch (error) {
    console.error("[theme] Failed to update preference:", error);
    return { success: false, error: "Failed to update theme preference." };
  }

  return { success: true };
}
