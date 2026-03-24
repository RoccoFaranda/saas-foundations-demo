// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkAppUrlHealth, checkDatabaseHealth, getHealthReport } from "../health";

describe("checkDatabaseHealth", () => {
  it("returns ok when the probe succeeds", async () => {
    const result = await checkDatabaseHealth(async () => {});

    expect(result.status).toBe("ok");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.message).toBeUndefined();
  });

  it("returns error when the probe fails", async () => {
    const result = await checkDatabaseHealth(async () => {
      throw new Error("db down");
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "error",
        message: "Database check failed.",
      })
    );
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("checkAppUrlHealth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok in non-production when NEXT_PUBLIC_APP_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(checkAppUrlHealth()).toEqual({ status: "ok" });
  });

  it("returns error in production when NEXT_PUBLIC_APP_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(checkAppUrlHealth()).toEqual({
      status: "error",
      message: "NEXT_PUBLIC_APP_URL is required for production deployments.",
    });
  });

  it("returns error when NEXT_PUBLIC_APP_URL is invalid", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "ftp://example.com");

    expect(checkAppUrlHealth()).toEqual({
      status: "error",
      message: "NEXT_PUBLIC_APP_URL must be an absolute http(s) URL.",
    });
  });

  it("returns ok in preview when VERCEL_URL is available", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "preview-demo.vercel.app");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(checkAppUrlHealth()).toEqual({ status: "ok" });
  });

  it("returns ok in generic production-mode builds when no Vercel deployment env is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(checkAppUrlHealth()).toEqual({ status: "ok" });
  });
});

describe("getHealthReport", () => {
  it("returns ok when all checks pass", async () => {
    const report = await getHealthReport({
      checkDatabase: async () => ({ status: "ok", latencyMs: 3 }),
      checkAppUrl: () => ({ status: "ok" }),
      now: () => new Date("2026-02-18T00:00:00.000Z"),
    });

    expect(report).toEqual({
      status: "ok",
      timestamp: "2026-02-18T00:00:00.000Z",
      checks: {
        database: { status: "ok", latencyMs: 3 },
        appUrl: { status: "ok" },
      },
    });
  });

  it("returns degraded when any check fails", async () => {
    const report = await getHealthReport({
      checkDatabase: async () => ({
        status: "error",
        message: "Database check failed.",
      }),
      checkAppUrl: () => ({ status: "ok" }),
      now: () => new Date("2026-02-18T00:00:00.000Z"),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.database.status).toBe("error");
  });
});
