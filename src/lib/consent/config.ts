import type { ConsentCategories } from "./types";

export const CONSENT_COOKIE_NAME = "sf_consent";
export const CONSENT_VERSION = "2026.02.23";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
export const CONSENT_OPEN_PREFERENCES_EVENT = "sf-consent:open-preferences";
export const CONSENT_EVENT_SOURCE_IDENTITY_LINK = "identity_link";
export const CONSENT_SYNC_CHANNEL_NAME = "sf-consent-sync";
export const CONSENT_SYNC_STORAGE_KEY = "sf-consent-sync-event";

export const DEFAULT_CONSENT_CATEGORIES: ConsentCategories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};
