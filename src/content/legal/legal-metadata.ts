import {
  getLegalContactAddress,
  getLegalContactEmail,
  getLegalControllerName,
  getLegalDpoContact,
} from "@/src/lib/config/site-metadata";

export const PRIVACY_EFFECTIVE_DATE = "February 23, 2026";
export const TERMS_EFFECTIVE_DATE = "February 23, 2026";
export const COOKIE_DECLARATION_EFFECTIVE_DATE = "February 24, 2026";
export const COOKIE_DECLARATION_LAST_UPDATED = "February 25, 2026";

export const PRIVACY_VERSION = "2026.02.23";
export const TERMS_VERSION = "2026.02.23";

export const LEGAL_CONTROLLER_NAME = getLegalControllerName();
export const LEGAL_CONTACT_EMAIL = getLegalContactEmail();

export const LEGAL_CONTACT_ADDRESS = getLegalContactAddress();
export const LEGAL_DPO_CONTACT = getLegalDpoContact();
