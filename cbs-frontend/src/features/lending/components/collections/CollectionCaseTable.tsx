import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { CollectionCase } from '../../types/collections';

interface CollectionCaseTableProps {
  data?: CollectionCase[];
  isLoading?: boolean;
  onRowClick?: (row: CollectionCase) => void;
}

const bucketColor = (bucket: string): string =>
  ({
    '1-30': 'bg-sky-100 text-sky-800',
    '31-60': 'bg-amber-100 text-amber-800',
    '61-90': 'bg-orange-100 text-orange-800',
    '91-180': 'bg-rose-100 text-rose-800',
    '180+': 'bg-red-900 text-white',
  }[bucket] ?? 'bg-gray-100 text-gray-800');

const classificationColor = (classification: string): string => {
  switch (classification) {
    case 'WATCH':
      return 'bg-yellow-100 text-yellow-800';
    case 'SUBSTANDARD':
      return 'bg-orange-100 text-orange-800';
    case 'DOUBTFUL':
      return 'bg-rose-100 text-rose-800';
    case 'LOSS':
      return 'bg-red-900 text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const columns: ColumnDef<CollectionCase>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <div>
        <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>
        {row.original.caseNumber ? <p className="mt-1 text-xs text-muted-foreground">{row.original.caseNumber}</p> : null}
      </div>
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
      <span className="font-semibold text-rose-600">{row.original.dpd}d</span>
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
        {row.original.lastActionDate ? (
          <p className="text-xs text-muted-foreground">{formatDate(row.original.lastActionDate)}</p>
        ) : null}
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
  const urgentCases = data.filter((item) => item.bucket === '91-180' || item.bucket === '180+').length;
  const unassignedCases = data.filter((item) => !item.assignedTo).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Case Pipeline</p>
          <h3 className="mt-2 text-lg font-semibold">Active Collection Cases</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review delinquent accounts, ownership, and the next action due for each case.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="lending-hero-chip">{data.length} cases</div>
          <div className="lending-hero-chip">{urgentCases} urgent</div>
          <div className="lending-hero-chip">{unassignedCases} unassigned</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRowClick={onRowClick}
        enableExport
        exportFilename="collection-cases"
        emptyMessage="No collection cases found"
        pageSize={15}
        getRowClassName={(row) =>
          row.bucket === '91-180' || row.bucket === '180+'
            ? 'bg-rose-500/[0.03]'
            : undefined
        }
      />
    </div>
  );
}
