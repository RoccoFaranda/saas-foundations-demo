import { describe, it, expect } from "vitest";
import { parseDashboardSearchParams, computeDashboardKpis, DASHBOARD_PAGE_SIZE } from "../queries";
import type { DashboardItem } from "../../../components/dashboard/model";

describe("Dashboard queries", () => {
  describe("parseDashboardSearchParams", () => {
    it("should return defaults for empty params", () => {
      const result = parseDashboardSearchParams({});

      expect(result).toEqual({
        search: "",
        status: "all",
        tag: "all",
        sortBy: "updatedAt",
        sortDir: "desc",
        page: 1,
        showArchived: false,
      });
    });

    it("should parse valid search params", () => {
      const result = parseDashboardSearchParams({
        search: "test",
        status: "active",
        tag: "feature",
        sortBy: "name",
        sortDir: "asc",
        page: "3",
      });

      expect(result).toEqual({
        search: "test",
        status: "active",
        tag: "feature",
        sortBy: "name",
        sortDir: "asc",
        page: 3,
        showArchived: false,
      });
    });

    it("should normalize array values to first element", () => {
      const result = parseDashboardSearchParams({
        search: ["first", "second"],
        status: ["active", "completed"],
      });

      expect(result.search).toBe("first");
      expect(result.status).toBe("active");
    });

    it("should return defaults for invalid values", () => {
      const result = parseDashboardSearchParams({
        status: "invalid_status",
        tag: "invalid_tag",
        sortBy: "invalid_sort",
        page: "not_a_number",
      });

      expect(result).toEqual({
        search: "",
        status: "all",
        tag: "all",
        sortBy: "updatedAt",
        sortDir: "desc",
        page: 1,
        showArchived: false,
      });
    });

    it("should preserve valid params when one param is invalid", () => {
      const result = parseDashboardSearchParams({
        search: "auth",
        status: "invalid_status",
        sortDir: "asc",
        page: "2",
      });

      expect(result).toEqual({
        search: "auth",
        status: "all",
        tag: "all",
        sortBy: "updatedAt",
        sortDir: "asc",
        page: 2,
        showArchived: false,
      });
    });

    it("should clamp page to minimum of 1", () => {
      const result = parseDashboardSearchParams({
        page: "0",
      });

      expect(result.page).toBe(1);
    });

    it("should handle all valid status values", () => {
      const statuses = ["all", "active", "pending", "completed"];

      for (const status of statuses) {
        const result = parseDashboardSearchParams({ status });
        expect(result.status).toBe(status);
      }
    });

    it("should handle all valid tag values", () => {
      const tags = ["all", "feature", "bugfix", "docs", "infra", "design"];

      for (const tag of tags) {
        const result = parseDashboardSearchParams({ tag });
        expect(result.tag).toBe(tag);
      }
    });
  });

  describe("computeDashboardKpis", () => {
    it("should compute KPIs from items", () => {
      const items: DashboardItem[] = [
        createMockItem({ status: "active", checklist: [{ done: true }, { done: false }] }), // 50%
        createMockItem({ status: "active", checklist: [{ done: true }, { done: true }] }), // 100%
        createMockItem({ status: "completed", checklist: [{ done: true }] }), // 100%
        createMockItem({ status: "pending", checklist: [] }), // 0%
      ];

      const kpis = computeDashboardKpis(items);

      expect(kpis.total).toBe(4);
      expect(kpis.active).toBe(2);
      expect(kpis.completed).toBe(1);
      expect(kpis.avgProgress).toBe(63); // (50+100+100+0)/4 = 62.5 rounded to 63
    });

    it("should handle empty items array", () => {
      const kpis = computeDashboardKpis([]);

      expect(kpis.total).toBe(0);
      expect(kpis.active).toBe(0);
      expect(kpis.completed).toBe(0);
      expect(kpis.avgProgress).toBe(0);
    });

    it("should count pending items in total but not in active/completed", () => {
      const items: DashboardItem[] = [
        createMockItem({ status: "pending" }),
        createMockItem({ status: "active" }),
      ];

      const kpis = computeDashboardKpis(items);

      expect(kpis.total).toBe(2);
      expect(kpis.active).toBe(1);
      expect(kpis.completed).toBe(0);
    });
  });

  describe("DASHBOARD_PAGE_SIZE", () => {
    it("should be a reasonable page size", () => {
      expect(DASHBOARD_PAGE_SIZE).toBeGreaterThan(0);
      expect(DASHBOARD_PAGE_SIZE).toBeLessThanOrEqual(50);
    });
  });
});

// Helper to create mock DashboardItem
function createMockItem(overrides: {
  status?: DashboardItem["status"];
  checklist?: Array<{ done: boolean }>;
}): DashboardItem {
  const checklist = (overrides.checklist ?? []).map((c, i) => ({
    id: `check-${i}`,
    text: `Task ${i}`,
    done: c.done,
  }));

  return {
    id: `item-${Math.random()}`,
    name: "Test Item",
    status: overrides.status ?? "active",
    tag: "feature",
    updatedAt: new Date().toISOString(),
    summary: "Test summary",
    checklist,
  };
}
