"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  demoItems,
  getDemoKpis,
  filterItems,
  sortItems,
  paginateItems,
  type DemoItemStatus,
  type DemoItemTag,
  type SortField,
  type SortDirection,
} from "./demo-items";
import {
  KpiCard,
  ItemsTable,
  ActivityFeed,
  GuestModeBanner,
  TableFilters,
  TablePagination,
  TableSkeleton,
} from "./_components";

const PAGE_SIZE = 5;

export default function DemoPage() {
  // Loading state (simulated)
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DemoItemStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<DemoItemTag | "all">("all");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

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

  // Compute filtered & sorted data
  const filteredItems = useMemo(() => {
    const filtered = filterItems(demoItems, {
      search,
      status: statusFilter,
      tag: tagFilter,
    });
    return sortItems(filtered, { field: sortField, direction: sortDirection });
  }, [search, statusFilter, tagFilter, sortField, sortDirection]);

  // KPIs computed from full dataset
  const kpis = useMemo(() => getDemoKpis(demoItems), []);

  // Clamp page to avoid out-of-range when filters change outside handlers
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Paginated items for display
  const paginatedItems = useMemo(
    () => paginateItems(filteredItems, safePage, PAGE_SIZE),
    [filteredItems, safePage]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Page Header with Guest Mode Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Welcome to demo mode — explore without signing up.
          </p>
        </div>
        <GuestModeBanner />
      </div>

      {/* KPI Cards - computed from full dataset */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={isLoading ? "—" : kpis.total}
          subtitle="All projects"
        />
        <KpiCard label="Active" value={isLoading ? "—" : kpis.active} subtitle="In progress" />
        <KpiCard label="Completed" value={isLoading ? "—" : kpis.completed} subtitle="Finished" />
        <KpiCard
          label="Avg Progress"
          value={isLoading ? "—" : `${kpis.avgProgress}%`}
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
              />
            </div>

            {/* Table content */}
            <div className="p-4">
              {isLoading ? (
                <TableSkeleton rows={PAGE_SIZE} />
              ) : (
                <ItemsTable
                  items={paginatedItems}
                  emptyMessage="No projects match your filters. Try adjusting your search or filters."
                />
              )}
            </div>

            {/* Pagination */}
            {!isLoading && (
              <TablePagination
                currentPage={safePage}
                totalItems={filteredItems.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </div>

        {/* Side Panel - Activity & Quick Actions */}
        <div className="space-y-6">
          <ActivityFeed />

          {/* Quick Actions Panel */}
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
