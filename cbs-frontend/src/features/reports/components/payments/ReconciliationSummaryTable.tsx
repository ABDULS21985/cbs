import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { DataTable, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { ReconciliationRow } from '../../api/paymentAnalyticsApi';

interface ReconciliationSummaryTableProps {
  data: ReconciliationRow[];
  isLoading: boolean;
}

function rowBgClass(row: ReconciliationRow): string {
  if (row.status === 'RECONCILED') return 'bg-green-50 dark:bg-green-900/10';
  if (row.status === 'BREAKS_MINOR') return 'bg-amber-50 dark:bg-amber-900/10';
  return 'bg-red-50 dark:bg-red-900/10';
}

const columns: ColumnDef<ReconciliationRow, any>[] = [
  {
    accessorKey: 'rail',
    header: 'Rail',
    cell: ({ getValue, row }) => (
      <span className={cn('block font-medium text-sm px-4 py-2.5 -mx-4 -my-2', rowBgClass(row.original))}>
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'expected',
    header: 'Expected',
    cell: ({ getValue, row }) => (
      <span className={cn('block tabular-nums text-sm px-4 py-2.5 -mx-4 -my-2', rowBgClass(row.original))}>
        {getValue<number>().toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'matched',
    header: 'Matched',
    cell: ({ getValue, row }) => (
      <span className={cn('block tabular-nums text-sm px-4 py-2.5 -mx-4 -my-2 text-green-700 dark:text-green-400', rowBgClass(row.original))}>
        {getValue<number>().toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'unmatched',
    header: 'Unmatched',
    cell: ({ getValue, row }) => {
      const v = getValue<number>();
      return (
        <span className={cn('block tabular-nums text-sm px-4 py-2.5 -mx-4 -my-2', rowBgClass(row.original), v > 0 ? 'text-red-600 dark:text-red-400 font-medium' : '')}>
          {v.toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: 'breaks',
    header: 'Breaks',
    cell: ({ getValue, row }) => {
      const v = getValue<number>();
      return (
        <span className={cn('block tabular-nums text-sm px-4 py-2.5 -mx-4 -my-2', rowBgClass(row.original), v > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : '')}>
          {v}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
  },
];

export function ReconciliationSummaryTable({ data, isLoading }: ReconciliationSummaryTableProps) {
  const totals = useMemo(() => {
    if (!data.length) return null;
    return {
      expected: data.reduce((s, r) => s + r.expected, 0),
      matched: data.reduce((s, r) => s + r.matched, 0),
      unmatched: data.reduce((s, r) => s + r.unmatched, 0),
      breaks: data.reduce((s, r) => s + r.breaks, 0),
    };
  }, [data]);

  const handleExport = () => {
    if (!data.length) return;
    const headers = ['Rail', 'Expected', 'Matched', 'Unmatched', 'Breaks', 'Status'];
    const rows = data.map((r) => [r.rail, r.expected, r.matched, r.unmatched, r.breaks, r.status].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="surface-card">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Reconciliation Summary</h2>
        <button
          onClick={handleExport}
          disabled={!data.length}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          Export Reconciliation Report
        </button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No reconciliation data available"
        pageSize={10}
      />
      {!isLoading && totals && (
        <div className="border-t px-4 py-2.5 grid grid-cols-6 text-xs font-semibold bg-muted/30">
          <span className="text-muted-foreground">Totals</span>
          <span className="tabular-nums">{totals.expected.toLocaleString()}</span>
          <span className="tabular-nums text-green-700 dark:text-green-400">{totals.matched.toLocaleString()}</span>
          <span className={cn('tabular-nums', totals.unmatched > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {totals.unmatched.toLocaleString()}
          </span>
          <span className={cn('tabular-nums', totals.breaks > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {totals.breaks}
          </span>
          <span />
        </div>
      )}
    </div>
  );
}
