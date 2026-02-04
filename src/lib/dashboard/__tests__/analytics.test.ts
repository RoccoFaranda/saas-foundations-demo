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
        createItem("7", "completed"),
      ];

      const result = computeStatusDistribution(items);

      expect(result).toEqual([
        { status: "active", count: 2, percentage: 29 }, // 2/7 = 28.57 -> 29
        { status: "pending", count: 1, percentage: 14 }, // 1/7 = 14.28 -> 14
        { status: "completed", count: 4, percentage: 57 }, // 4/7 = 57.14 -> 57
      ]);
    });

    it("handles single-status items correctly", () => {
      const items: DashboardItem[] = [createItem("1", "active"), createItem("2", "active")];

      const result = computeStatusDistribution(items);

      expect(result).toEqual([
        { status: "active", count: 2, percentage: 100 },
        { status: "pending", count: 0, percentage: 0 },
        { status: "completed", count: 0, percentage: 0 },
      ]);
    });
  });

  describe("computeCompletionTrend", () => {
    it("returns empty array for empty items", () => {
      const result = computeCompletionTrend([]);
      expect(result).toEqual([]);
    });

    it("groups items by completedAt month and counts them", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", "2024-01-15T10:00:00Z"),
        createItemWithCompletedAt("2", "2024-01-25T14:30:00Z"),
        createItemWithCompletedAt("3", "2024-02-10T09:15:00Z"),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([
        { label: "Jan 2024", value: 2 }, // 2 completed in Jan
        { label: "Feb 2024", value: 1 }, // 1 completed in Feb
      ]);
    });

    it("ignores items without completedAt (null)", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", "2024-01-15T10:00:00Z"),
        createItemWithCompletedAt("2", null), // Active or pending, no completedAt
        createItemWithCompletedAt("3", "2024-01-20T12:00:00Z"),
        createItemWithCompletedAt("4", null),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([
        { label: "Jan 2024", value: 2 }, // Only 2 with completedAt
      ]);
    });

    it("sorts months chronologically", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", "2024-03-15T10:00:00Z"),
        createItemWithCompletedAt("2", "2024-01-15T10:00:00Z"),
        createItemWithCompletedAt("3", "2024-02-15T10:00:00Z"),
      ];

      const result = computeCompletionTrend(items);

      expect(result.map((r) => r.label)).toEqual(["Jan 2024", "Feb 2024", "Mar 2024"]);
    });

    it("handles items all completed in same month", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", "2024-05-01T08:00:00Z"),
        createItemWithCompletedAt("2", "2024-05-15T12:00:00Z"),
        createItemWithCompletedAt("3", "2024-05-30T16:00:00Z"),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([{ label: "May 2024", value: 3 }]);
    });

    it("returns empty array when all items have null completedAt", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", null),
        createItemWithCompletedAt("2", null),
        createItemWithCompletedAt("3", null),
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([]);
    });

    it("uses UTC timezone for month grouping", () => {
      const items: DashboardItem[] = [
        createItemWithCompletedAt("1", "2024-01-31T23:00:00Z"), // Jan 31 UTC
        createItemWithCompletedAt("2", "2024-02-01T01:00:00Z"), // Feb 1 UTC
      ];

      const result = computeCompletionTrend(items);

      expect(result).toEqual([
        { label: "Jan 2024", value: 1 },
        { label: "Feb 2024", value: 1 },
      ]);
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
function createItem(id: string, status: "active" | "pending" | "completed"): DashboardItem {
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

function createItemWithCompletedAt(id: string, completedAt: string | null): DashboardItem {
  return {
    id,
    name: `Item ${id}`,
    status: completedAt ? "completed" : "active",
    tag: null,
    summary: "",
    checklist: [],
    updatedAt: new Date().toISOString(),
    completedAt,
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
