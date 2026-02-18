// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHealthReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/health", () => ({
  getHealthReport: getHealthReportMock,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    getHealthReportMock.mockReset();
  });

  it("returns 200 when health is ok", async () => {
    const report = {
      status: "ok",
      timestamp: "2026-02-18T00:00:00.000Z",
      checks: {
        database: { status: "ok", latencyMs: 2 },
        appUrl: { status: "ok" },
      },
    };
    getHealthReportMock.mockResolvedValue(report);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(json).toEqual(report);
  });

  it("returns 503 when health is degraded", async () => {
    const report = {
      status: "degraded",
      timestamp: "2026-02-18T00:00:00.000Z",
      checks: {
        database: { status: "error", message: "Database check failed." },
        appUrl: { status: "ok" },
      },
    };
    getHealthReportMock.mockResolvedValue(report);

    const response = await GET();

    expect(response.status).toBe(503);
  });
});
