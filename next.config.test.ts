// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const originalVercel = process.env.VERCEL;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  vi.resetModules();

  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }

  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
});

describe("nextConfig security headers", () => {
  it("blocks the app from being framed on every route", async () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;

    const { default: nextConfig } = await import("./next.config");

    expect(nextConfig.headers).toBeTypeOf("function");

    const configuredHeaders = nextConfig.headers ? await nextConfig.headers() : [];

    expect(configuredHeaders).toEqual(
      expect.arrayContaining([
        {
          source: "/:path*",
          headers: expect.arrayContaining([
            {
              key: "Content-Security-Policy",
              value: "frame-ancestors 'none'",
            },
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
          ]),
        },
      ])
    );
  });
});
