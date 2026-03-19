import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type PaginationState, type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';
import { EmptyState } from './EmptyState';
import type { ReactNode } from 'react';

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  isLoading?: boolean;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: T[]) => void;
  enableGlobalFilter?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  onRowClick?: (row: T) => void;
  bulkActions?: ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  manualPagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    rowCount: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  manualSorting?: {
    sorting: SortingState;
    onSortingChange: (sorting: SortingState) => void;
  };
}

export function DataTable<T>({
  columns, data, isLoading, enableRowSelection, onRowSelectionChange, enableGlobalFilter, enableColumnVisibility, enableExport, exportFilename, onRowClick, bulkActions, emptyMessage, pageSize = 10,
  manualPagination,
  manualSorting,
}: DataTableProps<T>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const sorting = manualSorting?.sorting ?? internalSorting;
  const pagination = useMemo<PaginationState>(
    () =>
      manualPagination
        ? {
            pageIndex: manualPagination.pageIndex,
            pageSize: manualPagination.pageSize,
          }
        : internalPagination,
    [internalPagination, manualPagination],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection, pagination },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
      if (manualSorting) {
        manualSorting.onSortingChange(nextSorting);
        return;
      }
      setInternalSorting(nextSorting);
    },
    onPaginationChange: (updater) => {
      if (manualPagination) {
        const nextPagination = typeof updater === 'function' ? updater(pagination) : updater;
        if (nextPagination.pageIndex !== pagination.pageIndex) {
          manualPagination.onPageChange(nextPagination.pageIndex);
        }
        if (nextPagination.pageSize !== pagination.pageSize) {
          manualPagination.onPageSizeChange?.(nextPagination.pageSize);
        }
        return;
      }

      setInternalPagination((current) => (typeof updater === 'function' ? updater(current) : updater));
    },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onRowSelectionChange) {
        const selectedRows = Object.keys(next).map((idx) => data[parseInt(idx)]).filter(Boolean);
        onRowSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection,
    manualPagination: Boolean(manualPagination),
    manualSorting: Boolean(manualSorting),
    pageCount: manualPagination?.pageCount,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        enableGlobalFilter={enableGlobalFilter}
        enableColumnVisibility={enableColumnVisibility}
        enableExport={enableExport}
        exportFilename={exportFilename}
        selectedCount={selectedCount}
        bulkActions={bulkActions}
      />

      <div className="overflow-x-auto">
        {isLoading ? (
          <DataTableSkeleton columns={columns.length} />
        ) : data.length === 0 ? (
          <EmptyState title={emptyMessage || 'No data found'} description="Try adjusting your filters or search criteria." />
        ) : (
          <table className="w-full data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/30">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2.5 text-left">
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn('flex items-center gap-1.5', header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground')}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            header.column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3" /> :
                            header.column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3" /> :
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && 'cursor-pointer', row.getIsSelected() && 'bg-primary/5')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && data.length > 0 && (
        <DataTablePagination table={table} totalRows={manualPagination?.rowCount} />
      )}
    </div>
  );
}
