import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "./config";
import { consentAuditSourceSchema, consentCategoriesSchema } from "./schema";

const CONSENT_AUDIT_REPLAY_TOKEN_VERSION = "consent_audit_replay.v1" as const;
const CONSENT_AUDIT_REPLAY_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function getReplaySigningSecret(): string {
  const secret = process.env.CONSENT_AUDIT_SIGNING_SECRET;
  if (!secret) {
    throw new Error("CONSENT_AUDIT_SIGNING_SECRET environment variable is not set");
  }
  return secret;
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function signPayload(payload: string): string {
  return toBase64Url(createHmac("sha256", getReplaySigningSecret()).update(payload).digest());
}

function hasValidSignature(payload: string, signature: string): boolean {
  const givenSignature = fromBase64Url(signature);
  if (!givenSignature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getReplaySigningSecret()).update(payload).digest();
  if (givenSignature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(givenSignature, expectedSignature);
}

const consentAuditReplayClaimsSchema = z
  .object({
    v: z.literal(CONSENT_AUDIT_REPLAY_TOKEN_VERSION),
    eventId: z.string().min(1),
    occurredAt: z.iso.datetime(),
    consentId: z.string().min(1),
    version: z.string().min(1),
    source: consentAuditSourceSchema,
    gpcHonored: z.boolean(),
    categories: consentCategoriesSchema,
    userId: z.string().min(1).optional(),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .superRefine((value, ctx) => {
    const requiresUserId = value.source === CONSENT_EVENT_SOURCE_IDENTITY_LINK;
    if (requiresUserId && !value.userId) {
      ctx.addIssue({
        code: "custom",
        message: "identity_link replay claims require userId.",
      });
    }

    if (!requiresUserId && value.userId) {
      ctx.addIssue({
        code: "custom",
        message: "Non-identity_link replay claims must not include userId.",
      });
    }
  });

export type ConsentAuditReplayClaims = z.infer<typeof consentAuditReplayClaimsSchema>;

export interface CreateConsentAuditReplayTokenInput {
  eventId: string;
  occurredAt: string;
  consentId: string;
  version: string;
  source: ConsentAuditReplayClaims["source"];
  gpcHonored: boolean;
  categories: ConsentAuditReplayClaims["categories"];
  userId?: string;
}

export function createConsentAuditReplayToken(input: CreateConsentAuditReplayTokenInput): string {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const claims = consentAuditReplayClaimsSchema.parse({
    v: CONSENT_AUDIT_REPLAY_TOKEN_VERSION,
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    consentId: input.consentId,
    version: input.version,
    source: input.source,
    gpcHonored: input.gpcHonored,
    categories: input.categories,
    userId: input.userId,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + CONSENT_AUDIT_REPLAY_TOKEN_TTL_SECONDS,
  });

  const payload = JSON.stringify(claims);
  const encodedPayload = toBase64Url(payload);
  const signature = signPayload(payload);
  return `${encodedPayload}.${signature}`;
}

export type VerifyConsentAuditReplayTokenResult =
  | { ok: true; claims: ConsentAuditReplayClaims }
  | {
      ok: false;
      reason: "invalid_format" | "invalid_payload" | "invalid_signature" | "expired";
    };

export function verifyConsentAuditReplayToken(
  replayToken: string
): VerifyConsentAuditReplayTokenResult {
  const segments = replayToken.split(".");
  if (segments.length !== 2) {
    return { ok: false, reason: "invalid_format" };
  }

  const [encodedPayload, signature] = segments;
  const payloadBuffer = fromBase64Url(encodedPayload);
  if (!payloadBuffer) {
    return { ok: false, reason: "invalid_format" };
  }

  const payload = payloadBuffer.toString("utf8");
  if (!hasValidSignature(payload, signature)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  const claims = consentAuditReplayClaimsSchema.safeParse(parsed);
  if (!claims.success) {
    return { ok: false, reason: "invalid_payload" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.data.exp <= nowSeconds) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, claims: claims.data };
}
