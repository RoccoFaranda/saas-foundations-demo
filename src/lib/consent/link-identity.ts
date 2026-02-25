import {
  enqueueConsentAuditReplay,
  flushConsentAuditReplayQueue,
  type ConsentAuditReplayPayload,
} from "./audit-queue";
import { createConsentAuditEventId, createConsentAuditOccurredAt } from "./audit-metadata";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK, CONSENT_VERSION } from "./config";
import { consentStateSchema } from "./schema";
import type { ConsentState } from "./types";

const QUEUEABLE_STATUS_CODES = new Set([401, 403, 500, 502, 503, 504]);

interface LinkIdentityOptions {
  fetchImpl?: typeof fetch;
}

export type LinkIdentityResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAt?: number; error?: string }
  | { ok: false; reason: "queued_for_replay" | "failed" };

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

function queueIdentityLinkReplay(eventId: string, occurredAt: string): boolean {
  const payload = buildIdentityLinkReplayPayload(eventId, occurredAt);
  if (!payload) {
    return false;
  }

  enqueueConsentAuditReplay({
    kind: "identity_link",
    payload,
  });
  void flushConsentAuditReplayQueue();
  return true;
}

async function parseRateLimitedResponse(response: Response): Promise<{
  retryAt?: number;
  error?: string;
}> {
  let retryAt: number | undefined;
  let error: string | undefined;

  try {
    const payload = (await response.json()) as {
      retryAt?: unknown;
      error?: unknown;
    };

    retryAt = typeof payload.retryAt === "number" ? payload.retryAt : undefined;
    error = typeof payload.error === "string" ? payload.error : undefined;
  } catch {
    // Ignore malformed rate-limit payloads.
  }

  if (retryAt) {
    return { retryAt, error };
  }

  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) {
    return { error };
  }

  const retryAfterSeconds = Number.parseInt(retryAfter, 10);
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return { error };
  }

  return { retryAt: Date.now() + retryAfterSeconds * 1000, error };
}

export async function linkIdentityWithRetry({
  fetchImpl = fetch,
}: LinkIdentityOptions = {}): Promise<LinkIdentityResult> {
  const auditEventId = createConsentAuditEventId();
  const auditOccurredAt = createConsentAuditOccurredAt();

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
      return { ok: true };
    }

    if (response.status === 429) {
      const rateLimited = await parseRateLimitedResponse(response);
      console.warn("[consent] Identity link rate limited.");
      return {
        ok: false,
        reason: "rate_limited",
        retryAt: rateLimited.retryAt,
        error: rateLimited.error,
      };
    }

    if (QUEUEABLE_STATUS_CODES.has(response.status)) {
      const queued = queueIdentityLinkReplay(auditEventId, auditOccurredAt);
      console.warn(
        `[consent] Identity link request failed with status ${response.status}; queued replay.`
      );
      return {
        ok: false,
        reason: queued ? "queued_for_replay" : "failed",
      };
    }

    console.warn(`[consent] Identity link request failed with status ${response.status}.`);
    return { ok: false, reason: "failed" };
  } catch (error) {
    const queued = queueIdentityLinkReplay(auditEventId, auditOccurredAt);
    console.warn("[consent] Identity link request failed:", error);
    return {
      ok: false,
      reason: queued ? "queued_for_replay" : "failed",
    };
  }
}
