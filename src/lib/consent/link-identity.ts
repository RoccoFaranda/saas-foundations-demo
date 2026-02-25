import {
  enqueueConsentAuditReplay,
  flushConsentAuditReplayQueue,
  type ConsentAuditReplayPayload,
} from "./audit-queue";
import { createConsentAuditEventId, createConsentAuditOccurredAt } from "./audit-metadata";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK, CONSENT_VERSION } from "./config";
import { consentStateSchema } from "./schema";
import type { ConsentState } from "./types";

const RETRYABLE_STATUS_CODES = new Set([401, 403, 429, 500, 502, 503, 504]);

interface LinkIdentityOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: typeof fetch;
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(maxDelayMs, exponential);
}

function getCookieValueFromDocument(key: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookiePrefix = `${key}=`;
  const pairs = document.cookie.split(";");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(cookiePrefix)) {
      return trimmed.slice(cookiePrefix.length);
    }
  }

  return null;
}

function parseCandidateConsentState(value: string): ConsentState | null {
  try {
    const parsed = JSON.parse(value);
    const validated = consentStateSchema.safeParse(parsed);
    if (!validated.success) {
      return null;
    }
    if (validated.data.version !== CONSENT_VERSION) {
      return null;
    }
    return validated.data;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
    if (typeof atob !== "function") {
      return null;
    }
    return atob(padded);
  } catch {
    return null;
  }
}

function parseConsentStateFromCookieValue(value: string | null): ConsentState | null {
  if (!value) {
    return null;
  }

  const direct = parseCandidateConsentState(value);
  if (direct) {
    return direct;
  }

  const uriDecoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  })();
  if (uriDecoded) {
    const parsedUri = parseCandidateConsentState(uriDecoded);
    if (parsedUri) {
      return parsedUri;
    }
  }

  const base64Decoded = decodeBase64Url(value);
  if (base64Decoded) {
    const parsedBase64 = parseCandidateConsentState(base64Decoded);
    if (parsedBase64) {
      return parsedBase64;
    }
  }

  if (uriDecoded) {
    const base64UriDecoded = decodeBase64Url(uriDecoded);
    if (base64UriDecoded) {
      return parseCandidateConsentState(base64UriDecoded);
    }
  }

  return null;
}

function buildIdentityLinkReplayPayload(
  eventId: string,
  occurredAt: string
): ConsentAuditReplayPayload | null {
  const state = parseConsentStateFromCookieValue(getCookieValueFromDocument(CONSENT_COOKIE_NAME));
  if (!state) {
    return null;
  }

  return {
    eventId,
    occurredAt,
    consentId: state.consentId,
    version: state.version,
    source: CONSENT_EVENT_SOURCE_IDENTITY_LINK,
    gpcHonored: state.gpcHonored,
    categories: state.categories,
  };
}

function queueIdentityLinkReplay(eventId: string, occurredAt: string) {
  const payload = buildIdentityLinkReplayPayload(eventId, occurredAt);
  if (!payload) {
    return;
  }

  enqueueConsentAuditReplay({
    kind: "identity_link",
    payload,
  });
  void flushConsentAuditReplayQueue();
}

export async function linkIdentityWithRetry({
  maxAttempts = 3,
  baseDelayMs = 200,
  maxDelayMs = 1000,
  fetchImpl = fetch,
}: LinkIdentityOptions = {}): Promise<boolean> {
  const safeMaxAttempts = Math.max(1, maxAttempts);
  const safeBaseDelayMs = Math.max(0, baseDelayMs);
  const safeMaxDelayMs = Math.max(safeBaseDelayMs, maxDelayMs);
  const auditEventId = createConsentAuditEventId();
  const auditOccurredAt = createConsentAuditOccurredAt();

  for (let attempt = 1; attempt <= safeMaxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl("/api/consent/link", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: auditEventId,
          occurredAt: auditOccurredAt,
        }),
      });

      if (response.ok) {
        return true;
      }

      const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < safeMaxAttempts;
      if (!shouldRetry) {
        if (RETRYABLE_STATUS_CODES.has(response.status)) {
          queueIdentityLinkReplay(auditEventId, auditOccurredAt);
        }
        console.warn(
          `[consent] Identity link request failed with status ${response.status}; not retrying.`
        );
        return false;
      }
    } catch (error) {
      if (attempt >= safeMaxAttempts) {
        queueIdentityLinkReplay(auditEventId, auditOccurredAt);
        console.warn("[consent] Identity link request failed after retries:", error);
        return false;
      }
    }

    const delayMs = getRetryDelayMs(attempt, safeBaseDelayMs, safeMaxDelayMs);
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return false;
}
