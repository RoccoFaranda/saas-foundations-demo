import { CONSENT_CATEGORIES, type ConsentCategory } from "./types";

export type ConsentStorageType =
  | "cookie"
  | "local_storage"
  | "session_storage"
  | "token_or_request";
export type ConsentParty = "first_party" | "third_party";

export interface ConsentStorageEntry {
  key: string;
  storageType: ConsentStorageType;
  duration: string;
  purpose: string;
}

export interface ConsentManagedService {
  id: string;
  name: string;
  category: ConsentCategory;
  essential: boolean;
  description: string;
  provider: string;
  party: ConsentParty;
  entries: ConsentStorageEntry[];
}

export interface ConsentTableRow {
  category: ConsentCategory;
  required: boolean;
  serviceId: string;
  serviceName: string;
  provider: string;
  party: ConsentParty;
  description: string;
  key: string;
  storageType: ConsentStorageType;
  duration: string;
  purpose: string;
}

export interface ConsentRowsByCategory {
  category: ConsentCategory;
  rows: ConsentTableRow[];
}

const baseServices: ConsentManagedService[] = [
  {
    id: "auth_session",
    name: "Authentication and session security",
    category: "necessary",
    essential: true,
    description: "Keeps signed-in sessions secure and maintains core account access.",
    provider: "SaaS Foundations Demo (Auth.js)",
    party: "first_party",
    entries: [
      {
        key: "authjs.session-token",
        storageType: "cookie",
        duration: "Session (rotated while active)",
        purpose: "Maintains authenticated session state for signed-in users.",
      },
      {
        key: "__Secure-authjs.session-token",
        storageType: "cookie",
        duration: "Session (secure context only)",
        purpose: "Secure session token variant used in HTTPS contexts.",
      },
      {
        key: "authjs.csrf-token",
        storageType: "cookie",
        duration: "Session",
        purpose: "Protects Auth.js form submissions against cross-site request forgery.",
      },
      {
        key: "__Host-authjs.csrf-token",
        storageType: "cookie",
        duration: "Session (secure context only)",
        purpose: "Secure CSRF token variant used in HTTPS contexts.",
      },
      {
        key: "authjs.callback-url",
        storageType: "cookie",
        duration: "Session",
        purpose: "Stores the post-authentication return URL for Auth.js flows.",
      },
      {
        key: "__Secure-authjs.callback-url",
        storageType: "cookie",
        duration: "Session (secure context only)",
        purpose: "Secure callback URL variant used in HTTPS contexts.",
      },
    ],
  },
  {
    id: "theme_preference",
    name: "Theme preference",
    category: "necessary",
    essential: true,
    description: "Stores light/dark/system preference for accessibility and UX continuity.",
    provider: "SaaS Foundations Demo",
    party: "first_party",
    entries: [
      {
        key: "theme",
        storageType: "cookie",
        duration: "1 year",
        purpose: "Persists display theme preference across visits.",
      },
      {
        key: "theme",
        storageType: "local_storage",
        duration: "Persistent until changed or cleared",
        purpose: "Allows theme resolution before hydration and across sessions.",
      },
    ],
  },
  {
    id: "consent_preference_and_replay",
    name: "Cookie preference state and replay reliability",
    category: "necessary",
    essential: true,
    description:
      "Stores consent choices and reliability metadata used for replay and cross-tab sync.",
    provider: "SaaS Foundations Demo",
    party: "first_party",
    entries: [
      {
        key: "sf_consent",
        storageType: "cookie",
        duration: "180 days",
        purpose: "Persists cookie consent state, consent context ID, and consent version.",
      },
      {
        key: "sf-consent-audit-queue:v2",
        storageType: "local_storage",
        duration: "Up to 7 days (auto-pruned)",
        purpose: "Temporarily stores signed replay tokens when audit persistence must retry.",
      },
      {
        key: "sf-consent-sync-event",
        storageType: "local_storage",
        duration: "Ephemeral (overwritten on updates)",
        purpose: "Broadcasts consent updates across tabs when BroadcastChannel fallback is needed.",
      },
    ],
  },
  {
    id: "turnstile_signup",
    name: "Signup abuse prevention",
    category: "necessary",
    essential: true,
    description: "Protects signup flow from automated abuse with security checks.",
    provider: "Cloudflare Turnstile",
    party: "third_party",
    entries: [
      {
        key: "cf-turnstile-response",
        storageType: "token_or_request",
        duration: "Single request / short-lived challenge",
        purpose: "Validates that signup requests are human and mitigates abuse.",
      },
    ],
  },
];

if (process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS === "true") {
  baseServices.push({
    id: "demo_analytics",
    name: "Demo analytics (test service)",
    category: "analytics",
    essential: false,
    description: "Test-only analytics service used for consent-gating verification.",
    provider: "SaaS Foundations Demo",
    party: "first_party",
    entries: [
      {
        key: "sf_demo_analytics",
        storageType: "cookie",
        duration: "180 days",
        purpose: "Test-only analytics cookie used to verify consent-gating behavior.",
      },
    ],
  });
}

export const CONSENT_SERVICES = baseServices;
export const NON_ESSENTIAL_CONSENT_SERVICES = CONSENT_SERVICES.filter(
  (service) => !service.essential
);
export const HAS_NON_ESSENTIAL_CONSENT_SERVICES = NON_ESSENTIAL_CONSENT_SERVICES.length > 0;

const serviceById = new Map(CONSENT_SERVICES.map((service) => [service.id, service]));
const categoryOrder = new Map(CONSENT_CATEGORIES.map((category, index) => [category, index]));

export function getConsentServiceById(id: string): ConsentManagedService | undefined {
  return serviceById.get(id);
}

function sortConsentRows(left: ConsentTableRow, right: ConsentTableRow) {
  const leftCategoryOrder = categoryOrder.get(left.category) ?? Number.MAX_SAFE_INTEGER;
  const rightCategoryOrder = categoryOrder.get(right.category) ?? Number.MAX_SAFE_INTEGER;
  if (leftCategoryOrder !== rightCategoryOrder) {
    return leftCategoryOrder - rightCategoryOrder;
  }

  const serviceNameOrder = left.serviceName.localeCompare(right.serviceName);
  if (serviceNameOrder !== 0) {
    return serviceNameOrder;
  }

  return left.key.localeCompare(right.key);
}

export function getConsentTableRows(): ConsentTableRow[] {
  const rows = CONSENT_SERVICES.flatMap((service) =>
    service.entries.map((entry) => ({
      category: service.category,
      required: service.essential,
      serviceId: service.id,
      serviceName: service.name,
      provider: service.provider,
      party: service.party,
      description: service.description,
      key: entry.key,
      storageType: entry.storageType,
      duration: entry.duration,
      purpose: entry.purpose,
    }))
  );

  return [...rows].sort(sortConsentRows);
}

export function getConsentRowsByCategory(): ConsentRowsByCategory[] {
  const rows = getConsentTableRows();
  return CONSENT_CATEGORIES.map((category) => ({
    category,
    rows: rows.filter((row) => row.category === category),
  })).filter((group) => group.rows.length > 0);
}
