import type { ReactNode } from "react";
import type { ActivityEntry, ItemStatus, ItemTag, SortField, SortDirection } from "./model";
import { KpiCard } from "./kpi-card";
import { ActivityFeed } from "./activity-feed";
import { TableSkeleton } from "./table-skeleton";
import { PageContainer } from "@/src/components/layout/page-container";

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * KPI values for the dashboard header
 */
export interface DashboardKpis {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  archived: number;
}

/**
 * Filter/sort state for the dashboard
 */
export interface DashboardFilterState {
  search: string;
  status: ItemStatus | "all";
  tag: ItemTag | "all";
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface DashboardShellProps {
  /** Test ID for the root element */
  testId?: string;
  /** Page title */
  title: string;
  /** Page subtitle */
  subtitle: string;
  /** Optional header content (e.g., GuestModeBanner) */
  headerContent?: ReactNode;
  /** KPI values */
  kpis: DashboardKpis;
  /** Whether to show loading state for KPIs */
  isLoadingKpis?: boolean;
  /** Filter controls component */
  filterControls: ReactNode;
  /** Optional actions shown in the table header row */
  tableActions?: ReactNode;
  /** Main table content (DashboardContent) */
  tableContent: ReactNode;
  /** Whether to show loading state for table */
  isLoadingTable?: boolean;
  /** Pagination controls component */
  paginationControls?: ReactNode;
  /** Activity entries for the feed */
  activities: ActivityEntry[];
  /** Quick actions panel content */
  quickActionsContent?: ReactNode;
  /** Optional analytics content (charts) */
  analyticsContent?: ReactNode;
  /** Optional classes for KPI section wrapper */
  kpiSectionClassName?: string;
  /** Optional classes for operational middle section wrapper */
  operationalPanelsClassName?: string;
  /** Optional classes for primary table surface */
  tableSurfaceClassName?: string;
  /** Optional classes for table actions wrapper */
  tableActionsWrapperClassName?: string;
  /** Optional classes for filter controls wrapper */
  filterControlsWrapperClassName?: string;
  /** Optional classes for analytics section wrapper */
  analyticsSectionClassName?: string;
  /** Optional root spacing override for embedded/story contexts */
  containerClassName?: string;
}

/**
 * Shared dashboard shell component.
 * Provides consistent layout and structure for both demo and app dashboard.
 * Data-source agnostic - all data/handlers passed via props.
 */
export function DashboardShell({
  testId = "dashboard-page",
  title,
  subtitle,
  headerContent,
  kpis,
  isLoadingKpis = false,
  filterControls,
  tableActions,
  tableContent,
  isLoadingTable = false,
  paginationControls,
  activities,
  quickActionsContent,
  analyticsContent,
  kpiSectionClassName,
  operationalPanelsClassName,
  tableSurfaceClassName,
  tableActionsWrapperClassName,
  filterControlsWrapperClassName,
  analyticsSectionClassName,
  containerClassName = "py-8",
}: DashboardShellProps) {
  return (
    <PageContainer className={containerClassName} data-testid={testId}>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {headerContent}
      </div>

      {/* KPI Cards */}
      <div
        className={joinClasses(
          "mb-8 grid gap-4 transition-all sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
          kpiSectionClassName
        )}
      >
        <KpiCard
          label="Total Projects"
          value={isLoadingKpis ? "-" : kpis.total}
          subtitle="Excludes archived"
        />
        <KpiCard label="Active" value={isLoadingKpis ? "-" : kpis.active} subtitle="In progress" />
        <KpiCard
          label="Completed"
          value={isLoadingKpis ? "-" : kpis.completed}
          subtitle="Finished"
        />
        <KpiCard
          label="Avg Progress"
          value={isLoadingKpis ? "-" : `${kpis.avgProgress}%`}
          subtitle="Across non-archived"
        />
        <KpiCard
          label="Archived"
          value={isLoadingKpis ? "-" : kpis.archived}
          subtitle="Hidden from main list"
        />
      </div>

      {/* Main Content Grid */}
      <div className={joinClasses("grid gap-6 lg:grid-cols-3", operationalPanelsClassName)}>
        {/* Primary Panel - Table */}
        <div className="lg:col-span-2">
          <div className={joinClasses("surface-card transition-all", tableSurfaceClassName)}>
            {/* Header with filters */}
            <div className="border-b border-border px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-medium">Projects</h2>
                {tableActions && <div className={tableActionsWrapperClassName}>{tableActions}</div>}
              </div>
              <div className={filterControlsWrapperClassName}>{filterControls}</div>
            </div>

            {/* Table content */}
            <div className="p-4">{isLoadingTable ? <TableSkeleton rows={5} /> : tableContent}</div>

            {/* Pagination */}
            {!isLoadingTable && paginationControls}
          </div>
        </div>

        {/* Side Panel - Activity & Quick Actions */}
        <div className="space-y-6">
          <ActivityFeed activities={activities} />

          {/* Quick Actions Panel */}
          {quickActionsContent && (
            <div className="surface-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-medium">Quick Actions</h2>
              </div>
              <div className="space-y-2 p-4">{quickActionsContent}</div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      {analyticsContent && (
        <div className={joinClasses("mt-6 transition-all", analyticsSectionClassName)}>
          <div className="surface-card p-6">
            <h2 className="mb-4 font-medium">Analytics</h2>
            {analyticsContent}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
