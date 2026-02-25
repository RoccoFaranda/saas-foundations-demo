// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentState, serializeConsentStateForCookie } from "@/src/lib/consent/state";

const createConsentEventMock = vi.hoisted(() => vi.fn());
const findLatestConsentEventMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());

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

import { POST } from "./route";

describe("api/consent/link route", () => {
  beforeEach(() => {
    createConsentEventMock.mockReset();
    findLatestConsentEventMock.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    createConsentEventMock.mockResolvedValue({ id: "consent-event-1" });
    findLatestConsentEventMock.mockResolvedValue(null);
  });

  it("persists identity_link when authenticated and consent cookie exists", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: false,
        marketing: false,
      },
    });

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: { Cookie: `sf_consent=${serializeConsentStateForCookie(state)}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(true);
    expect(body.reason).toBe("linked");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns unauthenticated without persisting when user session is missing", async () => {
    authMock.mockResolvedValue(null);

    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: false,
        analytics: false,
        marketing: false,
      },
    });

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: { Cookie: `sf_consent=${serializeConsentStateForCookie(state)}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(false);
    expect(body.reason).toBe("unauthenticated");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns missing_consent_state without persisting when consent cookie is absent", async () => {
    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(false);
    expect(body.reason).toBe("missing_consent_state");
    expect(createConsentEventMock).not.toHaveBeenCalled();
    expect(findLatestConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns missing_consent_state when consent cookie version is stale", async () => {
    const staleState = {
      ...createConsentState({
        source: "preferences_save",
        categories: {
          functional: false,
          analytics: false,
          marketing: false,
        },
      }),
      version: "2020.01.01",
    };

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: {
          Cookie: `sf_consent=${encodeURIComponent(JSON.stringify(staleState))}`,
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(false);
    expect(body.reason).toBe("missing_consent_state");
    expect(createConsentEventMock).not.toHaveBeenCalled();
    expect(findLatestConsentEventMock).not.toHaveBeenCalled();
  });

  it("returns already_represented_by_latest_event when latest consent event matches current user/signature", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: true,
        marketing: false,
      },
    });
    findLatestConsentEventMock.mockResolvedValue({
      userId: "user-1",
      version: state.version,
      gpcHonored: state.gpcHonored,
      functional: state.categories.functional,
      analytics: state.categories.analytics,
      marketing: state.categories.marketing,
    });

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: { Cookie: `sf_consent=${serializeConsentStateForCookie(state)}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(false);
    expect(body.reason).toBe("already_represented_by_latest_event");
    expect(createConsentEventMock).not.toHaveBeenCalled();
  });

  it("inserts a new identity link when latest signature differs", async () => {
    findLatestConsentEventMock.mockResolvedValue({
      userId: "user-1",
      version: "2026.02.23",
      gpcHonored: false,
      functional: false,
      analytics: false,
      marketing: false,
    });

    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: true,
        marketing: false,
      },
    });

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: { Cookie: `sf_consent=${serializeConsentStateForCookie(state)}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(true);
    expect(body.reason).toBe("linked");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });

  it("inserts a new identity link when latest event signature matches but belongs to another user", async () => {
    const state = createConsentState({
      source: "preferences_save",
      categories: {
        functional: true,
        analytics: true,
        marketing: false,
      },
    });
    findLatestConsentEventMock.mockResolvedValue({
      userId: "user-2",
      version: state.version,
      gpcHonored: state.gpcHonored,
      functional: state.categories.functional,
      analytics: state.categories.analytics,
      marketing: state.categories.marketing,
    });

    const response = await POST(
      new Request("https://example.com/api/consent/link", {
        method: "POST",
        headers: { Cookie: `sf_consent=${serializeConsentStateForCookie(state)}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.linked).toBe(true);
    expect(body.reason).toBe("linked");
    expect(createConsentEventMock).toHaveBeenCalledTimes(1);
  });
});
