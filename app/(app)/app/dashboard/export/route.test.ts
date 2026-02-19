// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const listItemsMock = vi.hoisted(() => vi.fn());
const parseDashboardSearchParamsMock = vi.hoisted(() => vi.fn());
const buildProjectsCsvMock = vi.hoisted(() => vi.fn());
const computeChecklistProgressMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getRetryAfterSecondsMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/src/lib/items", () => ({
  listItems: listItemsMock,
}));

vi.mock("@/src/lib/dashboard/queries", () => ({
  parseDashboardSearchParams: parseDashboardSearchParamsMock,
}));

vi.mock("@/src/lib/dashboard/csv", () => ({
  buildProjectsCsv: buildProjectsCsvMock,
  computeChecklistProgress: computeChecklistProgressMock,
}));

vi.mock("@/src/lib/auth/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRetryAfterSeconds: getRetryAfterSecondsMock,
}));

import { GET } from "./route";

describe("GET /app/dashboard/export", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    listItemsMock.mockReset();
    parseDashboardSearchParamsMock.mockReset();
    buildProjectsCsvMock.mockReset();
    computeChecklistProgressMock.mockReset();
    enforceRateLimitMock.mockReset();
    getRetryAfterSecondsMock.mockReset();

    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date(),
    });
    enforceRateLimitMock.mockResolvedValue(null);
    parseDashboardSearchParamsMock.mockReturnValue({
      status: "all",
      tag: "all",
      search: "",
      showArchived: false,
      sortBy: "updatedAt",
      sortDir: "desc",
    });
    listItemsMock.mockResolvedValue([
      {
        id: "item-1",
        name: "Project 1",
        status: "active",
        tag: "feature",
        summary: "Summary",
        checklistItems: [{ done: true }, { done: false }],
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
        completedAt: null,
        archivedAt: null,
      },
    ]);
    computeChecklistProgressMock.mockReturnValue(50);
    buildProjectsCsvMock.mockReturnValue("name,status\nProject 1,active");
    getRetryAfterSecondsMock.mockReturnValue("60");
  });

  it("returns CSV when authenticated and under limit", async () => {
    const response = await GET(new Request("https://example.com/app/dashboard/export"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(body).toContain("Project 1");
    expect(enforceRateLimitMock).toHaveBeenCalledWith("dashboardExport", ["user:user-1"]);
    expect(listItemsMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 before export work when rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });

    const response = await GET(new Request("https://example.com/app/dashboard/export"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body).toEqual(
      expect.objectContaining({
        error: "Too many requests. Try again in 1 minute.",
      })
    );
    expect(listItemsMock).not.toHaveBeenCalled();
  });
});
