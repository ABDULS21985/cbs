import { useState, useRef, useEffect } from 'react';
import { Columns3 } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface DataTableColumnToggleProps<T> {
  table: Table<T>;
}

export function DataTableColumnToggle<T>({ table }: DataTableColumnToggleProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors">
        <Columns3 className="w-4 h-4" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border bg-popover shadow-lg z-50 py-2 max-h-72 overflow-y-auto">
          {table.getAllLeafColumns().filter((col) => col.getCanHide()).map((column) => (
            <label key={column.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
                className="rounded border-gray-300"
              />
              {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
