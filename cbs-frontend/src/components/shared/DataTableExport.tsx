import { Download } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface DataTableExportProps<T> {
  table: Table<T>;
  filename?: string;
}

export function DataTableExport<T>({ table, filename = 'export' }: DataTableExportProps<T>) {
  const handleExport = () => {
    const headers = table.getVisibleLeafColumns().map((col) =>
      typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id
    );
    const rows = table.getFilteredRowModel().rows.map((row) =>
      table.getVisibleLeafColumns().map((col) => {
        const val = row.getValue(col.id);
        if (val === null || val === undefined) return '';
        return String(val).replace(/"/g, '""');
      })
    );
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors">
      <Download className="w-4 h-4" /> Export
    </button>
  );
}
