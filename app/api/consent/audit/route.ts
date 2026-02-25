import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
} from "@/src/lib/auth/rate-limit";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { persistConsentAuditEventWithRetry } from "@/src/lib/consent/audit-server";
import { consentAuditReplayPayloadSchema } from "@/src/lib/consent/schema";

const DEFAULT_RETRY_AFTER_SECONDS = "2";

function withRetryHeaders(status: number) {
  return {
    status,
    headers: { "Retry-After": DEFAULT_RETRY_AFTER_SECONDS },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = consentAuditReplayPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid audit payload." }, { status: 400 });
  }

  const requestIp = getRequestIpFromHeaders(request.headers);
  const replayRateLimit = await enforceRateLimit("consentAuditReplay", [
    `consent:${parsed.data.consentId}`,
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (replayRateLimit) {
    const retryAfter = getRetryAfterSeconds(replayRateLimit.retryAt);
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "rate_limited",
        auditEventId: parsed.data.eventId,
        error: replayRateLimit.error,
        retryAt: replayRateLimit.retryAt,
      },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }
    );
  }

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch (error) {
    console.error("[consent] Failed to resolve auth session for audit replay:", error);
  }

  const requiresAuthenticatedUser = parsed.data.source === CONSENT_EVENT_SOURCE_IDENTITY_LINK;
  if (requiresAuthenticatedUser && !userId) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "unauthenticated_for_identity_link",
        auditEventId: parsed.data.eventId,
      },
      withRetryHeaders(401)
    );
  }

  const auditResult = await persistConsentAuditEventWithRetry({
    eventId: parsed.data.eventId,
    occurredAt: parsed.data.occurredAt,
    consentId: parsed.data.consentId,
    userId,
    version: parsed.data.version,
    source: parsed.data.source,
    gpcHonored: parsed.data.gpcHonored,
    categories: parsed.data.categories,
  });

  if (auditResult.auditAccepted) {
    return NextResponse.json({
      auditAccepted: true,
      persisted: auditResult.persisted,
      reason: auditResult.reason,
      auditEventId: auditResult.eventId,
    });
  }

  return NextResponse.json(
    {
      auditAccepted: false,
      persisted: false,
      reason: auditResult.reason,
      auditEventId: auditResult.eventId,
    },
    withRetryHeaders(503)
  );
}
