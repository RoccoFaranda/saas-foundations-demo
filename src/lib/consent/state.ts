import { CONSENT_MAX_AGE_SECONDS, CONSENT_VERSION, DEFAULT_CONSENT_CATEGORIES } from "./config";
import { consentStateSchema } from "./schema";
import type { ConsentCategories, ConsentSource, ConsentState } from "./types";

function generateConsentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `consent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function parseAndValidateConsentState(value: string): ConsentState | null {
  try {
    const parsed = JSON.parse(value);
    const validated = consentStateSchema.safeParse(parsed);
    if (!validated.success) {
      return null;
    }
    return validated.data;
  } catch {
    return null;
  }
}

function ensureNecessaryCategory(
  categories: Omit<ConsentCategories, "necessary">
): ConsentCategories {
  return {
    necessary: true,
    functional: categories.functional,
    analytics: categories.analytics,
    marketing: categories.marketing,
  };
}

export function createConsentState(input: {
  source: ConsentSource;
  categories: Omit<ConsentCategories, "necessary">;
  gpcHonored?: boolean;
  consentId?: string;
  updatedAt?: string;
}): ConsentState {
  return {
    consentId: input.consentId ?? generateConsentId(),
    version: CONSENT_VERSION,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    source: input.source,
    gpcHonored: Boolean(input.gpcHonored),
    categories: ensureNecessaryCategory(input.categories),
  };
}

export function createDefaultConsentState(
  source: ConsentSource = "preferences_save"
): ConsentState {
  return createConsentState({
    source,
    categories: {
      functional: DEFAULT_CONSENT_CATEGORIES.functional,
      analytics: DEFAULT_CONSENT_CATEGORIES.analytics,
      marketing: DEFAULT_CONSENT_CATEGORIES.marketing,
    },
  });
}

export function applyGpcToOptionalCategories(): Omit<ConsentCategories, "necessary"> {
  return {
    functional: false,
    analytics: false,
    marketing: false,
  };
}

export function parseConsentStateFromCookieValue(
  value: string | null | undefined
): ConsentState | null {
  if (!value) {
    return null;
  }

  const jsonRaw = parseAndValidateConsentState(value);
  if (jsonRaw) {
    return jsonRaw;
  }

  const uriDecoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  })();
  if (uriDecoded) {
    const jsonDecoded = parseAndValidateConsentState(uriDecoded);
    if (jsonDecoded) {
      return jsonDecoded;
    }
  }

  const base64Decoded = decodeBase64Url(value);
  if (base64Decoded) {
    const jsonFromBase64 = parseAndValidateConsentState(base64Decoded);
    if (jsonFromBase64) {
      return jsonFromBase64;
    }
  }

  if (uriDecoded) {
    const base64DecodedFromUri = decodeBase64Url(uriDecoded);
    if (base64DecodedFromUri) {
      const jsonFromBase64Uri = parseAndValidateConsentState(base64DecodedFromUri);
      if (jsonFromBase64Uri) {
        return jsonFromBase64Uri;
      }
    }
  }

  return null;
}

export function isConsentStateCurrentVersion(state: ConsentState): boolean {
  return state.version === CONSENT_VERSION;
}

export function normalizeConsentState(state: ConsentState | null): ConsentState | null {
  if (!state) {
    return null;
  }
  if (!isConsentStateCurrentVersion(state)) {
    return null;
  }
  return state;
}

export function serializeConsentStateForCookie(state: ConsentState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function getConsentCookieAttributes() {
  return {
    httpOnly: false,
    path: "/",
    sameSite: "lax" as const,
    maxAge: CONSENT_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}
