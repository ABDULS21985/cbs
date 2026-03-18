import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface DataTablePaginationProps<T> {
  table: Table<T>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<T>({ table, pageSizeOptions = [10, 25, 50, 100] }: DataTablePaginationProps<T>) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Rows per page</span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 w-16 rounded border bg-background text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="ml-2">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
