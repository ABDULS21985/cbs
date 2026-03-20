import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { StandingOrder } from '../../api/standingOrderApi';

const columns: ColumnDef<StandingOrder, any>[] = [
  { accessorKey: 'reference', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span> },
  { accessorKey: 'sourceAccountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.sourceAccountNumber}</span> },
  { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-xs">{row.original.frequency.replace(/_/g, ' ')}</span> },
  { accessorKey: 'nextExecution', header: 'Next Execution', cell: ({ row }) => formatDate(row.original.nextExecution) },
  { accessorKey: 'lastExecuted', header: 'Last Executed', cell: ({ row }) => row.original.lastExecuted ? formatDate(row.original.lastExecuted) : '—' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

interface Props {
  data: StandingOrder[];
  isLoading?: boolean;
  onRowClick?: (row: StandingOrder) => void;
}

export function StandingOrderTable({ data, isLoading, onRowClick }: Props) {
  return <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={onRowClick} enableGlobalFilter enableExport exportFilename="standing-orders" emptyMessage="No standing orders found" />;
}
