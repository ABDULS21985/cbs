import { type ColumnDef } from '@tanstack/react-table';
import { RotateCcw, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { StandingOrderExecution } from '../../api/standingOrderApi';

function buildColumns(onRetry?: (id: number) => void, retryingId?: number): ColumnDef<StandingOrderExecution, any>[] {
  return [
    { accessorKey: 'executionNumber', header: '#' },
    { accessorKey: 'executionDate', header: 'Date', cell: ({ row }) => formatDate(row.original.executionDate) },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.amount, 'NGN')}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'transactionRef', header: 'Reference', cell: ({ row }) => row.original.transactionRef ? <span className="font-mono text-xs">{row.original.transactionRef}</span> : '—' },
    {
      accessorKey: 'failureReason',
      header: 'Failure Reason',
      cell: ({ row }) => {
        if (row.original.status !== 'FAILED') return '—';
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">{row.original.failureReason || 'Unknown error'}</span>
            {onRetry && (
              <button
                onClick={() => onRetry(row.original.id)}
                disabled={retryingId === row.original.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
              >
                {retryingId === row.original.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                Retry
              </button>
            )}
          </div>
        );
      },
    },
  ];
}

interface Props {
  executions: StandingOrderExecution[];
  isLoading?: boolean;
  onRetry?: (executionId: number) => void;
  retryingId?: number;
}

export function ExecutionHistoryTable({ executions, isLoading, onRetry, retryingId }: Props) {
  const columns = buildColumns(onRetry, retryingId);
  return <DataTable columns={columns} data={executions} isLoading={isLoading} emptyMessage="No executions yet" pageSize={10} />;
}
