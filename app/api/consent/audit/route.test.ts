// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "@/src/lib/consent/config";
import { createConsentState } from "@/src/lib/consent/state";

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

describe("api/consent/audit route", () => {
  beforeEach(() => {
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

  it("persists consent audit replay payload for non-identity sources", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
      consentId: "consent-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "audit-event-1",
          occurredAt: state.updatedAt,
          consentId: state.consentId,
          version: state.version,
          source: state.source,
          gpcHonored: state.gpcHonored,
          categories: state.categories,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.auditAccepted).toBe(true);
    expect(body.persisted).toBe(true);
    expect(body.reason).toBe("persisted");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 for identity_link replay without authenticated user", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
      consentId: "consent-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "audit-event-identity-1",
          occurredAt: state.updatedAt,
          consentId: state.consentId,
          version: state.version,
          source: CONSENT_EVENT_SOURCE_IDENTITY_LINK,
          gpcHonored: state.gpcHonored,
          categories: state.categories,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.auditAccepted).toBe(false);
    expect(body.reason).toBe("unauthenticated_for_identity_link");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns 429 when consent replay is rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });

    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
      consentId: "consent-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "audit-event-rate-limited",
          occurredAt: state.updatedAt,
          consentId: state.consentId,
          version: state.version,
          source: state.source,
          gpcHonored: state.gpcHonored,
          categories: state.categories,
        }),
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
        auditEventId: "audit-event-rate-limited",
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns 503 when replay persistence fails after retries", async () => {
    createConsentEventMock.mockRejectedValue(new Error("database unavailable"));

    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
      consentId: "consent-1",
    });

    const response = await POST(
      new Request("https://example.com/api/consent/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "audit-event-failing-1",
          occurredAt: state.updatedAt,
          consentId: state.consentId,
          version: state.version,
          source: state.source,
          gpcHonored: state.gpcHonored,
          categories: state.categories,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.auditAccepted).toBe(false);
    expect(body.persisted).toBe(false);
    expect(body.reason).toBe("retry_later");
  });
});
