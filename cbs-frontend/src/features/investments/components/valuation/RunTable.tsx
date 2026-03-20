import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ValuationRun } from '../../api/valuationApi';

const RUN_TYPE_BADGE: Record<string, string> = {
  EOD: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INTRADAY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  AD_HOC: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const columns: ColumnDef<ValuationRun, unknown>[] = [
  {
    accessorKey: 'runRef',
    header: 'Run Ref',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.runRef}</span>,
  },
  {
    accessorKey: 'valuationDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.valuationDate)}</span>,
  },
  {
    accessorKey: 'runType',
    header: 'Type',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RUN_TYPE_BADGE[row.original.runType] ?? 'bg-muted text-muted-foreground'}`}>
        {row.original.runType}
      </span>
    ),
  },
  {
    accessorKey: 'instrumentsValued',
    header: 'Instruments',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.instrumentsValued}</span>,
  },
  {
    accessorKey: 'totalMarketValue',
    header: 'Total Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">
        {formatMoney(row.original.totalMarketValue, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'ipvBreachCount',
    header: 'Exceptions',
    cell: ({ row }) => (
      <span className={`font-mono text-sm ${row.original.ipvBreachCount > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
        {row.original.ipvBreachCount}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

interface Props {
  runs: ValuationRun[];
  isLoading?: boolean;
  onRowClick?: (run: ValuationRun) => void;
}

export function RunTable({ runs, isLoading, onRowClick }: Props) {
  return (
    <DataTable
      columns={columns}
      data={runs}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No valuation runs found"
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
    />
  );
}
