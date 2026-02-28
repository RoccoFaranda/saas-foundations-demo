// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getHealthReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/health", () => ({
  getHealthReport: getHealthReportMock,
}));

import { GET } from "./route";

describe("GET /api/ready", () => {
  beforeEach(() => {
    getHealthReportMock.mockReset();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 in production when READINESS_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_SECRET", "");

    const response = await GET(new NextRequest("https://example.com/api/ready"));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(json.error).toContain("not configured");
    expect(getHealthReportMock).not.toHaveBeenCalled();
  });

  it("returns 401 when bearer token is missing or invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_SECRET", "secret-token");

    const missingToken = await GET(new NextRequest("https://example.com/api/ready"));
    const invalidToken = await GET(
      new NextRequest("https://example.com/api/ready", {
        headers: { Authorization: "Bearer wrong-token" },
      })
    );

    expect(missingToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(getHealthReportMock).not.toHaveBeenCalled();
  });

  it("returns 200 for healthy report with valid token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_SECRET", "secret-token");

    const report = {
      status: "ok",
      timestamp: "2026-02-18T00:00:00.000Z",
      checks: {
        database: { status: "ok", latencyMs: 2 },
        appUrl: { status: "ok" },
      },
    };
    getHealthReportMock.mockResolvedValue(report);

    const response = await GET(
      new NextRequest("https://example.com/api/ready", {
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(json).toEqual(report);
  });

  it("returns 503 for degraded report with valid token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_SECRET", "secret-token");

    getHealthReportMock.mockResolvedValue({
      status: "degraded",
      timestamp: "2026-02-18T00:00:00.000Z",
      checks: {
        database: { status: "error", message: "Database check failed." },
        appUrl: { status: "ok" },
      },
    });

    const response = await GET(
      new NextRequest("https://example.com/api/ready", {
        headers: { Authorization: "Bearer secret-token" },
      })
    );

    expect(response.status).toBe(503);
  });
});
