import { describe, expect, it } from "vitest";
import type { DashboardItem } from "@/src/components/dashboard/model";
import { buildDashboardMetrics, buildInMemoryDashboardViewModel } from "../view-model";

describe("dashboard view-model", () => {
  describe("buildDashboardMetrics", () => {
    it("derives kpis, status distribution, and trend with sensible defaults", () => {
      const items = [
        createItem("1", { name: "Dashboard Analytics", status: "active" }),
        createItem("2", {
          name: "API Documentation",
          status: "completed",
          completedAt: "2026-01-10T00:00:00Z",
        }),
        createItem("3", { name: "Email Notifications", status: "pending" }),
        createItem("4", {
          name: "Legacy Migration",
          status: "completed",
          archivedAt: "2026-02-01T00:00:00Z",
          completedAt: "2026-02-05T00:00:00Z",
        }),
      ];

      const metrics = buildDashboardMetrics({ kpiItems: items });

      expect(metrics.kpis).toEqual({
        total: 3,
        active: 1,
        completed: 1,
        avgProgress: 50,
        archived: 1,
      });
      expect(metrics.statusDistribution).toEqual([
        { status: "active", count: 1, percentage: 33 },
        { status: "pending", count: 1, percentage: 33 },
        { status: "completed", count: 1, percentage: 33 },
      ]);
      expect(metrics.completionTrend).toEqual([
        { label: "Jan 2026", value: 1 },
        { label: "Feb 2026", value: 1 },
      ]);
    });

    it("honors status and trend source overrides", () => {
      const kpiItems = [
        createItem("1", { status: "active" }),
        createItem("2", { status: "completed", completedAt: "2026-01-10T00:00:00Z" }),
      ];
      const statusItems = [
        createItem("3", { status: "pending" }),
        createItem("4", { status: "pending" }),
      ];
      const trendItems = [
        createItem("5", { status: "completed", completedAt: "2026-03-12T00:00:00Z" }),
      ];

      const metrics = buildDashboardMetrics({
        kpiItems,
        statusItems,
        trendItems,
      });

      expect(metrics.kpis.total).toBe(2);
      expect(metrics.statusDistribution).toEqual([
        { status: "active", count: 0, percentage: 0 },
        { status: "pending", count: 2, percentage: 100 },
        { status: "completed", count: 0, percentage: 0 },
      ]);
      expect(metrics.completionTrend).toEqual([{ label: "Mar 2026", value: 1 }]);
    });
  });

  describe("buildInMemoryDashboardViewModel", () => {
    it("returns query results and metrics in one payload", () => {
      const items = [
        createItem("1", { name: "Dashboard Analytics", status: "active" }),
        createItem("2", { name: "Dashboard Ops", status: "pending" }),
        createItem("3", { name: "API Docs", status: "completed" }),
        createItem("4", { name: "Dashboard Archive", archivedAt: "2026-01-30T00:00:00Z" }),
      ];

      const viewModel = buildInMemoryDashboardViewModel({
        items,
        query: {
          filters: {
            search: "dash",
            status: "all",
            tag: "all",
            showArchived: false,
          },
          sort: {
            field: "name",
            direction: "asc",
          },
          page: 2,
          pageSize: 1,
        },
      });

      expect(viewModel.filteredItems.map((item) => item.id)).toEqual(["1", "2"]);
      expect(viewModel.totalPages).toBe(2);
      expect(viewModel.safePage).toBe(2);
      expect(viewModel.paginatedItems.map((item) => item.id)).toEqual(["2"]);
      expect(viewModel.kpis.archived).toBe(1);
      expect(viewModel.statusDistribution).toEqual([
        { status: "active", count: 1, percentage: 33 },
        { status: "pending", count: 1, percentage: 33 },
        { status: "completed", count: 1, percentage: 33 },
      ]);
    });
  });
});

function createItem(id: string, overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    id,
    name: `Project ${id}`,
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-31T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    summary: "Summary",
    checklist: [
      { id: `check-${id}-1`, text: "Task 1", done: true },
      { id: `check-${id}-2`, text: "Task 2", done: false },
    ],
    archivedAt: null,
    completedAt: null,
    ...overrides,
  };
}
