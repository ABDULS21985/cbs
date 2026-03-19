import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { CollectionCase } from '../../types/collections';

interface CollectionCaseTableProps {
  data?: CollectionCase[];
  isLoading?: boolean;
  onRowClick?: (row: CollectionCase) => void;
}

const bucketColor = (b: string): string =>
  ({
    '1-30': 'bg-blue-100 text-blue-800',
    '31-60': 'bg-amber-100 text-amber-800',
    '61-90': 'bg-orange-100 text-orange-800',
    '91-180': 'bg-red-100 text-red-800',
    '180+': 'bg-red-900 text-white',
  }[b] ?? 'bg-gray-100 text-gray-800');

const classificationColor = (c: string): string => {
  switch (c) {
    case 'WATCH': return 'bg-yellow-100 text-yellow-800';
    case 'SUBSTANDARD': return 'bg-orange-100 text-orange-800';
    case 'DOUBTFUL': return 'bg-red-100 text-red-800';
    case 'LOSS': return 'bg-red-900 text-white';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const columns: ColumnDef<CollectionCase>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.outstanding, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'dpd',
    header: 'DPD',
    cell: ({ row }) => (
      <span className="font-semibold text-red-600">{row.original.dpd}d</span>
    ),
  },
  {
    accessorKey: 'bucket',
    header: 'Bucket',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bucketColor(row.original.bucket)}`}>
        {row.original.bucket}
      </span>
    ),
  },
  {
    accessorKey: 'classification',
    header: 'Classification',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classificationColor(row.original.classification)}`}>
        {row.original.classification}
      </span>
    ),
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned',
    cell: ({ row }) => row.original.assignedTo ?? <span className="text-muted-foreground">Unassigned</span>,
  },
  {
    accessorKey: 'lastAction',
    header: 'Last Action',
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.lastAction ?? '—'}</p>
        {row.original.lastActionDate && (
          <p className="text-xs text-muted-foreground">{formatDate(row.original.lastActionDate)}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'nextActionDue',
    header: 'Next Action Due',
    cell: ({ row }) =>
      row.original.nextActionDue ? (
        <span className="text-sm">{formatDate(row.original.nextActionDue)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function CollectionCaseTable({ data = [], isLoading, onRowClick }: CollectionCaseTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableExport
      exportFilename="collection-cases"
      emptyMessage="No collection cases found"
      pageSize={15}
    />
  );
}
