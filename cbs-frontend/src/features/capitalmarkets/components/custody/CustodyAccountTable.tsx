import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { CustodyAccount } from '../../api/custodyApi';

const columns: ColumnDef<CustodyAccount, any>[] = [
  {
    accessorKey: 'code',
    header: 'Account Code',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.customerName}</span>,
  },
  {
    accessorKey: 'accountType',
    header: 'Account Type',
    cell: ({ row }) => (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-muted">
        {row.original.accountType}
      </span>
    ),
  },
  {
    accessorKey: 'totalAssets',
    header: 'Total Assets',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">
        {formatMoney(row.original.totalAssets, row.original.baseCurrency)}
      </span>
    ),
  },
  {
    accessorKey: 'securitiesCount',
    header: 'Securities',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.securitiesCount}</span>,
  },
  {
    accessorKey: 'custodian',
    header: 'Custodian',
    cell: ({ row }) => <span className="text-sm">{row.original.custodian}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'openedAt',
    header: 'Opened',
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.original.openedAt)}</span>,
  },
];

interface CustodyAccountTableProps {
  data: CustodyAccount[];
  isLoading: boolean;
  onRowClick?: (account: CustodyAccount) => void;
}

export function CustodyAccountTable({ data, isLoading, onRowClick }: CustodyAccountTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      onRowClick={onRowClick}
      emptyMessage="No custody accounts"
    />
  );
}
