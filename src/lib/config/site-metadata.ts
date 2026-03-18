const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_PUBLIC_CONTACT_EMAIL = "hello@saasfoundationsdemo.com";
const DEFAULT_LEGAL_CONTACT_EMAIL = "legal@saasfoundationsdemo.com";
const DEFAULT_LEGAL_CONTROLLER_NAME = "Rocco Faranda (SaaS Foundations Demo)";

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function readRequiredTextEnv({
  key,
  fallback,
  validator,
  validationMessage,
}: {
  key: string;
  fallback: string;
  validator?: (value: string) => boolean;
  validationMessage?: string;
}): string {
  const rawValue = process.env[key];
  const trimmed = rawValue?.trim();
  const value = trimmed && trimmed.length > 0 ? trimmed : null;

  if (!value) {
    if (isProductionEnv()) {
      throw new Error(`[config] ${key} is required in production.`);
    }
    return fallback;
  }

  if (validator && !validator(value)) {
    if (isProductionEnv()) {
      throw new Error(validationMessage ?? `[config] ${key} is invalid.`);
    }
    return fallback;
  }

  return value;
}

function readOptionalTextEnv(key: string): string | null {
  const rawValue = process.env[key];
  const trimmed = rawValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function getPublicContactEmail(): string {
  return readRequiredTextEnv({
    key: "PUBLIC_CONTACT_EMAIL",
    fallback: DEFAULT_PUBLIC_CONTACT_EMAIL,
    validator: isEmail,
    validationMessage: "[config] PUBLIC_CONTACT_EMAIL must be a valid email address.",
  });
}

export function getLegalContactEmail(): string {
  return readRequiredTextEnv({
    key: "LEGAL_CONTACT_EMAIL",
    fallback: DEFAULT_LEGAL_CONTACT_EMAIL,
    validator: isEmail,
    validationMessage: "[config] LEGAL_CONTACT_EMAIL must be a valid email address.",
  });
}

export function getLegalControllerName(): string {
  return readRequiredTextEnv({
    key: "LEGAL_CONTROLLER_NAME",
    fallback: DEFAULT_LEGAL_CONTROLLER_NAME,
  });
}

export function getLegalContactAddress(): string | null {
  return readOptionalTextEnv("LEGAL_CONTACT_ADDRESS");
}

export function getLegalDpoContact(): string | null {
  return readOptionalTextEnv("LEGAL_DPO_CONTACT");
}
