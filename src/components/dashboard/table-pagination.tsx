"use client";

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function buildVisiblePageItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const nearStart = currentPage <= 4;
  const nearEnd = currentPage >= totalPages - 3;

  if (nearStart) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (nearEnd) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const visiblePageItems = buildVisiblePageItems(totalPages, currentPage);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="border-t border-border px-4 py-3 text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="text-muted-foreground">
          {totalItems === 0 ? "No results" : `Showing ${startItem}-${endItem} of ${totalItems}`}
        </span>

        <div className="flex min-w-0 items-center gap-1 md:justify-end">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
            className="row-action shrink-0"
            aria-label="Go to first page"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
            className="row-action shrink-0"
          >
            Previous
          </button>

          {totalPages > 0 && (
            <div className="min-w-0 overflow-x-auto">
              <div className="flex items-center gap-1 whitespace-nowrap px-1">
                {visiblePageItems.map((item, index) => {
                  if (item === "ellipsis-left" || item === "ellipsis-right") {
                    return (
                      <span
                        key={`${item}-${index}`}
                        className="px-1 text-xs text-muted-foreground"
                        aria-hidden="true"
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPageChange(item)}
                      className={`row-action min-w-8 shrink-0 ${
                        item === currentPage ? "bg-muted font-medium text-foreground" : ""
                      }`}
                      aria-label={`Go to page ${item}`}
                      aria-current={item === currentPage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="row-action shrink-0"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className="row-action shrink-0"
            aria-label="Go to last page"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
