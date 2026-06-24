// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

type ProxyRequest = {
  nextUrl: URL;
  auth?: {
    user?: {
      id?: string;
      emailVerified?: Date | null;
    };
  } | null;
};

type ProxyHandler = (request: ProxyRequest) => Response;

vi.mock("@/src/lib/auth/config", () => ({
  auth: (handler: ProxyHandler) => handler,
}));

describe("proxy security headers", () => {
  it("adds anti-framing headers to protected-route auth redirects", async () => {
    const { default: proxy } = (await import("./proxy")) as unknown as { default: ProxyHandler };

    const response = proxy({
      nextUrl: new URL("https://www.saasfoundationsdemo.com/app/dashboard"),
      auth: null,
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("adds anti-framing headers to protected-route pass-through responses", async () => {
    const { default: proxy } = (await import("./proxy")) as unknown as { default: ProxyHandler };

    const response = proxy({
      nextUrl: new URL("https://www.saasfoundationsdemo.com/app/dashboard"),
      auth: {
        user: {
          id: "user-1",
          emailVerified: new Date("2026-06-24T00:00:00.000Z"),
        },
      },
    });

    expect(response.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
