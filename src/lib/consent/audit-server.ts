import "server-only";
import prisma from "@/src/lib/db";
import type { ConsentCategories, ConsentSource } from "./types";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "./config";

const CONSENT_AUDIT_RETRY_DELAYS_MS = [100, 300, 700] as const;

let warnedMissingConsentTable = false;

export type ConsentAuditSource = ConsentSource | typeof CONSENT_EVENT_SOURCE_IDENTITY_LINK;

interface ConsentEventSignature {
  version: string;
  gpcHonored: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface PersistConsentAuditEventInput {
  eventId: string;
  occurredAt: string;
  consentId: string;
  userId: string | null;
  version: string;
  source: ConsentAuditSource;
  gpcHonored: boolean;
  categories: ConsentCategories;
}

export type PersistConsentAuditEventReason =
  | "persisted"
  | "duplicate_event"
  | "duplicate_state"
  | "retry_later"
  | "consent_events_table_missing";

export interface PersistConsentAuditEventResult {
  auditAccepted: boolean;
  persisted: boolean;
  reason: PersistConsentAuditEventReason;
  eventId: string;
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

function isDuplicateAuditEventError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string;
    message?: string;
    meta?: {
      target?: string[] | string;
      driverAdapterError?: {
        cause?: {
          originalCode?: string;
          originalMessage?: string;
          constraint?: {
            fields?: unknown;
          };
        };
      };
    };
  };

  if (maybeError.code !== "P2002") {
    return false;
  }

  const target = maybeError.meta?.target;
  if (Array.isArray(target) ? target.includes("id") : target === "id") {
    return true;
  }

  if (
    typeof maybeError.message === "string" &&
    /unique constraint failed on the fields:\s*\(`id`\)/i.test(maybeError.message)
  ) {
    return true;
  }

  const driverCause = maybeError.meta?.driverAdapterError?.cause;
  if (!driverCause || driverCause.originalCode !== "23505") {
    return false;
  }

  if (
    typeof driverCause.originalMessage === "string" &&
    driverCause.originalMessage.includes("cookie_consent_events_pkey")
  ) {
    return true;
  }

  return (
    Array.isArray(driverCause.constraint?.fields) && driverCause.constraint.fields.includes("id")
  );
}

function isRetryableAuditError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string;
    message?: string;
  };

  const retryablePrismaCodes = new Set(["P1001", "P1002", "P1008", "P1017", "P2024", "P2028"]);
  if (maybeError.code && retryablePrismaCodes.has(maybeError.code)) {
    return true;
  }

  if (typeof maybeError.message === "string") {
    const lowered = maybeError.message.toLowerCase();
    return (
      lowered.includes("timed out") ||
      lowered.includes("timeout") ||
      lowered.includes("econnreset") ||
      lowered.includes("connection terminated") ||
      lowered.includes("connection refused") ||
      lowered.includes("could not connect")
    );
  }

  return false;
}

function normalizeOccurredAt(input: string): Date {
  const epochMs = Date.parse(input);
  if (Number.isNaN(epochMs)) {
    return new Date();
  }
  return new Date(epochMs);
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function persistConsentAuditEventWithRetry(
  input: PersistConsentAuditEventInput
): Promise<PersistConsentAuditEventResult> {
  const signature: ConsentEventSignature = {
    version: input.version,
    gpcHonored: input.gpcHonored,
    functional: input.categories.functional,
    analytics: input.categories.analytics,
    marketing: input.categories.marketing,
  };

  const maxAttempts = CONSENT_AUDIT_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const latestEvent = await prisma.cookieConsentEvent.findFirst({
        where: {
          consentId: input.consentId,
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

      if (latestEvent?.userId === input.userId && hasSameSignature(latestEvent, signature)) {
        return {
          auditAccepted: true,
          persisted: false,
          reason: "duplicate_state",
          eventId: input.eventId,
        };
      }

      await prisma.cookieConsentEvent.create({
        data: {
          id: input.eventId,
          consentId: input.consentId,
          userId: input.userId,
          version: input.version,
          source: input.source,
          gpcHonored: input.gpcHonored,
          functional: input.categories.functional,
          analytics: input.categories.analytics,
          marketing: input.categories.marketing,
          createdAt: normalizeOccurredAt(input.occurredAt),
        },
      });

      return {
        auditAccepted: true,
        persisted: true,
        reason: "persisted",
        eventId: input.eventId,
      };
    } catch (error) {
      if (isDuplicateAuditEventError(error)) {
        return {
          auditAccepted: true,
          persisted: false,
          reason: "duplicate_event",
          eventId: input.eventId,
        };
      }

      if (isMissingConsentEventsTableError(error)) {
        if (!warnedMissingConsentTable) {
          warnedMissingConsentTable = true;
          console.warn(
            "[consent] cookie_consent_events table not found; audit persistence will be retried when migrations are applied."
          );
        }
        return {
          auditAccepted: false,
          persisted: false,
          reason: "consent_events_table_missing",
          eventId: input.eventId,
        };
      }

      const isRetryable = isRetryableAuditError(error);
      const canRetry = isRetryable && attempt < maxAttempts;
      if (canRetry) {
        await sleep(CONSENT_AUDIT_RETRY_DELAYS_MS[attempt - 1]);
        continue;
      }

      console.error("[consent] Failed to persist consent audit event after retries:", {
        eventId: input.eventId,
        consentId: input.consentId,
        attempt,
        error,
      });
      return {
        auditAccepted: false,
        persisted: false,
        reason: "retry_later",
        eventId: input.eventId,
      };
    }
  }

  return {
    auditAccepted: false,
    persisted: false,
    reason: "retry_later",
    eventId: input.eventId,
  };
}
