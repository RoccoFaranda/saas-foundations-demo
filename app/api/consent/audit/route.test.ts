// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { createConsentAuditReplayToken } from "@/src/lib/consent/replay-token";
import { createConsentState, serializeConsentStateForCookie } from "@/src/lib/consent/state";

const createConsentEventMock = vi.hoisted(() => vi.fn());
const findLatestConsentEventMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getRequestIpFromHeadersMock = vi.hoisted(() => vi.fn());
const getRetryAfterSecondsMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/db", () => ({
  default: {
    cookieConsentEvent: {
      create: createConsentEventMock,
      findFirst: findLatestConsentEventMock,
    },
  },
}));

vi.mock("@/src/lib/auth/config", () => ({
  auth: authMock,
}));

vi.mock("@/src/lib/auth/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRequestIpFromHeaders: getRequestIpFromHeadersMock,
  getRetryAfterSeconds: getRetryAfterSecondsMock,
}));

import { POST } from "./route";

function createReplayState(consentId = "consent-1") {
  return createConsentState({
    source: "preferences_save",
    categories: {
      functional: true,
      analytics: false,
      marketing: false,
    },
    consentId,
  });
}

function buildReplayToken(input: {
  state: ReturnType<typeof createReplayState>;
  source?: "preferences_save" | "identity_link";
  userId?: string;
}) {
  const source =
    input.source === "identity_link" ? CONSENT_EVENT_SOURCE_IDENTITY_LINK : "preferences_save";

  return createConsentAuditReplayToken({
    eventId: `audit-event-${source}-1`,
    occurredAt: input.state.updatedAt,
    consentId: input.state.consentId,
    version: input.state.version,
    source,
    gpcHonored: input.state.gpcHonored,
    categories: input.state.categories,
    userId: source === CONSENT_EVENT_SOURCE_IDENTITY_LINK ? input.userId : undefined,
  });
}

function tamperReplayTokenSignature(replayToken: string): string {
  const [payloadSegment, signatureSegment] = replayToken.split(".");
  if (!payloadSegment || !signatureSegment) {
    return replayToken;
  }

  const signatureBytes = Buffer.from(signatureSegment, "base64url");
  if (signatureBytes.length === 0) {
    return replayToken;
  }

  signatureBytes[0] ^= 0x01;
  return `${payloadSegment}.${signatureBytes.toString("base64url")}`;
}

describe("api/consent/audit route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    process.env.CONSENT_AUDIT_SIGNING_SECRET = "test-consent-signing-secret";

    createConsentEventMock.mockReset();
    findLatestConsentEventMock.mockReset();
    authMock.mockReset();
    enforceRateLimitMock.mockReset();
    getRequestIpFromHeadersMock.mockReset();
    getRetryAfterSecondsMock.mockReset();

    authMock.mockResolvedValue(null);
    createConsentEventMock.mockResolvedValue({ id: "consent-event-1" });
    findLatestConsentEventMock.mockResolvedValue(null);
    enforceRateLimitMock.mockResolvedValue(null);
    getRequestIpFromHeadersMock.mockReturnValue("203.0.113.10");
    getRetryAfterSecondsMock.mockReturnValue("60");
  });

  it("persists consent audit replay when provided a valid signed token", async () => {
    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({ state });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.auditAccepted).toBe(true);
    expect(body.persisted).toBe(true);
    expect(body.reason).toBe("persisted");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });

  it("rejects tampered replay tokens", async () => {
    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({ state });
    const tamperedReplayToken = tamperReplayTokenSignature(replayToken);

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken: tamperedReplayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("invalid_replay_signature");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("rejects expired replay tokens", async () => {
    const state = createReplayState("consent-1");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T12:00:00.000Z"));

    const replayToken = buildReplayToken({ state });

    vi.setSystemTime(new Date("2026-03-05T12:00:01.000Z"));

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("replay_token_expired");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("rejects replay when consent context does not match the current cookie", async () => {
    const tokenState = createReplayState("consent-from-token");
    const cookieState = createReplayState("consent-from-cookie");
    const replayToken = buildReplayToken({ state: tokenState });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(cookieState)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("consent_context_mismatch");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns 401 for identity_link replay without authenticated user", async () => {
    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({
      state,
      source: "identity_link",
      userId: "user-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("unauthenticated_for_identity_link");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("rejects identity_link replay when token user does not match session user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2" } });

    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({
      state,
      source: "identity_link",
      userId: "user-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("identity_link_user_mismatch");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns 429 when consent replay is rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });

    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({ state });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body).toEqual(
      expect.objectContaining({
        auditAccepted: false,
        persisted: false,
        reason: "rate_limited",
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns 503 when replay persistence fails after retries", async () => {
    createConsentEventMock.mockRejectedValue(new Error("database unavailable"));

    const state = createReplayState("consent-1");
    const replayToken = buildReplayToken({ state });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${serializeConsentStateForCookie(state)}`,
        },
        body: JSON.stringify({ replayToken }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.auditAccepted).toBe(false);
    expect(body.persisted).toBe(false);
    expect(body.reason).toBe("retry_later");
  });
});
