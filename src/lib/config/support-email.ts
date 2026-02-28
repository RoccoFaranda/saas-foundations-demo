const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSupportEmail(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[config] SUPPORT_EMAIL must be a valid email address.");
    }
    return null;
  }

  return trimmed;
}

export function getSupportEmail(): string | null {
  const supportEmail = normalizeSupportEmail(process.env.SUPPORT_EMAIL);
  if (supportEmail) {
    return supportEmail;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("[config] SUPPORT_EMAIL is required in production.");
  }

  return null;
}

export function getSupportMailtoHref(): string | null {
  const supportEmail = getSupportEmail();
  return supportEmail ? `mailto:${supportEmail}` : null;
}
