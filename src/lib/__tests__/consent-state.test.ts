import { describe, expect, it } from "vitest";
import { CONSENT_VERSION } from "../consent/config";
import {
  applyGpcToOptionalCategories,
  createConsentState,
  normalizeConsentState,
  parseConsentStateFromCookieValue,
  serializeConsentStateForCookie,
} from "../consent/state";

describe("consent state", () => {
  it("creates consent state with necessary category forced on", () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
    });

    expect(state.version).toBe(CONSENT_VERSION);
    expect(state.categories.necessary).toBe(true);
    expect(state.categories.functional).toBe(true);
  });

  it("serializes and parses valid cookie payload", () => {
    const input = createConsentState({
      source: "banner_reject_all",
      categories: {
        functional: false,
        analytics: false,
        marketing: false,
      },
    });

    const value = serializeConsentStateForCookie(input);
    const parsed = parseConsentStateFromCookieValue(value);

    expect(parsed).not.toBeNull();
    expect(parsed?.consentId).toBe(input.consentId);
    expect(parsed?.source).toBe("banner_reject_all");
  });

  it("returns null for malformed cookie payloads", () => {
    expect(parseConsentStateFromCookieValue("not-json")).toBeNull();
    expect(parseConsentStateFromCookieValue(null)).toBeNull();
  });

  it("drops stale consent versions during normalization", () => {
    const stale = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: true,
        marketing: false,
      },
    });

    const normalized = normalizeConsentState({
      ...stale,
      version: "2020.01.01",
    });

    expect(normalized).toBeNull();
  });

  it("forces optional categories off for GPC", () => {
    const categories = applyGpcToOptionalCategories();
    expect(categories.functional).toBe(false);
    expect(categories.analytics).toBe(false);
    expect(categories.marketing).toBe(false);
  });
});
