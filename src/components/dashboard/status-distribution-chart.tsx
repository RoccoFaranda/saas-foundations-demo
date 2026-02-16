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
    active: "bg-info",
    pending: "bg-warning",
    completed: "bg-success",
  };

  const statusLabels = {
    active: "Active",
    pending: "Pending",
    completed: "Completed",
  };

  if (isEmpty) {
    return <div className="state-empty h-48">No data available</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.status} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{statusLabels[item.status]}</span>
            <span className="text-muted-foreground">
              {item.count} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${statusColors[item.status]}`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
