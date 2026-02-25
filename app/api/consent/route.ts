import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
} from "@/src/lib/auth/rate-limit";
import { CONSENT_COOKIE_NAME } from "@/src/lib/consent/config";
import { createConsentAuditEventId } from "@/src/lib/consent/audit-metadata";
import { persistConsentAuditEventWithRetry } from "@/src/lib/consent/audit-server";
import { HAS_NON_ESSENTIAL_CONSENT_SERVICES } from "@/src/lib/consent/services";
import { consentWritePayloadSchema } from "@/src/lib/consent/schema";
import {
  applyGpcToOptionalCategories,
  createConsentState,
  getConsentCookieAttributes,
  normalizeConsentState,
  parseConsentStateFromCookieValue,
  serializeConsentStateForCookie,
} from "@/src/lib/consent/state";

function hasGlobalPrivacyControlSignal(headers: Headers): boolean {
  return headers.get("sec-gpc") === "1";
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

function toResponseReason(
  reason:
    | "persisted"
    | "duplicate_event"
    | "duplicate_state"
    | "retry_later"
    | "consent_events_table_missing"
) {
  if (reason === "duplicate_state") {
    return "already_represented_by_latest_event";
  }
  return reason;
}

export async function GET(request: Request) {
  const rawState = parseConsentStateFromCookieValue(
    getCookieValueFromRequest(request, CONSENT_COOKIE_NAME)
  );
  const state = normalizeConsentState(rawState);
  return NextResponse.json({
    state,
    hasNonEssentialServices: HAS_NON_ESSENTIAL_CONSENT_SERVICES,
    gpcSignal: hasGlobalPrivacyControlSignal(request.headers),
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = consentWritePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid consent payload." }, { status: 400 });
  }

  const gpcSignal = hasGlobalPrivacyControlSignal(request.headers);
  const sourceFromBody = parsed.data.source;
  const shouldHonorGpc = gpcSignal || sourceFromBody === "gpc";
  const categories = shouldHonorGpc ? applyGpcToOptionalCategories() : parsed.data.categories;

  const existingState = parseConsentStateFromCookieValue(
    getCookieValueFromRequest(request, CONSENT_COOKIE_NAME)
  );

  const state = createConsentState({
    source: shouldHonorGpc ? "gpc" : sourceFromBody,
    categories,
    gpcHonored: shouldHonorGpc,
    consentId: existingState?.consentId,
  });

  const requestIp = getRequestIpFromHeaders(request.headers);
  const consentRateLimit = await enforceRateLimit("consentWrite", [
    `consent:${state.consentId}`,
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (consentRateLimit) {
    const retryAfter = getRetryAfterSeconds(consentRateLimit.retryAt);
    return NextResponse.json(
      {
        error: consentRateLimit.error,
        retryAt: consentRateLimit.retryAt,
      },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }
    );
  }

  const auditEventId = parsed.data.eventId ?? createConsentAuditEventId();
  const auditOccurredAt = parsed.data.occurredAt ?? state.updatedAt;

  let sessionUserId: string | null = null;
  try {
    const session = await auth();
    sessionUserId = session?.user?.id ?? null;
  } catch (error) {
    console.error("[consent] Failed to resolve auth session for consent audit write:", error);
  }

  const auditResult = await persistConsentAuditEventWithRetry({
    eventId: auditEventId,
    occurredAt: auditOccurredAt,
    consentId: state.consentId,
    userId: sessionUserId,
    version: state.version,
    source: state.source,
    gpcHonored: state.gpcHonored,
    categories: state.categories,
  });

  return finalizeConsentResponse(state, {
    persisted: auditResult.persisted,
    auditAccepted: auditResult.auditAccepted,
    reason: toResponseReason(auditResult.reason),
    auditEventId: auditResult.eventId,
  });
}

function finalizeConsentResponse(
  state: ReturnType<typeof createConsentState>,
  metadata?: {
    auditAccepted: boolean;
    auditEventId: string;
    persisted: boolean;
    reason: string;
  }
) {
  const response = NextResponse.json({ state, ...metadata });
  response.cookies.set(
    CONSENT_COOKIE_NAME,
    serializeConsentStateForCookie(state),
    getConsentCookieAttributes()
  );
  return response;
}
