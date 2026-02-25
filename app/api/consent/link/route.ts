import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
} from "@/src/lib/auth/rate-limit";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { createConsentAuditEventId } from "@/src/lib/consent/audit-metadata";
import { persistConsentAuditEventWithRetry } from "@/src/lib/consent/audit-server";
import { createConsentAuditReplayToken } from "@/src/lib/consent/replay-token";
import { consentLinkPayloadSchema } from "@/src/lib/consent/schema";
import { normalizeConsentState, parseConsentStateFromCookieValue } from "@/src/lib/consent/state";

function getCookieValueFromRequest(request: Request, key: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookiePrefix = `${key}=`;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(cookiePrefix)) {
      return trimmed.slice(cookiePrefix.length);
    }
  }

  return null;
}

async function parseOptionalLinkPayload(request: Request): Promise<{
  eventId?: string;
  occurredAt?: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {};
  }

  try {
    const body = await request.json();
    const parsed = consentLinkPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return {};
    }
    return parsed.data;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const payload = await parseOptionalLinkPayload(request);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ linked: false, reason: "unauthenticated" });
  }

  const rawState = parseConsentStateFromCookieValue(
    getCookieValueFromRequest(request, CONSENT_COOKIE_NAME)
  );
  const state = normalizeConsentState(rawState);
  if (!state) {
    return NextResponse.json({ linked: false, reason: "missing_consent_state" });
  }

  const requestIp = getRequestIpFromHeaders(request.headers);
  const linkRateLimit = await enforceRateLimit("consentLink", [
    `user:${userId}`,
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (linkRateLimit) {
    const retryAfter = getRetryAfterSeconds(linkRateLimit.retryAt);
    return NextResponse.json(
      {
        linked: false,
        auditAccepted: false,
        persisted: false,
        reason: "rate_limited",
        error: linkRateLimit.error,
        retryAt: linkRateLimit.retryAt,
      },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }
    );
  }

  const auditEventId = payload.eventId ?? createConsentAuditEventId();
  const auditOccurredAt = payload.occurredAt ?? state.updatedAt;
  const auditResult = await persistConsentAuditEventWithRetry({
    eventId: auditEventId,
    occurredAt: auditOccurredAt,
    consentId: state.consentId,
    userId,
    version: state.version,
    source: CONSENT_EVENT_SOURCE_IDENTITY_LINK,
    gpcHonored: state.gpcHonored,
    categories: state.categories,
  });
  let replayToken: string | undefined;
  if (!auditResult.auditAccepted) {
    try {
      replayToken = createConsentAuditReplayToken({
        eventId: auditResult.eventId,
        occurredAt: auditOccurredAt,
        consentId: state.consentId,
        version: state.version,
        source: CONSENT_EVENT_SOURCE_IDENTITY_LINK,
        gpcHonored: state.gpcHonored,
        categories: state.categories,
        userId,
      });
    } catch (error) {
      console.error("[consent] Failed to create replay token for identity-link event:", error);
    }
  }

  if (auditResult.reason === "duplicate_state") {
    return NextResponse.json({
      linked: false,
      auditAccepted: true,
      persisted: false,
      auditEventId: auditResult.eventId,
      reason: "already_represented_by_latest_event",
    });
  }

  if (auditResult.reason === "duplicate_event") {
    return NextResponse.json({
      linked: false,
      auditAccepted: true,
      persisted: false,
      auditEventId: auditResult.eventId,
      reason: "duplicate_event",
    });
  }

  if (auditResult.auditAccepted) {
    return NextResponse.json({
      linked: true,
      auditAccepted: true,
      persisted: true,
      auditEventId: auditResult.eventId,
      reason: "linked",
    });
  }

  const reason =
    auditResult.reason === "consent_events_table_missing"
      ? "consent_events_table_missing"
      : "link_failed";
  return NextResponse.json(
    {
      linked: false,
      auditAccepted: false,
      persisted: false,
      auditEventId: auditResult.eventId,
      reason,
      replayToken,
    },
    { status: 503 }
  );
}
