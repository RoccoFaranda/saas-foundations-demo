import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
} from "@/src/lib/auth/rate-limit";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { persistConsentAuditEventWithRetry } from "@/src/lib/consent/audit-server";
import {
  verifyConsentAuditReplayToken,
  type ConsentAuditReplayClaims,
} from "@/src/lib/consent/replay-token";
import { consentAuditReplayPayloadSchema } from "@/src/lib/consent/schema";
import { normalizeConsentState, parseConsentStateFromCookieValue } from "@/src/lib/consent/state";

const DEFAULT_RETRY_AFTER_SECONDS = "2";

function withRetryHeaders(status: number) {
  return {
    status,
    headers: { "Retry-After": DEFAULT_RETRY_AFTER_SECONDS },
  };
}

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

  let replayClaims: ConsentAuditReplayClaims | null = null;
  try {
    const verifiedReplayToken = verifyConsentAuditReplayToken(parsed.data.replayToken);
    if (!verifiedReplayToken.ok) {
      if (verifiedReplayToken.reason === "expired") {
        return NextResponse.json(
          {
            auditAccepted: false,
            persisted: false,
            reason: "replay_token_expired",
          },
          { status: 410 }
        );
      }

      const errorReason =
        verifiedReplayToken.reason === "invalid_signature"
          ? "invalid_replay_signature"
          : "invalid_replay_token";
      return NextResponse.json(
        {
          auditAccepted: false,
          persisted: false,
          reason: errorReason,
        },
        { status: 403 }
      );
    }

    replayClaims = verifiedReplayToken.claims;
  } catch (error) {
    console.error("[consent] Failed to verify signed consent replay token:", error);
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "replay_verification_unavailable",
      },
      withRetryHeaders(503)
    );
  }

  if (!replayClaims) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "replay_verification_unavailable",
      },
      withRetryHeaders(503)
    );
  }

  const rawConsentState = parseConsentStateFromCookieValue(
    getCookieValueFromRequest(request, CONSENT_COOKIE_NAME)
  );
  const consentState = normalizeConsentState(rawConsentState);
  if (!consentState) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "consent_context_unavailable",
        auditEventId: replayClaims.eventId,
      },
      { status: 403 }
    );
  }

  if (consentState.consentId !== replayClaims.consentId) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "consent_context_mismatch",
        auditEventId: replayClaims.eventId,
      },
      { status: 403 }
    );
  }

  const requestIp = getRequestIpFromHeaders(request.headers);
  const replayRateLimit = await enforceRateLimit("consentAuditReplay", [
    `consent:${replayClaims.consentId}`,
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (replayRateLimit) {
    const retryAfter = getRetryAfterSeconds(replayRateLimit.retryAt);
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "rate_limited",
        auditEventId: replayClaims.eventId,
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

  const requiresAuthenticatedUser = replayClaims.source === CONSENT_EVENT_SOURCE_IDENTITY_LINK;
  if (requiresAuthenticatedUser && !userId) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "unauthenticated_for_identity_link",
        auditEventId: replayClaims.eventId,
      },
      withRetryHeaders(401)
    );
  }

  if (requiresAuthenticatedUser && replayClaims.userId !== userId) {
    return NextResponse.json(
      {
        auditAccepted: false,
        persisted: false,
        reason: "identity_link_user_mismatch",
        auditEventId: replayClaims.eventId,
      },
      { status: 403 }
    );
  }

  const auditResult = await persistConsentAuditEventWithRetry({
    eventId: replayClaims.eventId,
    occurredAt: replayClaims.occurredAt,
    consentId: replayClaims.consentId,
    userId,
    version: replayClaims.version,
    source: replayClaims.source,
    gpcHonored: replayClaims.gpcHonored,
    categories: replayClaims.categories,
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
