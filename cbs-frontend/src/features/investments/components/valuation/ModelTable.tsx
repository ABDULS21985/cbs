import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import type { ValuationModel } from '../../api/valuationApi';

const FVL_BADGE: Record<number, string> = {
  1: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  2: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const columns: ColumnDef<ValuationModel, unknown>[] = [
  {
    accessorKey: 'modelCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.modelCode}</span>,
  },
  {
    accessorKey: 'modelName',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.modelName}</span>,
  },
  {
    accessorKey: 'instrumentType',
    header: 'Instrument Type',
    cell: ({ row }) => <StatusBadge status={row.original.instrumentType} />,
  },
  {
    accessorKey: 'methodology',
    header: 'Methodology',
    cell: ({ row }) => <span className="text-sm">{row.original.methodology.replace(/_/g, ' ')}</span>,
  },
  {
    accessorKey: 'fairValueLevel',
    header: 'FV Level',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FVL_BADGE[row.original.fairValueLevel] ?? 'bg-muted text-muted-foreground'}`}>
        Level {row.original.fairValueLevel}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
  },
];

interface Props {
  models: ValuationModel[];
  isLoading?: boolean;
}

export function ModelTable({ models, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={models}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No valuation models found"
    />
  );
}
