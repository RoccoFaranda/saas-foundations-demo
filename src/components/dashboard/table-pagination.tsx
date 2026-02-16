"use client";

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {totalItems === 0 ? "No results" : `Showing ${startItem}-${endItem} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="row-action"
        >
          Previous
        </button>

        {/* Page numbers */}
        {totalPages > 0 && (
          <div className="flex items-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`row-action min-w-8 ${
                  page === currentPage ? "bg-muted font-medium text-foreground" : ""
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="row-action"
        >
          Next
        </button>
      </div>
    </div>
  );
}
