import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IReportColumnDefinition } from '@/interface';
import { exportTableToCsv } from '../reportHelpers';

interface ReportDataTableProps<T = any> {
  tableId: string;
  title: string;
  unit?: string;
  columns: IReportColumnDefinition<T>[];
  rows: T[];
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  totalsRow?: Record<string, string | number>;
  disablePagination?: boolean;
  defaultPageSize?: number;
  onClearFilters?: () => void;
  exportFilename?: string;
}

export function ReportDataTable<T = any>({
  tableId,
  title,
  unit = 'records',
  columns,
  rows,
  defaultSortKey,
  defaultSortDirection = 'desc',
  totalsRow,
  disablePagination = false,
  defaultPageSize = 10,
  onClearFilters,
  exportFilename,
}: ReportDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(new Set());
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close column dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isColumnMenuOpen]);

  // Handle column header sort click
  const handleSortClick = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumnKeys((prevSet) => {
      const nextSet = new Set(prevSet);
      if (nextSet.has(columnKey)) {
        nextSet.delete(columnKey);
      } else {
        // Prevent hiding all columns
        if (columns.length - nextSet.size > 1) {
          nextSet.add(columnKey);
        }
      }
      return nextSet;
    });
  };

  // Filtered rows by local search query
  const filteredRows = useMemo(() => {
    if (!localSearch.trim()) return rows;
    const query = localSearch.toLowerCase().trim();
    return rows.filter((row: any) => {
      return columns.some((col) => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [rows, localSearch, columns]);

  // Visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumnKeys.has(col.key)),
    [columns, hiddenColumnKeys]
  );

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const activeColumn = columns.find((c) => c.key === sortKey);
    if (!activeColumn) return filteredRows;

    const sortedList = [...filteredRows];
    sortedList.sort((rowA, rowB) => {
      const valueA = activeColumn.accessor ? activeColumn.accessor(rowA) : (rowA as any)[sortKey];
      const valueB = activeColumn.accessor ? activeColumn.accessor(rowB) : (rowB as any)[sortKey];

      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const compareResult = valueA.localeCompare(valueB);
        return sortDirection === 'asc' ? compareResult : -compareResult;
      }
      return 0;
    });

    return sortedList;
  }, [filteredRows, sortKey, sortDirection, columns]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    if (disablePagination) return sortedRows;
    const startIndex = (effectiveCurrentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, disablePagination, effectiveCurrentPage, pageSize]);

  const displayFrom = sortedRows.length === 0 ? 0 : (effectiveCurrentPage - 1) * pageSize + 1;
  const displayTo = Math.min(effectiveCurrentPage * pageSize, sortedRows.length);

  const handleExportCsv = () => {
    const filename = exportFilename || `${tableId}_export`;
    exportTableToCsv(visibleColumns, sortedRows, filename);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-2xs mb-4">
      {/* Table Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            ({filteredRows.length.toLocaleString('en-IN')}{localSearch ? ` of ${rows.length}` : ''} {unit})
          </span>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Instant Table Search Bar */}
          <div className="relative min-w-[170px] sm:min-w-[210px]">
            <i className="mgc_search_line absolute left-2.5 top-2 text-xs text-gray-400" />
            <input
              type="text"
              placeholder={`Search in table…`}
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:border-[#0e90d9]"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {/* Export CSV action */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition"
            title="Download CSV"
          >
            <i className="mgc_download_2_line text-sm text-[#0e90d9]" />
            <span>Export CSV</span>
          </button>

          {/* Column Visibility Toggler */}
          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => setIsColumnMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition"
            >
              <span>Columns</span>
              <i className="mgc_down_line text-xs" />
            </button>

            {isColumnMenuOpen && (
              <div className="absolute right-0 top-9 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 shadow-lg max-h-60 overflow-y-auto space-y-1">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md cursor-pointer text-xs text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColumnKeys.has(column.key)}
                      onChange={() => toggleColumnVisibility(column.key)}
                      className="rounded-xs border-gray-300 text-[#0e90d9] focus:ring-[#0e90d9]"
                    />
                    <span className="truncate">{column.header}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Rows Per Page Selector */}
          {!disablePagination && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg pl-2.5 pr-8 min-w-[74px] py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      {rows.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center mx-auto mb-2 text-gray-400">
            <i className="mgc_search_line text-lg" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">No records found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Try adjusting your date range or filters.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 text-xs text-[#0e90d9] hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                {visibleColumns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSortClick(col.key)}
                      className={`py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 dark:hover:text-white ${
                        col.isNumeric ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-flex items-center gap-1 ${
                          col.isNumeric ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSorted && (
                          <span className="text-[#0e90d9] font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {paginatedRows.map((rowItem, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {visibleColumns.map((col) => {
                    let cellContent: React.ReactNode = null;
                    if (col.render) {
                      cellContent = col.render(rowItem);
                    } else if (col.accessor) {
                      cellContent = col.accessor(rowItem);
                    } else {
                      const rawValue = (rowItem as any)[col.key];
                      cellContent =
                        rawValue === null || rawValue === undefined || rawValue === ''
                          ? '—'
                          : String(rawValue);
                    }

                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 px-3 whitespace-nowrap text-gray-700 dark:text-gray-200 ${
                          col.isNumeric ? 'text-right tabular-nums' : 'text-left'
                        }`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Totals Footer Row */}
            {totalsRow && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/60 font-semibold text-gray-800 dark:text-gray-100">
                  {visibleColumns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 whitespace-nowrap ${
                        col.isNumeric ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {totalsRow[col.key] !== undefined
                        ? totalsRow[col.key]
                        : colIdx === 0
                        ? 'Total'
                        : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!disablePagination && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {displayFrom}–{displayTo} of {sortedRows.length.toLocaleString('en-IN')} {unit}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={effectiveCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-1 text-gray-700 dark:text-gray-300 font-medium">
              Page {effectiveCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={effectiveCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
