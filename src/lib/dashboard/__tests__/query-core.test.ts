import { describe, expect, it } from "vitest";
import type { DashboardItem } from "@/src/components/dashboard/model";
import {
  computeInMemoryDashboardKpis,
  filterDashboardItems,
  paginateDashboardItems,
  queryDashboardItems,
  sortDashboardItems,
} from "../query-core";

describe("query-core", () => {
  describe("filterDashboardItems", () => {
    it("filters by search, status, tag, and archive visibility", () => {
      const items = [
        createItem("1", { name: "Dashboard Analytics", status: "active", tag: "feature" }),
        createItem("2", { name: "API Documentation", status: "pending", tag: "docs" }),
        createItem("3", {
          name: "Archived Dashboard",
          status: "completed",
          tag: "feature",
          archivedAt: "2026-01-02T00:00:00Z",
        }),
      ];

      const filtered = filterDashboardItems(items, {
        search: "dash",
        status: "active",
        tag: "feature",
        showArchived: false,
      });

      expect(filtered.map((item) => item.id)).toEqual(["1"]);
    });

    it("includes archived items when showArchived is true", () => {
      const items = [createItem("1"), createItem("2", { archivedAt: "2026-01-02T00:00:00Z" })];

      const filtered = filterDashboardItems(items, {
        search: "",
        status: "all",
        tag: "all",
        showArchived: true,
      });

      expect(filtered).toHaveLength(2);
    });
  });

  describe("sortDashboardItems", () => {
    it("sorts by progress", () => {
      const items = [
        createItem("1", { checklist: createChecklist(1, 4) }), // 25
        createItem("2", { checklist: createChecklist(3, 4) }), // 75
        createItem("3", { checklist: createChecklist(2, 4) }), // 50
      ];

      const sorted = sortDashboardItems(items, { field: "progress", direction: "asc" });

      expect(sorted.map((item) => item.id)).toEqual(["1", "3", "2"]);
    });

    it("keeps non-archived items at end for archivedAt sort", () => {
      const items = [
        createItem("1", { archivedAt: "2026-01-03T00:00:00Z" }),
        createItem("2"),
        createItem("3", { archivedAt: "2026-01-01T00:00:00Z" }),
      ];

      const asc = sortDashboardItems(items, { field: "archivedAt", direction: "asc" });
      const desc = sortDashboardItems(items, { field: "archivedAt", direction: "desc" });

      expect(asc.at(-1)?.id).toBe("2");
      expect(desc.at(-1)?.id).toBe("2");
    });

    it("sorts archivedAt descending while keeping nulls last", () => {
      const items = [
        createItem("1", { archivedAt: "2026-01-01T00:00:00Z" }),
        createItem("2"),
        createItem("3", { archivedAt: "2026-01-03T00:00:00Z" }),
      ];

      const sorted = sortDashboardItems(items, { field: "archivedAt", direction: "desc" });
      expect(sorted.map((item) => item.id)).toEqual(["3", "1", "2"]);
    });

    it("sorts progress descending for fallback parity", () => {
      const items = [
        createItem("1", { checklist: createChecklist(1, 4) }), // 25
        createItem("2", { checklist: createChecklist(4, 4) }), // 100
        createItem("3", { checklist: createChecklist(2, 4) }), // 50
      ];

      const sorted = sortDashboardItems(items, { field: "progress", direction: "desc" });
      expect(sorted.map((item) => item.id)).toEqual(["2", "3", "1"]);
    });
  });

  describe("paginateDashboardItems", () => {
    it("returns slice for requested page", () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      expect(paginateDashboardItems(items, 2, 3)).toEqual([4, 5, 6]);
    });
  });

  describe("queryDashboardItems", () => {
    it("clamps out-of-range page and returns paginated result", () => {
      const items = [
        createItem("1"),
        createItem("2"),
        createItem("3"),
        createItem("4"),
        createItem("5"),
        createItem("6"),
      ];

      const result = queryDashboardItems(items, {
        filters: {
          search: "",
          status: "all",
          tag: "all",
          showArchived: false,
        },
        sort: { field: "updatedAt", direction: "desc" },
        page: 9,
        pageSize: 5,
      });

      expect(result.totalPages).toBe(2);
      expect(result.safePage).toBe(2);
      expect(result.paginatedItems).toHaveLength(1);
    });
  });

  describe("computeInMemoryDashboardKpis", () => {
    it("computes KPIs from non-archived items and counts archived separately", () => {
      const items = [
        createItem("1", { status: "active", checklist: createChecklist(2, 4) }), // 50
        createItem("2", { status: "completed", checklist: createChecklist(4, 4) }), // 100
        createItem("3", { status: "pending", checklist: createChecklist(0, 4) }), // 0
        createItem("4", {
          status: "active",
          checklist: createChecklist(4, 4),
          archivedAt: "2026-01-03T00:00:00Z",
        }),
      ];

      const kpis = computeInMemoryDashboardKpis(items);

      expect(kpis).toEqual({
        total: 3,
        active: 1,
        completed: 1,
        avgProgress: 50,
        archived: 1,
      });
    });
  });
});

function createChecklist(doneCount: number, totalCount: number) {
  return Array.from({ length: totalCount }, (_, index) => ({
    id: `check-${index}`,
    text: `Task ${index + 1}`,
    done: index < doneCount,
  }));
}

function createItem(id: string, overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    id,
    name: `Project ${id}`,
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-01T00:00:00Z",
    createdAt: "2025-12-01T00:00:00Z",
    summary: "Summary",
    checklist: createChecklist(1, 2),
    archivedAt: null,
    completedAt: null,
    ...overrides,
  };
}
