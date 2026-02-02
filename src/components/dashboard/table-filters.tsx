"use client";

import type {
  DemoItemStatus,
  DemoItemTag,
  SortField,
  SortDirection,
} from "../../../app/(demo)/demo/demo-items";
import { statusOptions, tagOptions, sortOptions } from "../../../app/(demo)/demo/demo-items";

interface TableFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: DemoItemStatus | "all";
  onStatusChange: (value: DemoItemStatus | "all") => void;
  tag: DemoItemTag | "all";
  onTagChange: (value: DemoItemTag | "all") => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
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
}: TableFiltersProps) {
  const currentSortValue = `${sortField}-${sortDirection}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search Input */}
      <div className="relative">
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
          className="h-8 w-40 rounded-md border border-foreground/10 bg-background pl-8 pr-2 text-sm placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
        />
      </div>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as DemoItemStatus | "all")}
        className="h-8 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
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
        onChange={(e) => onTagChange(e.target.value as DemoItemTag | "all")}
        className="h-8 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
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
        className="h-8 rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground/80 focus:border-foreground/30 focus:outline-none"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
