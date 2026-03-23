import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface DataTablePaginationProps<T> {
  table: Table<T>;
  pageSizeOptions?: number[];
  totalRows?: number;
}

export function DataTablePagination<T>({
  table,
  pageSizeOptions = [10, 25, 50, 100],
  totalRows,
}: DataTablePaginationProps<T>) {
  const rowCount = totalRows ?? table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const rangeStart = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = rowCount === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <div className="data-table-pagination">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Rows per page</span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="data-table-select"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="ml-2">
          {rangeStart}–{rangeEnd} of {rowCount}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button aria-label="First page" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="data-table-pagination-button">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="data-table-pagination-button">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 text-sm font-medium">
          Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </span>
        <button aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="data-table-pagination-button">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button aria-label="Last page" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="data-table-pagination-button">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
