import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { InterbankRelationship } from '../../types/interbank';

const columns: ColumnDef<InterbankRelationship, unknown>[] = [
  {
    accessorKey: 'relationshipCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.relationshipCode}</span>,
  },
  {
    accessorKey: 'bankName',
    header: 'Counterparty Bank',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.bankName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.original.bicCode}</p>
      </div>
    ),
  },
  {
    accessorKey: 'relationshipType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.relationshipType} />,
  },
  {
    accessorKey: 'creditLineAmount',
    header: 'Credit Line',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.creditLineAmount)}</span>,
  },
  {
    accessorKey: 'creditLineUsed',
    header: 'Used',
    cell: ({ row }) => {
      const pct = row.original.creditLineAmount > 0 ? (row.original.creditLineUsed / row.original.creditLineAmount) * 100 : 0;
      return (
        <div className="space-y-1">
          <span className="font-mono text-sm">{formatMoney(row.original.creditLineUsed)}</span>
          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'agreementDate',
    header: 'Agreement',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.agreementDate)}</span>,
  },
  {
    accessorKey: 'reviewDate',
    header: 'Review Due',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.reviewDate)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

interface Props {
  relationships: InterbankRelationship[];
  isLoading?: boolean;
}

export function RelationshipTable({ relationships, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={relationships}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No interbank relationships found"
    />
  );
}
