"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TableFilters } from "@/src/components/dashboard";
import type {
  ItemStatus,
  ItemTag,
  SortField,
  SortDirection,
} from "@/src/components/dashboard/model";

interface DashboardFiltersProps {
  search: string;
  status: ItemStatus | "all";
  tag: ItemTag | "all";
  sortField: SortField;
  sortDirection: SortDirection;
}

/**
 * Client component wrapper for TableFilters that syncs state to URL searchParams.
 * Uses Next.js router to update URL, triggering server-side data refetch.
 */
export function DashboardFilters({
  search,
  status,
  tag,
  sortField,
  sortDirection,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build new URL with updated params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all" || value === "1") {
          // Remove default values to keep URLs clean
          if (key === "page" && value === "1") {
            params.delete(key);
          } else if (value === undefined || value === "" || value === "all") {
            params.delete(key);
          }
        } else {
          params.set(key, value);
        }
      }

      // Reset to page 1 when filters change (except when only page changes)
      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateParams({ search: value || undefined });
    },
    [updateParams]
  );

  const handleStatusChange = useCallback(
    (value: ItemStatus | "all") => {
      updateParams({ status: value === "all" ? undefined : value });
    },
    [updateParams]
  );

  const handleTagChange = useCallback(
    (value: ItemTag | "all") => {
      updateParams({ tag: value === "all" ? undefined : value });
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      updateParams({
        sortBy: field === "updatedAt" ? undefined : field,
        sortDir: direction === "desc" ? undefined : direction,
      });
    },
    [updateParams]
  );

  return (
    <TableFilters
      search={search}
      onSearchChange={handleSearchChange}
      status={status}
      onStatusChange={handleStatusChange}
      tag={tag}
      onTagChange={handleTagChange}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
    />
  );
}
