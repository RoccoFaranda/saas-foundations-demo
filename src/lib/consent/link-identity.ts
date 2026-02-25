import { enqueueConsentAuditReplay, flushConsentAuditReplayQueue } from "./audit-queue";
import { createConsentAuditEventId, createConsentAuditOccurredAt } from "./audit-metadata";

const QUEUEABLE_STATUS_CODES = new Set([401, 403, 500, 502, 503, 504]);

interface LinkIdentityOptions {
  fetchImpl?: typeof fetch;
}

export type LinkIdentityResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAt?: number; error?: string }
  | { ok: false; reason: "queued_for_replay" | "failed" };

function queueIdentityLinkReplay(eventId: string, replayToken: unknown): boolean {
  if (typeof replayToken !== "string" || replayToken.length === 0) {
    return false;
  }

  enqueueConsentAuditReplay({
    kind: "identity_link",
    eventId,
    replayToken,
  });
  void flushConsentAuditReplayQueue();
  return true;
}

interface ParsedIdentityLinkResponse {
  replayToken?: unknown;
  retryAt?: unknown;
  error?: unknown;
}

async function parseIdentityLinkResponse(response: Response): Promise<ParsedIdentityLinkResponse> {
  try {
    return (await response.json()) as ParsedIdentityLinkResponse;
  } catch {
    return {};
  }
}

async function parseRateLimitedResponse(response: Response): Promise<{
  retryAt?: number;
  error?: string;
}> {
  const payload = await parseIdentityLinkResponse(response);
  const retryAt = typeof payload.retryAt === "number" ? payload.retryAt : undefined;
  const error = typeof payload.error === "string" ? payload.error : undefined;

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
      const responsePayload = await parseIdentityLinkResponse(response);
      const queued = queueIdentityLinkReplay(auditEventId, responsePayload.replayToken);
      if (queued) {
        console.warn(
          `[consent] Identity link request failed with status ${response.status}; queued replay.`
        );
      } else {
        console.warn(
          `[consent] Identity link request failed with status ${response.status}; no replay token returned.`
        );
      }
      return {
        ok: false,
        reason: queued ? "queued_for_replay" : "failed",
      };
    }

    console.warn(`[consent] Identity link request failed with status ${response.status}.`);
    return { ok: false, reason: "failed" };
  } catch (error) {
    console.warn(
      "[consent] Identity link request failed and cannot be replayed without server token:",
      error
    );
    return {
      ok: false,
      reason: "failed",
    };
  }
}
