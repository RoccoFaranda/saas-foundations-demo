// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const handlersPostMock = vi.hoisted(() => vi.fn());
const handlersGetMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getRequestIpFromHeadersMock = vi.hoisted(() => vi.fn());
const getRetryAfterSecondsMock = vi.hoisted(() => vi.fn());
const toEmailIdentifierMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/config", () => ({
  handlers: {
    GET: handlersGetMock,
    POST: handlersPostMock,
  },
}));

vi.mock("@/src/lib/auth/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRequestIpFromHeaders: getRequestIpFromHeadersMock,
  getRetryAfterSeconds: getRetryAfterSecondsMock,
  toEmailIdentifier: toEmailIdentifierMock,
}));

import { POST } from "./route";

describe("POST /api/auth/[...nextauth]", () => {
  beforeEach(() => {
    handlersPostMock.mockReset();
    handlersGetMock.mockReset();
    enforceRateLimitMock.mockReset();
    getRequestIpFromHeadersMock.mockReset();
    getRetryAfterSecondsMock.mockReset();
    toEmailIdentifierMock.mockReset();

    handlersPostMock.mockResolvedValue(new Response("ok"));
    getRequestIpFromHeadersMock.mockReturnValue("203.0.113.10");
    getRetryAfterSecondsMock.mockReturnValue("60");
    toEmailIdentifierMock.mockImplementation((value: unknown) => {
      if (typeof value !== "string") {
        return "";
      }
      const normalized = value.trim().toLowerCase();
      return normalized ? `email:${normalized}` : "";
    });
    enforceRateLimitMock.mockResolvedValue(null);
  });

  it("passes through non-credentials POST requests", async () => {
    const request = new NextRequest("https://example.com/api/auth/signin/credentials", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(handlersPostMock).toHaveBeenCalledWith(request);
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
  });

  it("rate limits credentials callback requests using login bucket", async () => {
    const request = new NextRequest("https://example.com/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": "203.0.113.10",
      },
      body: "email=User%40Example.com&password=secret",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(1, "login", [
      "ip:203.0.113.10",
      "email:user@example.com",
    ]);
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(2, "loginSlow", ["ip:203.0.113.10"]);
    expect(handlersPostMock).toHaveBeenCalledWith(request);
  });

  it("returns 429 and skips handler when credentials callback hits login bucket limit", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });
    const request = new NextRequest("https://example.com/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": "203.0.113.10",
      },
      body: "email=user%40example.com&password=secret",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(json).toEqual(
      expect.objectContaining({
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(handlersPostMock).not.toHaveBeenCalled();
  });

  it("returns 429 and skips handler when credentials callback hits loginSlow bucket limit", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });
    const request = new NextRequest("https://example.com/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": "203.0.113.10",
      },
      body: "email=user%40example.com&password=secret",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(json).toEqual(
      expect.objectContaining({
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(1, "login", [
      "ip:203.0.113.10",
      "email:user@example.com",
    ]);
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(2, "loginSlow", ["ip:203.0.113.10"]);
    expect(handlersPostMock).not.toHaveBeenCalled();
  });
});
