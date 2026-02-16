import type { DashboardItem } from "@/src/components/dashboard/model";
import {
  computeInMemoryDashboardKpis,
  queryDashboardItems,
  type InMemoryDashboardKpis,
  type InMemoryDashboardQueryInput,
  type InMemoryDashboardQueryResult,
} from "./query-core";
import {
  computeCompletionTrend,
  computeStatusDistribution,
  type StatusDistribution,
  type TrendDataPoint,
} from "./analytics";

export interface DashboardMetricsInput {
  /**
   * Source used for KPI computation.
   * `computeInMemoryDashboardKpis` excludes archived items from workload totals automatically.
   */
  kpiItems: DashboardItem[];
  /**
   * Optional source for status distribution.
   * Defaults to non-archived items from `kpiItems`.
   */
  statusItems?: DashboardItem[];
  /**
   * Optional source for trend computation.
   * Defaults to `kpiItems`.
   */
  trendItems?: DashboardItem[];
}

export interface DashboardMetrics {
  kpis: InMemoryDashboardKpis;
  statusDistribution: StatusDistribution[];
  completionTrend: TrendDataPoint[];
}

export interface InMemoryDashboardViewModelInput {
  items: DashboardItem[];
  query: InMemoryDashboardQueryInput;
  /**
   * Optional override for metric sources.
   * If omitted, metrics are derived from `items`.
   */
  metrics?: Partial<DashboardMetricsInput>;
}

export interface InMemoryDashboardViewModel
  extends InMemoryDashboardQueryResult, DashboardMetrics {}

function getDefaultStatusItems(items: DashboardItem[]): DashboardItem[] {
  return items.filter((item) => !item.archivedAt);
}

export function buildDashboardMetrics({
  kpiItems,
  statusItems,
  trendItems,
}: DashboardMetricsInput): DashboardMetrics {
  const statusSource = statusItems ?? getDefaultStatusItems(kpiItems);
  const trendSource = trendItems ?? kpiItems;

  return {
    kpis: computeInMemoryDashboardKpis(kpiItems),
    statusDistribution: computeStatusDistribution(statusSource),
    completionTrend: computeCompletionTrend(trendSource),
  };
}

export function buildInMemoryDashboardViewModel({
  items,
  query,
  metrics,
}: InMemoryDashboardViewModelInput): InMemoryDashboardViewModel {
  const queryResult = queryDashboardItems(items, query);
  const metricResult = buildDashboardMetrics({
    kpiItems: metrics?.kpiItems ?? items,
    statusItems: metrics?.statusItems,
    trendItems: metrics?.trendItems,
  });

  return {
    ...queryResult,
    ...metricResult,
  };
}
