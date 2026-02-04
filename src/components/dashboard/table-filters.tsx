"use client";

import type { ItemStatus, ItemTag, SortField, SortDirection } from "./model";
import { statusOptions, tagOptions, sortFieldOptions, getDefaultSortDirection } from "./model";

interface TableFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ItemStatus | "all";
  onStatusChange: (value: ItemStatus | "all") => void;
  tag: ItemTag | "all";
  onTagChange: (value: ItemTag | "all") => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  showArchived?: boolean;
  hasArchivedItems?: boolean;
  onShowArchivedChange?: (value: boolean) => void;
}

export function TableFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  tag,
  onTagChange,
  sortField,
  sortDirection,
  onSortChange,
  showArchived = false,
  hasArchivedItems = false,
  onShowArchivedChange,
}: TableFiltersProps) {
  const canSortByArchivedDate = showArchived && hasArchivedItems;
  const availableSortFields = canSortByArchivedDate
    ? sortFieldOptions
    : sortFieldOptions.filter((option) => option.value !== "archivedAt");
  const effectiveSortField =
    !canSortByArchivedDate && sortField === "archivedAt" ? "updatedAt" : sortField;

  const sortDirectionLabel = sortDirection === "asc" ? "Ascending" : "Descending";

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
      {/* Search Input */}
      <div className="relative min-w-44 flex-1">
        <svg
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-full rounded-md border border-foreground/10 bg-background pl-8 pr-2 text-sm placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
        />
      </div>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as ItemStatus | "all")}
        className="h-8 shrink-0 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Tag Filter */}
      <select
        value={tag}
        onChange={(e) => onTagChange(e.target.value as ItemTag | "all")}
        className="h-8 shrink-0 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
      >
        {tagOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <div className="inline-flex h-8 shrink-0 overflow-hidden rounded-md border border-foreground/10 bg-background">
        <select
          value={effectiveSortField}
          onChange={(e) => {
            const field = e.target.value as SortField;
            onSortChange(field, getDefaultSortDirection(field));
          }}
          className="h-full border-0 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
          aria-label="Sort field"
        >
          {availableSortFields.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSortChange(effectiveSortField, sortDirection === "asc" ? "desc" : "asc")}
          aria-label={`Sort direction: ${sortDirectionLabel}. Click to toggle.`}
          title={`Sort direction: ${sortDirectionLabel}`}
          className="inline-flex h-full w-8 items-center justify-center border-l border-foreground/10 text-sm text-foreground/80 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            {sortDirection === "asc" ? (
              <path d="M10 4l4 5H6l4-5zM9 9h2v7H9V9z" />
            ) : (
              <path d="M9 4h2v7H9V4zM6 11h8l-4 5-4-5z" />
            )}
          </svg>
        </button>
      </div>

      {/* Show Archived Toggle */}
      {onShowArchivedChange && (
        <label className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-foreground/10 bg-background px-2.5 text-sm text-foreground/80 transition-colors hover:bg-foreground/5 sm:ml-auto">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer"
          />
          <span className="whitespace-nowrap text-xs sm:text-sm">Show archived</span>
        </label>
      )}
    </div>
  );
}
