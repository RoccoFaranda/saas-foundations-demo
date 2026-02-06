import Link from "next/link";
import { requireVerifiedUser } from "@/src/lib/auth";
import { listItems, countItems } from "@/src/lib/items";
import { listActivityLogs } from "@/src/lib/activity-log";
import { mapDbItemsToUi, mapDbActivityLogsToUi } from "@/src/lib/dashboard/mappers";
import {
  parseDashboardSearchParams,
  computeDashboardKpis,
  DASHBOARD_PAGE_SIZE,
} from "@/src/lib/dashboard/queries";
import { computeStatusDistribution, computeCompletionTrend } from "@/src/lib/dashboard/analytics";
import { ItemStatus, ItemTag } from "@/src/generated/prisma/enums";
import {
  DashboardShell,
  computeProgress,
  StatusDistributionChart,
  TrendChart,
} from "@/src/components/dashboard";
import type { SortField, SortDirection } from "@/src/components/dashboard/model";
import {
  CreateProjectModalProvider,
  DashboardCreateProjectButton,
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
  const [totalCount, userItemCount, allItemsForKpis, allItemsForTrend, dbActivityLogs] =
    await Promise.all([
      // Total count for pagination (same filters)
      countItems(userId, {
        status: filterOptions.status,
        tag: filterOptions.tag,
        search: filterOptions.search,
        includeArchived: filterOptions.includeArchived,
      }),
      // Any items for this user (regardless of current filters)
      countItems(userId, { includeArchived: true }),
      // All items (no filters) for KPIs - exclude archived for accurate metrics
      listItems(userId, { includeArchived: false }),
      // All items (including archived) for historical completion trend
      listItems(userId, { includeArchived: true }),
      // Recent activity logs
      listActivityLogs(userId, { limit: 20 }),
    ]);
  const hasAnyItems = userItemCount > 0;

  // Clamp page to valid range to avoid empty out-of-range pages
  const totalPages = Math.max(1, Math.ceil(totalCount / DASHBOARD_PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const offset = (currentPage - 1) * DASHBOARD_PAGE_SIZE;

  // Fetch table items (supports progress and archived-date sort in-memory)
  const dbItems =
    params.sortBy === "progress" || params.sortBy === "archivedAt"
      ? (() => {
          return listItems(userId, filterOptions).then((filteredItems) => {
            const sorted = [...filteredItems].sort((a, b) => {
              if (params.sortBy === "progress") {
                const comparison =
                  computeProgress(a.checklistItems) - computeProgress(b.checklistItems);
                return params.sortDir === "desc" ? -comparison : comparison;
              }

              const aArchivedTime = a.archivedAt ? new Date(a.archivedAt).getTime() : null;
              const bArchivedTime = b.archivedAt ? new Date(b.archivedAt).getTime() : null;

              if (aArchivedTime === null && bArchivedTime === null) {
                return 0;
              }
              if (aArchivedTime === null) {
                return 1;
              }
              if (bArchivedTime === null) {
                return -1;
              }

              const comparison = aArchivedTime - bArchivedTime;
              return params.sortDir === "desc" ? -comparison : comparison;
            });
            return sorted.slice(offset, offset + DASHBOARD_PAGE_SIZE);
          });
        })()
      : listItems(userId, {
          ...filterOptions,
          sortBy: params.sortBy,
          sortDirection: params.sortDir,
          limit: DASHBOARD_PAGE_SIZE,
          offset,
        });
  const resolvedDbItems = await dbItems;

  // Map DB models to UI models
  const items = mapDbItemsToUi(resolvedDbItems);
  const allItems = mapDbItemsToUi(allItemsForKpis);
  const allItemsIncludingArchived = mapDbItemsToUi(allItemsForTrend);
  const activities = mapDbActivityLogsToUi(dbActivityLogs);

  // Compute KPIs from all user items (unfiltered)
  const archivedCount = Math.max(0, userItemCount - allItems.length);
  const kpis = computeDashboardKpis(allItems, archivedCount);

  // Determine current sort for UI
  const sortField: SortField = params.sortBy;
  const sortDirection: SortDirection = params.sortDir;

  // Filter controls component
  const filterControls = (
    <DashboardFilters
      search={params.search}
      status={params.status}
      tag={params.tag}
      sortField={sortField}
      sortDirection={sortDirection}
      showArchived={params.showArchived}
      hasArchivedItems={archivedCount > 0}
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

  // Analytics data
  const statusDistribution = computeStatusDistribution(allItems);
  const completionTrend = computeCompletionTrend(allItemsIncludingArchived);

  // Analytics content
  const analyticsContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground/80">Status Distribution</h3>
        <p className="mb-4 text-xs text-foreground/50">Excludes archived projects</p>
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

  return (
    <CreateProjectModalProvider>
      <DashboardShell
        testId="dashboard-page"
        title="Dashboard"
        subtitle="Welcome back! Here's an overview of your projects."
        kpis={kpis}
        filterControls={filterControls}
        tableActions={<DashboardCreateProjectButton hasItems={hasAnyItems} />}
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
    <Link
      href={href}
      className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "border-foreground/20 bg-foreground/10 text-foreground"
          : "border-foreground/10 bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
      }`}
    >
      {label}
    </Link>
  );
}
