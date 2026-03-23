import { Search, X } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { DataTableColumnToggle } from './DataTableColumnToggle';
import { DataTableExport } from './DataTableExport';
import type { ReactNode } from 'react';

interface DataTableToolbarProps<T> {
  table: Table<T>;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  searchPlaceholder?: string;
  enableGlobalFilter?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  selectedCount?: number;
  bulkActions?: ReactNode;
}

export function DataTableToolbar<T>({
  table, globalFilter, onGlobalFilterChange, searchPlaceholder, enableGlobalFilter, enableColumnVisibility, enableExport, exportFilename, selectedCount, bulkActions,
}: DataTableToolbarProps<T>) {
  const hasTools = enableGlobalFilter || enableColumnVisibility || enableExport;
  if (!hasTools && !selectedCount) return null;

  return (
    <div className="data-table-toolbar">
      <div className="flex items-center gap-2 flex-1">
        {selectedCount && selectedCount > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            {bulkActions}
          </div>
        ) : (
          enableGlobalFilter && (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={globalFilter || ''}
                onChange={(e) => onGlobalFilterChange?.(e.target.value)}
                placeholder={searchPlaceholder || 'Search records...'}
                className="data-table-search-input"
              />
              {globalFilter && (
                <button onClick={() => onGlobalFilterChange?.('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        {enableColumnVisibility && <DataTableColumnToggle table={table} />}
        {enableExport && <DataTableExport table={table} filename={exportFilename} />}
      </div>
    </div>
  );
}
