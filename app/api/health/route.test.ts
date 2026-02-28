// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getRequestIpFromHeadersMock = vi.hoisted(() => vi.fn());
const getRetryAfterSecondsMock = vi.hoisted(() => vi.fn());
const toUserAgentIdentifierMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRequestIpFromHeaders: getRequestIpFromHeadersMock,
  getRetryAfterSeconds: getRetryAfterSecondsMock,
  toUserAgentIdentifier: toUserAgentIdentifierMock,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    enforceRateLimitMock.mockReset();
    getRequestIpFromHeadersMock.mockReset();
    getRetryAfterSecondsMock.mockReset();
    toUserAgentIdentifierMock.mockReset();

    enforceRateLimitMock.mockResolvedValue(null);
    getRequestIpFromHeadersMock.mockReturnValue("203.0.113.10");
    getRetryAfterSecondsMock.mockReturnValue("60");
    toUserAgentIdentifierMock.mockReturnValue("ua:hash");
  });

  it("returns 200 with no-store headers and liveness payload", async () => {
    const request = new NextRequest("https://example.com/api/health");

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(json.status).toBe("ok");
    expect(typeof json.timestamp).toBe("string");
    expect(enforceRateLimitMock).toHaveBeenCalledWith("healthLive", [
      "ip:203.0.113.10",
      "ua:hash",
      "route:healthLive",
    ]);
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });

    const request = new NextRequest("https://example.com/api/health");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(json).toEqual(
      expect.objectContaining({
        error: "Too many requests. Try again in 1 minute.",
      })
    );
  });
});
