import "server-only";
import { cookies } from "next/headers";
import { CONSENT_COOKIE_NAME } from "./config";
import { normalizeConsentState, parseConsentStateFromCookieValue } from "./state";
import type { ConsentState } from "./types";

export async function getConsentCookieState(): Promise<ConsentState | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CONSENT_COOKIE_NAME)?.value ?? null;
  return normalizeConsentState(parseConsentStateFromCookieValue(value));
}
