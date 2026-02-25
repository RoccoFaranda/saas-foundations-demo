// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentState, serializeConsentStateForCookie } from "./state";
import { linkIdentityWithRetry } from "./link-identity";

const AUDIT_QUEUE_STORAGE_KEY = "sf-consent-audit-queue:v1";

function setConsentCookie() {
  const state = createConsentState({
    source: "preferences_save",
    categories: {
      functional: true,
      analytics: false,
      marketing: false,
    },
  });

  document.cookie = `sf_consent=${serializeConsentStateForCookie(state)}; path=/`;
}

describe("linkIdentityWithRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();

    // Prevent queue flush from attempting real network requests.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    setConsentCookie();
  });

  it("returns ok on first successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
      })
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/consent/link",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("treats 429 as terminal and does not queue replay", async () => {
    const retryAt = Date.now() + 60_000;
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many requests", retryAt }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({
      ok: false,
      reason: "rate_limited",
      retryAt,
      error: "Too many requests",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it("queues replay for retryable non-429 failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 503,
      })
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "queued_for_replay" });
    const queueRaw = window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY);
    expect(queueRaw).not.toBeNull();

    const queue = JSON.parse(String(queueRaw)) as Array<{ kind: string }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]?.kind).toBe("identity_link");
  });

  it("does not queue replay for non-retryable failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 400,
      })
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it("queues replay for network errors", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "queued_for_replay" });
    const queueRaw = window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY);
    expect(queueRaw).not.toBeNull();
  });
});
