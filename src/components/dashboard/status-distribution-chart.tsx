"use client";

import type { StatusDistribution } from "@/src/lib/dashboard/analytics";

interface StatusDistributionChartProps {
  data: StatusDistribution[];
  isEmpty?: boolean;
}

/**
 * Status distribution visualization.
 * Shows count and percentage for each status as horizontal bars.
 */
export function StatusDistributionChart({ data, isEmpty = false }: StatusDistributionChartProps) {
  // Status colors matching the badge colors
  const statusColors = {
    active: "bg-blue-500",
    pending: "bg-yellow-500",
    completed: "bg-green-500",
    archived: "bg-gray-500",
  };

  const statusLabels = {
    active: "Active",
    pending: "Pending",
    completed: "Completed",
    archived: "Archived",
  };

  if (isEmpty) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-foreground/40">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.status} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground/80">{statusLabels[item.status]}</span>
            <span className="text-foreground/60">
              {item.count} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
            <div
              className={`h-full rounded-full transition-all ${statusColors[item.status]}`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
