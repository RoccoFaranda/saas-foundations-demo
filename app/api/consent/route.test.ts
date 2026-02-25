// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentState } from "@/src/lib/consent/state";

const originalDemoAnalyticsFlag = vi.hoisted(() => process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS);

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS = "false";
});

const executeRawMock = vi.hoisted(() => vi.fn());
const queryRawMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/db", () => ({
  default: {
    $executeRaw: executeRawMock,
    $queryRaw: queryRawMock,
  },
}));

vi.mock("@/src/lib/auth/config", () => ({
  auth: authMock,
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
    executeRawMock.mockReset();
    queryRawMock.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    executeRawMock.mockResolvedValue(1);
    queryRawMock.mockResolvedValue([]);
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
    expect(response.headers.get("set-cookie")).toContain("sf_consent=");
    expect(executeRawMock).toHaveBeenCalledTimes(1);
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

    queryRawMock.mockResolvedValue([
      {
        userId: "user-1",
        version: state.version,
        gpcHonored: state.gpcHonored,
        functional: state.categories.functional,
        analytics: state.categories.analytics,
        marketing: state.categories.marketing,
      },
    ]);

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
    expect(body.persisted).toBe(false);
    expect(body.reason).toBe("already_represented_by_latest_event");
    expect(executeRawMock).not.toHaveBeenCalled();
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
