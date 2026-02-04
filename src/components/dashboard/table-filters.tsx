"use client";

import type { ItemStatus, ItemTag, SortField, SortDirection } from "./model";
import { statusOptions, tagOptions, sortOptions } from "./model";

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
  onShowArchivedChange,
}: TableFiltersProps) {
  const currentSortValue = `${sortField}-${sortDirection}`;

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
      <select
        value={currentSortValue}
        onChange={(e) => {
          const selected = sortOptions.find((opt) => opt.value === e.target.value);
          if (selected) {
            onSortChange(selected.field, selected.direction);
          }
        }}
        className="h-8 shrink-0 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

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
