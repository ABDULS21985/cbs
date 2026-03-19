import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { StandingOrderExecution } from '../../api/standingOrderApi';

const columns: ColumnDef<StandingOrderExecution, any>[] = [
  { accessorKey: 'executionNumber', header: '#' },
  { accessorKey: 'executionDate', header: 'Date', cell: ({ row }) => formatDate(row.original.executionDate) },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.amount, 'NGN')}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'transactionRef', header: 'Reference', cell: ({ row }) => row.original.transactionRef ? <span className="font-mono text-xs">{row.original.transactionRef}</span> : '—' },
  { accessorKey: 'failureReason', header: 'Failure Reason', cell: ({ row }) => row.original.failureReason ? <span className="text-xs text-red-600">{row.original.failureReason}</span> : '—' },
];

interface Props {
  executions: StandingOrderExecution[];
  isLoading?: boolean;
}

export function ExecutionHistoryTable({ executions, isLoading }: Props) {
  return <DataTable columns={columns} data={executions} isLoading={isLoading} emptyMessage="No executions yet" pageSize={10} />;
}
