import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";
import { auth } from "@/src/lib/auth/config";
import { CONSENT_COOKIE_NAME, CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { normalizeConsentState, parseConsentStateFromCookieValue } from "@/src/lib/consent/state";

let warnedMissingConsentTable = false;

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
      modelName?: string;
      table?: string;
    };
  };
  const missingRelationByModelCode =
    maybeError.code === "P2021" &&
    (maybeError.meta?.table === "cookie_consent_events" ||
      maybeError.meta?.modelName === "CookieConsentEvent");
  const missingRelationByCode = maybeError.code === "P2010" && maybeError.meta?.code === "42P01";
  const missingRelationByMessage =
    (maybeError.code === "P2010" || maybeError.code === "P2021") &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("cookie_consent_events");

  return missingRelationByModelCode || missingRelationByCode || missingRelationByMessage;
}

interface ConsentLinkSignature {
  version: string;
  gpcHonored: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
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
    const latestEvent = await prisma.cookieConsentEvent.findFirst({
      where: {
        consentId: state.consentId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        userId: true,
        version: true,
        gpcHonored: true,
        functional: true,
        analytics: true,
        marketing: true,
      },
    });

    if (latestEvent?.userId === userId && hasSameSignature(latestEvent, currentSignature)) {
      return NextResponse.json({
        linked: false,
        reason: "already_represented_by_latest_event",
      });
    }

    await prisma.cookieConsentEvent.create({
      data: {
        consentId: state.consentId,
        userId,
        version: state.version,
        source: CONSENT_EVENT_SOURCE_IDENTITY_LINK,
        gpcHonored: state.gpcHonored,
        functional: state.categories.functional,
        analytics: state.categories.analytics,
        marketing: state.categories.marketing,
      },
    });

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
