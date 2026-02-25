import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";
import { auth } from "@/src/lib/auth/config";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { normalizeConsentState, parseConsentStateFromCookieValue } from "@/src/lib/consent/state";

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

interface ConsentLinkSignature {
  version: string;
  gpcHonored: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface LatestConsentEventSignature extends ConsentLinkSignature {
  userId: string | null;
}

function hasSameSignature(left: ConsentLinkSignature, right: ConsentLinkSignature): boolean {
  return (
    left.version === right.version &&
    left.gpcHonored === right.gpcHonored &&
    left.functional === right.functional &&
    left.analytics === right.analytics &&
    left.marketing === right.marketing
  );
}

export async function POST(request: Request) {
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

  const currentSignature: ConsentLinkSignature = {
    version: state.version,
    gpcHonored: state.gpcHonored,
    functional: state.categories.functional,
    analytics: state.categories.analytics,
    marketing: state.categories.marketing,
  };

  try {
    const latestRows = await prisma.$queryRaw<LatestConsentEventSignature[]>`
      SELECT "userId", "version", "gpcHonored", "functional", "analytics", "marketing"
      FROM "cookie_consent_events"
      WHERE "consentId" = ${state.consentId}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 1
    `;
    const latestEvent = latestRows[0] ?? null;

    if (latestEvent?.userId === userId && hasSameSignature(latestEvent, currentSignature)) {
      return NextResponse.json({
        linked: false,
        reason: "already_represented_by_latest_event",
      });
    }

    await prisma.$executeRaw`
      INSERT INTO "cookie_consent_events"
        ("id", "consentId", "userId", "version", "source", "gpcHonored", "functional", "analytics", "marketing", "createdAt")
      VALUES
        (${createEventId()}, ${state.consentId}, ${userId}, ${state.version}, ${CONSENT_EVENT_SOURCE_IDENTITY_LINK}, ${state.gpcHonored}, ${state.categories.functional}, ${state.categories.analytics}, ${state.categories.marketing}, ${new Date()})
    `;

    return NextResponse.json({
      linked: true,
      reason: "linked",
    });
  } catch (error) {
    if (isMissingConsentEventsTableError(error)) {
      if (!warnedMissingConsentTable) {
        warnedMissingConsentTable = true;
        console.warn(
          "[consent] cookie_consent_events table not found; skipping identity-link persistence until migrations are applied."
        );
      }
      return NextResponse.json({ linked: false, reason: "consent_events_table_missing" });
    }

    console.error("[consent] Failed to persist identity link event:", error);
    return NextResponse.json({ linked: false, reason: "link_failed" }, { status: 500 });
  }
}
