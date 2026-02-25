// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentState } from "@/src/lib/consent/state";

const originalDemoAnalyticsFlag = vi.hoisted(() => process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS);

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS = "false";
});

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

import { GET, POST } from "./route";

describe("api/consent route", () => {
  afterAll(() => {
    if (originalDemoAnalyticsFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS;
      return;
    }
    process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS = originalDemoAnalyticsFlag;
  });

  beforeEach(() => {
    createConsentEventMock.mockReset();
    findLatestConsentEventMock.mockReset();
    authMock.mockReset();
    enforceRateLimitMock.mockReset();
    getRequestIpFromHeadersMock.mockReset();
    getRetryAfterSecondsMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    createConsentEventMock.mockResolvedValue({ id: "consent-event-1" });
    findLatestConsentEventMock.mockResolvedValue(null);
    enforceRateLimitMock.mockResolvedValue(null);
    getRequestIpFromHeadersMock.mockReturnValue("203.0.113.10");
    getRetryAfterSecondsMock.mockReturnValue("60");
  });

  it("persists and sets cookie for a valid consent payload", async () => {
    const response = await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "preferences_save",
          categories: {
            functional: true,
            analytics: false,
            marketing: false,
          },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state.categories.necessary).toBe(true);
    expect(body.state.categories.functional).toBe(true);
    expect(body.state.source).toBe("preferences_save");
    expect(body.auditAccepted).toBe(true);
    expect(body.persisted).toBe(true);
    expect(body.reason).toBe("persisted");
    expect(typeof body.auditEventId).toBe("string");
    expect(response.headers.get("set-cookie")).toContain("sf_consent=");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });

  it("forces optional categories off when GPC signal is present", async () => {
    const response = await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-GPC": "1",
        },
        body: JSON.stringify({
          source: "banner_accept_all",
          categories: {
            functional: true,
            analytics: true,
            marketing: true,
          },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state.source).toBe("gpc");
    expect(body.state.gpcHonored).toBe(true);
    expect(body.state.categories.functional).toBe(false);
    expect(body.state.categories.analytics).toBe(false);
    expect(body.state.categories.marketing).toBe(false);
    expect(body.auditAccepted).toBe(true);
  });

  it("returns 429 when consent write is rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "preferences_save",
          categories: {
            functional: true,
            analytics: false,
            marketing: false,
          },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body).toEqual(
      expect.objectContaining({
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("no-ops persistence when latest event already matches current user and signature", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
      consentId: "consent-1",
    });
    const cookieValue = encodeURIComponent(JSON.stringify(state));

    findLatestConsentEventMock.mockResolvedValue({
      userId: "user-1",
      version: state.version,
      gpcHonored: state.gpcHonored,
      functional: state.categories.functional,
      analytics: state.categories.analytics,
      marketing: state.categories.marketing,
    });

    const response = await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_consent=${cookieValue}`,
        },
        body: JSON.stringify({
          source: "preferences_save",
          categories: {
            functional: true,
            analytics: false,
            marketing: false,
          },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.auditAccepted).toBe(true);
    expect(body.persisted).toBe(false);
    expect(body.reason).toBe("already_represented_by_latest_event");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("keeps cookie response successful but reports audit failure when DB insert fails", async () => {
    createConsentEventMock.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "preferences_save",
          categories: {
            functional: true,
            analytics: false,
            marketing: false,
          },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.auditAccepted).toBe(false);
    expect(body.persisted).toBe(false);
    expect(body.reason).toBe("retry_later");
    expect(response.headers.get("set-cookie")).toContain("sf_consent=");
  });

  it("uses caller-provided audit metadata when present", async () => {
    const eventId = "event-fixed-id";
    const occurredAt = "2026-02-24T10:00:00.000Z";

    await POST(
      new Request("https://example.com/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "preferences_save",
          categories: {
            functional: true,
            analytics: false,
            marketing: false,
          },
          eventId,
          occurredAt,
        }),
      })
    );

    expect(createConsentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: eventId,
          createdAt: new Date(occurredAt),
        }),
      })
    );
  });

  it("returns normalized state for valid cookie in GET", async () => {
    const state = createConsentState({
      source: "banner_reject_all",
      categories: {
        functional: false,
        analytics: false,
        marketing: false,
      },
    });
    const cookieValue = encodeURIComponent(JSON.stringify(state));

    const response = await GET(
      new Request("https://example.com/api/consent", {
        headers: { Cookie: `sf_consent=${cookieValue}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state).toEqual(state);
    expect(body.hasNonEssentialServices).toBe(false);
  });
});
