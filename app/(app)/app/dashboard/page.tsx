import Link from "next/link";
import { requireVerifiedUser } from "@/src/lib/auth";
import { listItems, countItems } from "@/src/lib/items";
import { listActivityLogs } from "@/src/lib/activity-log";
import { mapDbItemsToUi, mapDbActivityLogsToUi } from "@/src/lib/dashboard/mappers";
import { parseDashboardSearchParams, DASHBOARD_PAGE_SIZE } from "@/src/lib/dashboard/queries";
import { ItemStatus, ItemTag } from "@/src/generated/prisma/enums";
import { DashboardShell, StatusDistributionChart, TrendChart } from "@/src/components/dashboard";
import type { SortField, SortDirection } from "@/src/components/dashboard/model";
import { sortDashboardItems } from "@/src/lib/dashboard/query-core";
import { buildDashboardMetrics } from "@/src/lib/dashboard/view-model";
import {
  CreateProjectModalProvider,
  DashboardCreateProjectButton,
  DashboardExportButton,
  DashboardFilters,
  DashboardMutations,
  DashboardPagination,
} from "./_components";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Get authenticated user
  const user = await requireVerifiedUser();
  const userId = user.id;

  // Parse and validate search params
  const rawParams = await searchParams;
  const params = parseDashboardSearchParams(rawParams);

  // Build base filter options
  const filterOptions = {
    status: params.status !== "all" ? (params.status as ItemStatus) : undefined,
    tag: params.tag !== "all" ? (params.tag as ItemTag) : undefined,
    search: params.search || undefined,
    includeArchived: params.showArchived,
  };

  // Fetch global data in parallel - user scoped
  const [totalCount, allItemsForMetrics, dbActivityLogs] = await Promise.all([
    // Total count for pagination (same filters)
    countItems(userId, {
      status: filterOptions.status,
      tag: filterOptions.tag,
      search: filterOptions.search,
      includeArchived: filterOptions.includeArchived,
    }),
    // All items (including archived) for shared metric derivation
    listItems(userId, { includeArchived: true }),
    // Recent activity logs
    listActivityLogs(userId, { limit: 20 }),
  ]);
  const hasAnyItems = allItemsForMetrics.length > 0;

  // Clamp page to valid range to avoid empty out-of-range pages
  const totalPages = Math.max(1, Math.ceil(totalCount / DASHBOARD_PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const offset = (currentPage - 1) * DASHBOARD_PAGE_SIZE;

  // Fetch table items (supports progress and archived-date sort in-memory)
  const tableItemsPromise =
    params.sortBy === "progress" || params.sortBy === "archivedAt"
      ? listItems(userId, filterOptions).then((filteredItems) => {
          const filteredUiItems = mapDbItemsToUi(filteredItems);
          const sortedUiItems = sortDashboardItems(filteredUiItems, {
            field: params.sortBy,
            direction: params.sortDir,
          });
          return sortedUiItems.slice(offset, offset + DASHBOARD_PAGE_SIZE);
        })
      : listItems(userId, {
          ...filterOptions,
          sortBy: params.sortBy,
          sortDirection: params.sortDir,
          limit: DASHBOARD_PAGE_SIZE,
          offset,
        }).then((dbItems) => mapDbItemsToUi(dbItems));
  const items = await tableItemsPromise;

  // Map DB models to UI models
  const allItemsIncludingArchived = mapDbItemsToUi(allItemsForMetrics);
  const activities = mapDbActivityLogsToUi(dbActivityLogs);

  // Shared KPI + analytics derivation used across dashboard surfaces
  const metrics = buildDashboardMetrics({
    kpiItems: allItemsIncludingArchived,
    trendItems: allItemsIncludingArchived,
  });
  const { kpis, statusDistribution, completionTrend } = metrics;

  // Determine current sort for UI
  const sortField: SortField = params.sortBy;
  const sortDirection: SortDirection = params.sortDir;
  const exportHref = buildDashboardExportHref(params);

  // Filter controls component
  const filterControls = (
    <DashboardFilters
      search={params.search}
      status={params.status}
      tag={params.tag}
      sortField={sortField}
      sortDirection={sortDirection}
      showArchived={params.showArchived}
      hasArchivedItems={kpis.archived > 0}
    />
  );

  // Pagination controls component
  const paginationControls = (
    <DashboardPagination
      currentPage={currentPage}
      totalItems={totalCount}
      pageSize={DASHBOARD_PAGE_SIZE}
    />
  );

  // Quick actions content
  const quickActionsContent = (
    <>
      <QuickActionLink href="/app/dashboard" label="View Dashboard" active />
      <QuickActionLink href="/app/settings" label="Account Settings" />
    </>
  );

  // Analytics content
  const analyticsContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground">Status Distribution</h3>
        <p className="mb-4 text-xs text-muted-foreground">Excludes archived projects</p>
        <StatusDistributionChart data={statusDistribution} isEmpty={kpis.total === 0} />
      </div>
      <div>
        <TrendChart
          data={completionTrend}
          title="Completion Trend (incl. archived)"
          isEmpty={completionTrend.length === 0}
        />
      </div>
    </div>
  );

  const tableActions = hasAnyItems ? (
    <div className="flex items-center gap-2">
      <DashboardExportButton
        exportHref={exportHref}
        rowCount={totalCount}
        disabled={totalCount === 0}
      />
      <DashboardCreateProjectButton hasItems={hasAnyItems} />
    </div>
  ) : null;

  return (
    <CreateProjectModalProvider>
      <DashboardShell
        testId="dashboard-page"
        title="Dashboard"
        subtitle="Welcome back! Here's an overview of your projects."
        kpis={kpis}
        filterControls={filterControls}
        tableActions={tableActions}
        tableContent={
          <DashboardMutations
            items={items}
            emptyMessage={
              hasAnyItems
                ? "No projects match your filters. Try adjusting your search or filters."
                : "No projects yet."
            }
            hasItems={hasAnyItems}
          />
        }
        paginationControls={paginationControls}
        activities={activities}
        quickActionsContent={quickActionsContent}
        analyticsContent={analyticsContent}
      />
    </CreateProjectModalProvider>
  );
}

function buildDashboardExportHref(params: ReturnType<typeof parseDashboardSearchParams>) {
  const exportParams = new URLSearchParams();

  if (params.search) exportParams.set("search", params.search);
  if (params.status !== "all") exportParams.set("status", params.status);
  if (params.tag !== "all") exportParams.set("tag", params.tag);
  if (params.sortBy !== "updatedAt") exportParams.set("sortBy", params.sortBy);
  if (params.sortDir !== "desc") exportParams.set("sortDir", params.sortDir);
  if (params.showArchived) exportParams.set("showArchived", "true");

  const queryString = exportParams.toString();
  return queryString ? `/app/dashboard/export?${queryString}` : "/app/dashboard/export";
}

function QuickActionLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`btn-panel ${active ? "btn-panel-active" : ""}`}>
      {label}
    </Link>
  );
}
