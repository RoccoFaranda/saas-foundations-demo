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
import { DashboardFilters, DashboardMutations, DashboardPagination } from "./_components";

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

  // Filter controls component
  const filterControls = (
    <DashboardFilters
      search={params.search}
      status={params.status}
      tag={params.tag}
      sortField={sortField}
      sortDirection={sortDirection}
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
  const completionTrend = computeCompletionTrend(allItems);

  // Analytics content
  const analyticsContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground/80">Status Distribution</h3>
        <StatusDistributionChart data={statusDistribution} isEmpty={kpis.total === 0} />
      </div>
      <div>
        <TrendChart data={completionTrend} title="Completion Trend" isEmpty={kpis.total === 0} />
      </div>
    </div>
  );

  return (
    <DashboardShell
      testId="dashboard-page"
      title="Dashboard"
      subtitle="Welcome back! Here's an overview of your projects."
      kpis={kpis}
      filterControls={filterControls}
      tableContent={
        <DashboardMutations
          items={items}
          emptyMessage={
            kpis.total === 0
              ? "No projects yet."
              : "No projects match your filters. Try adjusting your search or filters."
          }
          hasItems={kpis.total > 0}
        />
      }
      paginationControls={paginationControls}
      activities={activities}
      quickActionsContent={quickActionsContent}
      analyticsContent={analyticsContent}
    />
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
