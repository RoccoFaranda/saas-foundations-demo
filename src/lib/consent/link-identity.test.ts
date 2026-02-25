// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkIdentityWithRetry } from "./link-identity";

const AUDIT_QUEUE_STORAGE_KEY = "sf-consent-audit-queue:v2";

describe("linkIdentityWithRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();

    // Prevent queue flush from attempting real network requests.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
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

  it("queues replay for retryable failures when server returns replay token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          replayToken: "signed-replay-token",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "queued_for_replay" });
    const queueRaw = window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY);
    expect(queueRaw).not.toBeNull();

    const queue = JSON.parse(String(queueRaw)) as Array<{ kind: string; replayToken: string }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]?.kind).toBe("identity_link");
    expect(queue[0]?.replayToken).toBe("signed-replay-token");
  });

  it("does not queue replay for retryable failures when no replay token is returned", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 503,
      })
    );

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it("does not queue replay for network errors", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await linkIdentityWithRetry({ fetchImpl });

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY)).toBeNull();
  });
});
