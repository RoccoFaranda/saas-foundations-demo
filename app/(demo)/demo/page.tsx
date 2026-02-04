"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  demoItems,
  getDemoKpis,
  filterItems,
  sortItems,
  paginateItems,
  cloneItems,
  describeChanges,
  type DemoItem,
  type DemoItemStatus,
  type DemoItemTag,
  type SortField,
  type SortDirection,
  type ActivityEntry,
} from "./demo-items";
import {
  DashboardShell,
  DashboardContent,
  GuestModeBanner,
  TableFilters,
  TablePagination,
  generateId,
  StatusDistributionChart,
  TrendChart,
} from "@/src/components/dashboard";
import type { DashboardMutationHandlers } from "@/src/components/dashboard";
import { computeStatusDistribution, computeCompletionTrend } from "@/src/lib/dashboard/analytics";

const PAGE_SIZE = 5;

export default function DemoPage() {
  // Loading state (simulated)
  const [isLoading, setIsLoading] = useState(true);

  // Local mutable data (resets on refresh)
  const [items, setItems] = useState<DemoItem[]>(() => cloneItems(demoItems));
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DemoItemStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<DemoItemTag | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Handlers that reset pagination when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: DemoItemStatus | "all") => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTagChange = useCallback((value: DemoItemTag | "all") => {
    setTagFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  }, []);

  const handleShowArchivedChange = useCallback(
    (value: boolean) => {
      setShowArchived(value);

      if (!value && sortField === "archivedAt") {
        setSortField("updatedAt");
        setSortDirection("desc");
      }

      setCurrentPage(1);
    },
    [sortField]
  );

  // Compute filtered & sorted data from local items
  const filteredItems = useMemo(() => {
    const filtered = filterItems(items, {
      search,
      status: statusFilter,
      tag: tagFilter,
      showArchived,
    });
    return sortItems(filtered, { field: sortField, direction: sortDirection });
  }, [items, search, statusFilter, tagFilter, showArchived, sortField, sortDirection]);

  // Non-archived items for workload KPIs and status analytics
  const nonArchivedItems = useMemo(() => items.filter((item) => !item.archivedAt), [items]);

  // KPIs computed from full local dataset
  const kpis = useMemo(() => getDemoKpis(items), [items]);

  // Clamp page to avoid out-of-range when filters change outside handlers
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Paginated items for display
  const paginatedItems = useMemo(
    () => paginateItems(filteredItems, safePage, PAGE_SIZE),
    [filteredItems, safePage]
  );

  // Add activity entry helper
  const addActivity = useCallback((message: string) => {
    const newActivity: ActivityEntry = {
      id: generateId("activity"),
      message,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev].slice(0, 20)); // Keep last 20
  }, []);

  // Mutation handlers for DashboardContent
  const mutationHandlers: DashboardMutationHandlers = useMemo(
    () => ({
      onCreate: (newItem) => {
        const itemWithId: DemoItem = {
          ...newItem,
          id: generateId("proj"),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        };
        setItems((prev) => [itemWithId, ...prev]);
        addActivity(`Created "${newItem.name}"`);
      },
      onUpdate: (updatedItem) => {
        const oldItem = items.find((i) => i.id === updatedItem.id);
        if (!oldItem) return;

        setItems((prev) =>
          prev.map((item) =>
            item.id === updatedItem.id
              ? { ...updatedItem, updatedAt: new Date().toISOString() }
              : item
          )
        );

        const changeDesc = describeChanges(oldItem, updatedItem);
        if (changeDesc) {
          addActivity(`Updated "${updatedItem.name}" (${changeDesc})`);
        }
      },
      onDelete: (item) => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        addActivity(`Deleted "${item.name}"`);
      },
      onArchive: (item) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : i
          )
        );
        addActivity(`Archived "${item.name}"`);
      },
      onUnarchive: (item) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, archivedAt: null, updatedAt: new Date().toISOString() } : i
          )
        );
        addActivity(`Unarchived "${item.name}"`);
      },
      onImportSampleData: () => {
        setItems(cloneItems(demoItems));
        addActivity("Imported sample data");
      },
    }),
    [items, addActivity]
  );

  // Filter controls component
  const filterControls = (
    <TableFilters
      search={search}
      onSearchChange={handleSearchChange}
      status={statusFilter}
      onStatusChange={handleStatusChange}
      tag={tagFilter}
      onTagChange={handleTagChange}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      showArchived={showArchived}
      hasArchivedItems={kpis.archived > 0}
      onShowArchivedChange={handleShowArchivedChange}
    />
  );

  // Pagination controls component
  const paginationControls = (
    <TablePagination
      currentPage={safePage}
      totalItems={filteredItems.length}
      pageSize={PAGE_SIZE}
      onPageChange={setCurrentPage}
    />
  );

  // Quick actions content
  const quickActionsContent = (
    <>
      <QuickActionLink href="/demo" label="Demo Dashboard" active />
      <QuickActionLink href="/login" label="Sign In" />
      <QuickActionLink href="/signup" label="Create Account" />
    </>
  );

  const tableActions =
    items.length > 0 ? (
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="h-8 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        + Create Project
      </button>
    ) : null;

  // Analytics data
  const statusDistribution = useMemo(
    () => computeStatusDistribution(nonArchivedItems),
    [nonArchivedItems]
  );
  const completionTrend = useMemo(() => computeCompletionTrend(items), [items]);

  // Analytics content
  const analyticsContent = useMemo(
    () => (
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-medium text-foreground/80">Status Distribution</h3>
          <p className="mb-4 text-xs text-foreground/50">Excludes archived projects</p>
          <StatusDistributionChart
            data={statusDistribution}
            isEmpty={nonArchivedItems.length === 0}
          />
        </div>
        <div>
          <TrendChart
            data={completionTrend}
            title="Completion Trend (incl. archived)"
            isEmpty={completionTrend.length === 0}
          />
        </div>
      </div>
    ),
    [statusDistribution, completionTrend, nonArchivedItems.length]
  );

  return (
    <DashboardShell
      testId="demo-page"
      title="Dashboard"
      subtitle="Welcome to demo mode — explore without signing up."
      headerContent={<GuestModeBanner />}
      kpis={kpis}
      isLoadingKpis={isLoading}
      filterControls={filterControls}
      tableActions={tableActions}
      tableContent={
        <DashboardContent
          items={paginatedItems}
          emptyMessage="No projects match your filters. Try adjusting your search or filters."
          hasItems={items.length > 0}
          isCreateModalOpen={isCreateModalOpen}
          onCreateModalOpenChange={setIsCreateModalOpen}
          canImportSampleData={true}
          handlers={mutationHandlers}
          emptyStateContent={
            <>
              <h3 className="font-medium">No Projects</h3>
              <p className="mt-1 text-sm text-foreground/60">
                Create a project or import sample data to get started.
              </p>
            </>
          }
        />
      }
      isLoadingTable={isLoading}
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
    <a
      href={href}
      className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "border-foreground/20 bg-foreground/10 text-foreground"
          : "border-foreground/10 bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
      }`}
    >
      {label}
    </a>
  );
}
