import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";
import { auth } from "@/src/lib/auth/config";
import { CONSENT_COOKIE_NAME } from "@/src/lib/consent/config";
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

let warnedMissingConsentTable = false;

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `consent-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function isMissingConsentEventsTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as {
    code?: string;
    message?: string;
    meta?: {
      code?: string;
    };
  };
  const missingRelationByCode = maybeError.code === "P2010" && maybeError.meta?.code === "42P01";
  const missingRelationByMessage =
    maybeError.code === "P2010" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes('relation "cookie_consent_events" does not exist');

  return missingRelationByCode || missingRelationByMessage;
}

interface ConsentEventSignature {
  version: string;
  gpcHonored: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface LatestConsentEventSignature extends ConsentEventSignature {
  userId: string | null;
}

function hasSameSignature(left: ConsentEventSignature, right: ConsentEventSignature): boolean {
  return (
    left.version === right.version &&
    left.gpcHonored === right.gpcHonored &&
    left.functional === right.functional &&
    left.analytics === right.analytics &&
    left.marketing === right.marketing
  );
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

  const currentSignature: ConsentEventSignature = {
    version: state.version,
    gpcHonored: state.gpcHonored,
    functional: state.categories.functional,
    analytics: state.categories.analytics,
    marketing: state.categories.marketing,
  };

  try {
    const session = await auth();
    const sessionUserId = session?.user?.id ?? null;

    const latestRows = await prisma.$queryRaw<LatestConsentEventSignature[]>`
      SELECT "userId", "version", "gpcHonored", "functional", "analytics", "marketing"
      FROM "cookie_consent_events"
      WHERE "consentId" = ${state.consentId}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 1
    `;
    const latestEvent = latestRows[0] ?? null;

    if (latestEvent?.userId === sessionUserId && hasSameSignature(latestEvent, currentSignature)) {
      return finalizeConsentResponse(state, {
        persisted: false,
        reason: "already_represented_by_latest_event",
      });
    }

    await prisma.$executeRaw`
      INSERT INTO "cookie_consent_events"
        ("id", "consentId", "userId", "version", "source", "gpcHonored", "functional", "analytics", "marketing", "createdAt")
      VALUES
        (${createEventId()}, ${state.consentId}, ${sessionUserId}, ${state.version}, ${state.source}, ${state.gpcHonored}, ${state.categories.functional}, ${state.categories.analytics}, ${state.categories.marketing}, ${new Date()})
    `;
  } catch (error) {
    if (isMissingConsentEventsTableError(error)) {
      if (!warnedMissingConsentTable) {
        warnedMissingConsentTable = true;
        console.warn(
          "[consent] cookie_consent_events table not found; skipping audit persistence until migrations are applied."
        );
      }
      return finalizeConsentResponse(state, {
        persisted: false,
        reason: "consent_events_table_missing",
      });
    }
    console.error("[consent] Failed to persist consent event:", error);
  }

  return finalizeConsentResponse(state, {
    persisted: true,
    reason: "persisted",
  });
}

function finalizeConsentResponse(
  state: ReturnType<typeof createConsentState>,
  metadata?: {
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
