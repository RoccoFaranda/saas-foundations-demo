import { cookies } from "next/headers";
import { ThemePreference } from "@/src/generated/prisma/enums";

const THEME_COOKIE_NAME = "theme";
const THEME_VALUES = new Set(Object.values(ThemePreference));

export function normalizeThemePreference(
  value: ThemePreference | null | undefined
): ThemePreference {
  return value ?? ThemePreference.system;
}

export async function getThemeCookie(): Promise<ThemePreference | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(THEME_COOKIE_NAME)?.value ?? null;
  if (cookieValue && THEME_VALUES.has(cookieValue as ThemePreference)) {
    return cookieValue as ThemePreference;
  }
  return null;
}

export async function setThemeCookie(theme: ThemePreference) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
