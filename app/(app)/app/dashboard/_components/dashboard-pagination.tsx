"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TablePagination } from "@/src/components/dashboard";

interface DashboardPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
}

/**
 * Client component wrapper for TablePagination that syncs page to URL searchParams.
 */
export function DashboardPagination({
  currentPage,
  totalItems,
  pageSize,
}: DashboardPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (page === 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <TablePagination
      currentPage={currentPage}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={handlePageChange}
    />
  );
}
