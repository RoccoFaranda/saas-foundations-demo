"use client";

import type { TrendDataPoint } from "@/src/lib/dashboard/analytics";

interface TrendChartProps {
  data: TrendDataPoint[];
  title: string;
  isEmpty?: boolean;
}

/**
 * Simple line/area chart for trend visualization.
 * Shows data points connected by lines.
 */
export function TrendChart({ data, title, isEmpty = false }: TrendChartProps) {
  if (isEmpty || data.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground/80">{title}</h3>
        <div className="flex h-48 items-center justify-center text-sm text-foreground/40">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 160;

  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - (point.value / maxValue) * 100;
    return { x, y, value: point.value, label: point.label };
  });

  const singlePoint = points[0];
  const isSinglePoint = points.length === 1;

  // Create SVG paths
  const linePath =
    isSinglePoint && singlePoint
      ? `M 20 ${singlePoint.y} L 80 ${singlePoint.y}`
      : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const areaPath =
    isSinglePoint && singlePoint
      ? `M 20 100 L 20 ${singlePoint.y} L 80 ${singlePoint.y} L 80 100 Z`
      : `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground/80">{title}</h3>

      {/* Chart area */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* Area fill */}
          <path d={areaPath} fill="currentColor" className="text-emerald-500/20" />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-emerald-500"
          />
        </svg>

        {/* Data points */}
        {points.map((point, index) => (
          <div
            key={index}
            className="group absolute"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
              {point.label}: {point.value}
            </div>
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-foreground/50">
        {data.map((point, index) => {
          // Show first, last, and middle labels if enough data
          const showLabel =
            index === 0 ||
            index === data.length - 1 ||
            (data.length > 4 && index === Math.floor(data.length / 2));

          return showLabel ? (
            <span key={index} className="flex-1 text-center">
              {point.label}
            </span>
          ) : (
            <span key={index} className="flex-1" />
          );
        })}
      </div>
    </div>
  );
}
