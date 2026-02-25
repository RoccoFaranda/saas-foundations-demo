import { cookies } from "next/headers";
import { ThemePreference } from "@/src/generated/prisma/enums";
import {
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_COOKIE_SAME_SITE,
  isThemeCookieValue,
} from "./cookie-contract";

const THEME_VALUES = new Set<ThemePreference>(Object.values(ThemePreference));

export function normalizeThemePreference(
  value: ThemePreference | null | undefined
): ThemePreference {
  return value ?? ThemePreference.system;
}

export async function getThemeCookie(): Promise<ThemePreference | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(THEME_COOKIE_NAME)?.value ?? null;
  if (cookieValue && isThemeCookieValue(cookieValue) && THEME_VALUES.has(cookieValue)) {
    return cookieValue as ThemePreference;
  }
  return null;
}

export async function setThemeCookie(theme: ThemePreference) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    httpOnly: false,
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
    sameSite: THEME_COOKIE_SAME_SITE,
    secure: process.env.NODE_ENV === "production",
  });
}
