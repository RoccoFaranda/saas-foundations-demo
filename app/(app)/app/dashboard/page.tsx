import { Suspense } from "react";
import { requireVerifiedUser } from "@/src/lib/auth";
import { listItems, countItems } from "@/src/lib/items";
import { listActivityLogs } from "@/src/lib/activity-log";
import { mapDbItemsToUi, mapDbActivityLogsToUi } from "@/src/lib/dashboard/mappers";
import {
  parseDashboardSearchParams,
  computeDashboardKpis,
  DASHBOARD_PAGE_SIZE,
} from "@/src/lib/dashboard/queries";
import { ItemStatus, ItemTag } from "@/src/generated/prisma/enums";
import { KpiCard, ItemsTable, ActivityFeed, TableSkeleton } from "@/src/components/dashboard";
import {
  computeProgress,
  type SortField,
  type SortDirection,
} from "@/src/components/dashboard/model";
import { DashboardFilters, DashboardPagination } from "./_components";

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
  };

  // Fetch global data in parallel - user scoped
  const [totalCount, allItemsForKpis, dbActivityLogs] = await Promise.all([
    // Total count for pagination (same filters)
    countItems(userId, {
      status: filterOptions.status,
      tag: filterOptions.tag,
      search: filterOptions.search,
    }),
    // All items (no filters) for KPIs
    listItems(userId),
    // Recent activity logs
    listActivityLogs(userId, { limit: 10 }),
  ]);

  // Clamp page to valid range to avoid empty out-of-range pages
  const totalPages = Math.max(1, Math.ceil(totalCount / DASHBOARD_PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const offset = (currentPage - 1) * DASHBOARD_PAGE_SIZE;

  // Fetch table items (supports progress sort in-memory)
  const dbItems =
    params.sortBy === "progress"
      ? (() => {
          return listItems(userId, filterOptions).then((filteredItems) => {
            const sorted = [...filteredItems].sort((a, b) => {
              const comparison =
                computeProgress(a.checklistItems) - computeProgress(b.checklistItems);
              return params.sortDir === "desc" ? -comparison : comparison;
            });
            return sorted.slice(offset, offset + DASHBOARD_PAGE_SIZE);
          });
        })()
      : listItems(userId, {
          ...filterOptions,
          sortBy: params.sortBy === "name" ? "name" : "updatedAt",
          sortDirection: params.sortDir,
          limit: DASHBOARD_PAGE_SIZE,
          offset,
        });
  const resolvedDbItems = await dbItems;

  // Map DB models to UI models
  const items = mapDbItemsToUi(resolvedDbItems);
  const allItems = mapDbItemsToUi(allItemsForKpis);
  const activities = mapDbActivityLogsToUi(dbActivityLogs);

  // Compute KPIs from all user items (unfiltered)
  const kpis = computeDashboardKpis(allItems);

  // Determine current sort for UI
  const sortField: SortField = params.sortBy;
  const sortDirection: SortDirection = params.sortDir;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" data-testid="dashboard-page">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Welcome back! Here&apos;s an overview of your projects.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Projects" value={kpis.total} subtitle="All projects" />
        <KpiCard label="Active" value={kpis.active} subtitle="In progress" />
        <KpiCard label="Completed" value={kpis.completed} subtitle="Finished" />
        <KpiCard
          label="Avg Progress"
          value={`${kpis.avgProgress}%`}
          subtitle="Across all projects"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Primary Panel - Table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-foreground/10 bg-background">
            {/* Header with filters */}
            <div className="flex flex-col gap-3 border-b border-foreground/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-medium">Projects</h2>
              <Suspense fallback={null}>
                <DashboardFilters
                  search={params.search}
                  status={params.status}
                  tag={params.tag}
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </Suspense>
            </div>

            {/* Table content */}
            <div className="p-4">
              <Suspense fallback={<TableSkeleton rows={DASHBOARD_PAGE_SIZE} />}>
                <ItemsTable
                  items={items}
                  emptyMessage={
                    kpis.total === 0
                      ? "No projects yet. Create your first project to get started!"
                      : "No projects match your filters. Try adjusting your search or filters."
                  }
                />
              </Suspense>
            </div>

            {/* Pagination */}
            <Suspense fallback={null}>
              <DashboardPagination
                currentPage={currentPage}
                totalItems={totalCount}
                pageSize={DASHBOARD_PAGE_SIZE}
              />
            </Suspense>
          </div>
        </div>

        {/* Side Panel - Activity */}
        <div className="space-y-6">
          <ActivityFeed activities={activities} />

          {/* Quick Actions Panel (placeholder) */}
          <div className="rounded-lg border border-foreground/10 bg-background">
            <div className="border-b border-foreground/10 px-4 py-3">
              <h2 className="font-medium">Quick Actions</h2>
            </div>
            <div className="space-y-2 p-4">
              <PlaceholderButton label="Create Project" />
              <PlaceholderButton label="Invite Team" />
              <PlaceholderButton label="View Reports" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2 text-left text-sm text-foreground/60 transition-colors hover:bg-foreground/10"
    >
      {label}
    </button>
  );
}
