function createRandomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `consent-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createConsentAuditEventId() {
  return createRandomToken();
}

export function createConsentAuditOccurredAt() {
  return new Date().toISOString();
}
