"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
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
  showArchived: boolean;
  hasArchivedItems: boolean;
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
  showArchived,
  hasArchivedItems,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

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

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  useEffect(() => {
    if (searchInput === search) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      updateParams({ search: searchInput || undefined });
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, search, updateParams]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
    },
    [setSearchInput]
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

  const handleShowArchivedChange = useCallback(
    (value: boolean) => {
      if (!value && sortField === "archivedAt") {
        updateParams({
          showArchived: undefined,
          sortBy: undefined,
          sortDir: undefined,
        });
        return;
      }

      updateParams({ showArchived: value ? "true" : undefined });
    },
    [sortField, updateParams]
  );

  return (
    <TableFilters
      search={searchInput}
      onSearchChange={handleSearchChange}
      status={status}
      onStatusChange={handleStatusChange}
      tag={tag}
      onTagChange={handleTagChange}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      showArchived={showArchived}
      hasArchivedItems={hasArchivedItems}
      onShowArchivedChange={handleShowArchivedChange}
    />
  );
}
