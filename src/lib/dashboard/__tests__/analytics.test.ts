import { describe, it, expect } from "vitest";
import {
  computeStatusDistribution,
  computeCompletionTrend,
  computeProgressDistribution,
} from "../analytics";
import type { DashboardItem } from "@/src/components/dashboard/model";

describe("analytics", () => {
  describe("computeStatusDistribution", () => {
    it("returns zero counts for empty array", () => {
      const result = computeStatusDistribution([]);

      expect(result).toEqual([
        { status: "active", count: 0, percentage: 0 },
        { status: "pending", count: 0, percentage: 0 },
        { status: "completed", count: 0, percentage: 0 },
        { status: "archived", count: 0, percentage: 0 },
      ]);
    });

    it("computes correct distribution for mixed items", () => {
      const items: DashboardItem[] = [
        createItem("1", "active"),
        createItem("2", "active"),
        createItem("3", "pending"),
        createItem("4", "completed"),
        createItem("5", "completed"),
        createItem("6", "completed"),
        createItem("7", "archived"),
      ];

      const result = computeStatusDistribution(items);

      expect(result).toEqual([
        { status: "active", count: 2, percentage: 29 }, // 2/7 = 28.57 -> 29
        { status: "pending", count: 1, percentage: 14 }, // 1/7 = 14.28 -> 14
        { status: "completed", count: 3, percentage: 43 }, // 3/7 = 42.85 -> 43
        { status: "archived", count: 1, percentage: 14 }, // 1/7 = 14.28 -> 14
      ]);
    });

    it("handles single-status items correctly", () => {
      const items: DashboardItem[] = [createItem("1", "active"), createItem("2", "active")];

      const result = computeStatusDistribution(items);

      expect(result).toEqual([
        { status: "active", count: 2, percentage: 100 },
        { status: "pending", count: 0, percentage: 0 },
        { status: "completed", count: 0, percentage: 0 },
        { status: "archived", count: 0, percentage: 0 },
      ]);
    });
  });

  describe("computeCompletionTrend", () => {
    it("returns empty array for empty items", () => {
      const result = computeCompletionTrend([]);
      expect(result).toEqual([]);
    });

    it("groups items by month and counts completed", () => {
      const items: DashboardItem[] = [
        createItemWithDate("1", "completed", "2024-01-15"),
        createItemWithDate("2", "active", "2024-01-20"),
        createItemWithDate("3", "completed", "2024-01-25"),
        createItemWithDate("4", "completed", "2024-02-10"),
        createItemWithDate("5", "pending", "2024-02-15"),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([
        { label: "Jan 2024", value: 2 }, // 2 completed in Jan
        { label: "Feb 2024", value: 1 }, // 1 completed in Feb
      ]);
    });

    it("sorts months chronologically", () => {
      const items: DashboardItem[] = [
        createItemWithDate("1", "completed", "2024-03-15"),
        createItemWithDate("2", "completed", "2024-01-15"),
        createItemWithDate("3", "completed", "2024-02-15"),
      ];

      const result = computeCompletionTrend(items);

      expect(result.map((r) => r.label)).toEqual(["Jan 2024", "Feb 2024", "Mar 2024"]);
    });

    it("handles items all in same month", () => {
      const items: DashboardItem[] = [
        createItemWithDate("1", "completed", "2024-05-01"),
        createItemWithDate("2", "active", "2024-05-15"),
        createItemWithDate("3", "completed", "2024-05-30"),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([{ label: "May 2024", value: 2 }]);
    });
  });

  describe("computeProgressDistribution", () => {
    it("returns zero counts for empty array", () => {
      const result = computeProgressDistribution([]);

      expect(result).toEqual([
        { range: "0-25%", count: 0 },
        { range: "26-50%", count: 0 },
        { range: "51-75%", count: 0 },
        { range: "76-100%", count: 0 },
      ]);
    });

    it("buckets items by progress percentage", () => {
      const items: DashboardItem[] = [
        createItemWithProgress("1", 0), // 0-25%
        createItemWithProgress("2", 10), // 0-25%
        createItemWithProgress("3", 30), // 26-50%
        createItemWithProgress("4", 40), // 26-50%
        createItemWithProgress("5", 50), // 26-50%
        createItemWithProgress("6", 60), // 51-75%
        createItemWithProgress("7", 80), // 76-100%
        createItemWithProgress("8", 90), // 76-100%
        createItemWithProgress("9", 100), // 76-100%
      ];

      const result = computeProgressDistribution(items);

      expect(result).toEqual([
        { range: "0-25%", count: 2 },
        { range: "26-50%", count: 3 },
        { range: "51-75%", count: 1 },
        { range: "76-100%", count: 3 },
      ]);
    });

    it("handles items with no checklist (0% progress)", () => {
      const items: DashboardItem[] = [
        createItemWithProgress("1", 0),
        createItemWithProgress("2", 0),
      ];

      const result = computeProgressDistribution(items);

      expect(result).toEqual([
        { range: "0-25%", count: 2 },
        { range: "26-50%", count: 0 },
        { range: "51-75%", count: 0 },
        { range: "76-100%", count: 0 },
      ]);
    });
  });
});

// Test helpers
function createItem(
  id: string,
  status: "active" | "pending" | "completed" | "archived"
): DashboardItem {
  return {
    id,
    name: `Item ${id}`,
    status,
    tag: null,
    summary: "",
    checklist: [],
    updatedAt: new Date().toISOString(),
  };
}

function createItemWithDate(
  id: string,
  status: "active" | "pending" | "completed" | "archived",
  date: string
): DashboardItem {
  return {
    id,
    name: `Item ${id}`,
    status,
    tag: null,
    summary: "",
    checklist: [],
    updatedAt: new Date(date).toISOString(),
  };
}

function createItemWithProgress(id: string, progressPercentage: number): DashboardItem {
  // Create checklist that results in the target progress percentage
  const total = 10;
  const done = Math.round((progressPercentage / 100) * total);

  const checklist = Array.from({ length: total }, (_, i) => ({
    id: `check-${i}`,
    text: `Task ${i}`,
    done: i < done,
  }));

  return {
    id,
    name: `Item ${id}`,
    status: "active",
    tag: null,
    summary: "",
    checklist,
    updatedAt: new Date().toISOString(),
  };
}
