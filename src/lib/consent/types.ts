export const CONSENT_CATEGORIES = ["necessary", "functional", "analytics", "marketing"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export const CONSENT_SOURCES = [
  "banner_accept_all",
  "banner_reject_all",
  "preferences_save",
  "gpc",
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export interface ConsentCategories {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentState {
  consentId: string;
  version: string;
  updatedAt: string;
  source: ConsentSource;
  gpcHonored: boolean;
  categories: ConsentCategories;
}
