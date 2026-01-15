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
    <div className="flex items-center justify-between border-t border-foreground/10 px-4 py-3 text-sm">
      <span className="text-foreground/50">
        {totalItems === 0 ? "No results" : `Showing ${startItem}–${endItem} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={`rounded px-2 py-1 transition-colors ${
            canGoPrev
              ? "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              : "cursor-not-allowed text-foreground/30"
          }`}
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
                className={`min-w-[2rem] rounded px-2 py-1 transition-colors ${
                  page === currentPage
                    ? "bg-foreground/10 font-medium text-foreground"
                    : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground/70"
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
          className={`rounded px-2 py-1 transition-colors ${
            canGoNext
              ? "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              : "cursor-not-allowed text-foreground/30"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
