/**
 * Analytics computation helpers for dashboard visualizations.
 * Works with DashboardItem array to derive chart-ready data.
 */

import type { DashboardItem } from "@/src/components/dashboard/model";

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Status distribution for pie/bar charts.
 */
export interface StatusDistribution {
  status: "active" | "pending" | "completed";
  count: number;
  percentage: number;
}

/**
 * Trend data point for progress or throughput over time.
 */
export interface TrendDataPoint {
  label: string; // e.g., "Week 1", "Jan 2024"
  value: number;
}

/**
 * Compute status distribution from items.
 */
export function computeStatusDistribution(items: DashboardItem[]): StatusDistribution[] {
  if (items.length === 0) {
    return [
      { status: "active", count: 0, percentage: 0 },
      { status: "pending", count: 0, percentage: 0 },
      { status: "completed", count: 0, percentage: 0 },
    ];
  }

  const counts = {
    active: 0,
    pending: 0,
    completed: 0,
  };

  for (const item of items) {
    counts[item.status]++;
  }

  const total = items.length;

  return [
    {
      status: "active",
      count: counts.active,
      percentage: Math.round((counts.active / total) * 100),
    },
    {
      status: "pending",
      count: counts.pending,
      percentage: Math.round((counts.pending / total) * 100),
    },
    {
      status: "completed",
      count: counts.completed,
      percentage: Math.round((counts.completed / total) * 100),
    },
  ];
}

/**
 * Compute completion trend over time.
 * Groups items by month based on completedAt and counts completed items.
 * Only includes items that have a completedAt timestamp (ignores items with null completedAt).
 */
export function computeCompletionTrend(items: DashboardItem[]): TrendDataPoint[] {
  if (items.length === 0) {
    return [];
  }

  // Group items by completion month (only items with completedAt)
  const monthGroups = new Map<string, number>();

  for (const item of items) {
    // Skip items without completedAt
    if (!item.completedAt) {
      continue;
    }

    const date = new Date(item.completedAt);
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    monthGroups.set(monthKey, (monthGroups.get(monthKey) || 0) + 1);
  }

  // Sort by month and format
  const sortedMonths = Array.from(monthGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return sortedMonths.map(([monthKey, count]) => {
    const [year, month] = monthKey.split("-");
    const monthName = monthYearFormatter.format(
      new Date(Date.UTC(Number(year), Number(month) - 1, 1))
    );

    return {
      label: monthName,
      value: count,
    };
  });
}

/**
 * Compute average progress distribution buckets.
 * Useful for showing how many projects are in different progress ranges.
 */
export function computeProgressDistribution(
  items: DashboardItem[]
): Array<{ range: string; count: number }> {
  if (items.length === 0) {
    return [
      { range: "0-25%", count: 0 },
      { range: "26-50%", count: 0 },
      { range: "51-75%", count: 0 },
      { range: "76-100%", count: 0 },
    ];
  }

  const buckets = {
    "0-25%": 0,
    "26-50%": 0,
    "51-75%": 0,
    "76-100%": 0,
  };

  for (const item of items) {
    const progress = computeProgress(item.checklist);

    if (progress <= 25) {
      buckets["0-25%"]++;
    } else if (progress <= 50) {
      buckets["26-50%"]++;
    } else if (progress <= 75) {
      buckets["51-75%"]++;
    } else {
      buckets["76-100%"]++;
    }
  }

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

/**
 * Helper to compute progress percentage from checklist.
 */
function computeProgress(checklist: Array<{ done: boolean }>): number {
  if (checklist.length === 0) return 0;
  const doneCount = checklist.filter((item) => item.done).length;
  return Math.round((doneCount / checklist.length) * 100);
}
