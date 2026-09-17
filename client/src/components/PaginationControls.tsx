import React from "react";

export const PaginationControls = ({
  currentPage,
  totalPages,
  startIndex,
  totalItems,
  itemsOnPage,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  startIndex?: number;
  totalItems: number;
  itemsOnPage?: number;
  itemsPerPage?: number;
  onPageChange: (p: number) => void;
}) => {
  if (totalItems === 0) return null;

  const getPageNumbers = (current: number, total: number) => {
    const delta = 1,
      range = [],
      rangeWithDots: (number | string)[] = [];
    let l: number | undefined;
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      )
        range.push(i);
    }
    for (const i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l > 2) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  const displayedRows = typeof itemsOnPage === 'number'
    ? itemsOnPage
    : typeof itemsPerPage === 'number' && typeof startIndex === 'number'
      ? Math.min(itemsPerPage, Math.max(0, totalItems - startIndex))
      : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-0">
        Showing {displayedRows} rows on this page (of {totalItems} total)
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn-sm"
        >
          Previous
        </button>
        {getPageNumbers(currentPage, totalPages).map((page, idx) =>
          page === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 py-1 text-gray-500 self-center"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`btn btn-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};
