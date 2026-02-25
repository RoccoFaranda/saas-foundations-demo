export const THEME_COOKIE_NAME = "theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
export const THEME_COOKIE_SAME_SITE = "lax";

export const THEME_COOKIE_VALUES = ["light", "dark", "system"] as const;
export type ThemeCookieValue = (typeof THEME_COOKIE_VALUES)[number];

const themeCookieValueSet = new Set<string>(THEME_COOKIE_VALUES);

export function isThemeCookieValue(value: string): value is ThemeCookieValue {
  return themeCookieValueSet.has(value);
}

export function serializeThemeCookieForDocument(input: {
  theme: ThemeCookieValue;
  secure: boolean;
}): string {
  const parts = [
    `${THEME_COOKIE_NAME}=${encodeURIComponent(input.theme)}`,
    "path=/",
    `samesite=${THEME_COOKIE_SAME_SITE}`,
    `max-age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (input.secure) {
    parts.push("secure");
  }
  return parts.join("; ");
}
