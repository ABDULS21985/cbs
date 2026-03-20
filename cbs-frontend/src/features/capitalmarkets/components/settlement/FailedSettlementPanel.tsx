import { cn } from '@/lib/utils';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { FailedSettlement } from '../../api/settlementApi';

interface FailedSettlementPanelProps {
  data: FailedSettlement[];
  isLoading: boolean;
  onResubmit?: (item: FailedSettlement) => void;
  onCancel?: (item: FailedSettlement) => void;
  onEscalate?: (item: FailedSettlement) => void;
}

function agingColor(days: number): string {
  if (days > 7) return 'text-red-600 font-bold';
  if (days >= 3) return 'text-orange-600 font-semibold';
  return 'text-amber-600';
}

export function FailedSettlementPanel({ data, isLoading, onResubmit, onCancel, onEscalate }: FailedSettlementPanelProps) {
  const columns: ColumnDef<FailedSettlement, any>[] = [
    {
      accessorKey: 'instructionRef',
      header: 'Instruction',
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.instructionRef}</span>,
    },
    {
      accessorKey: 'instrumentCode',
      header: 'Instrument',
      cell: ({ row }) => (
        <div>
          <span className="text-sm font-medium">{row.original.instrumentCode}</span>
          <span className="block text-xs text-muted-foreground">{row.original.instrumentName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'counterpartyName',
      header: 'Counterparty',
      cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName}</span>,
    },
    {
      accessorKey: 'failReason',
      header: 'Fail Reason',
      cell: ({ row }) => <span className="text-xs text-red-600">{row.original.failReason}</span>,
    },
    {
      accessorKey: 'agingDays',
      header: 'Aging',
      cell: ({ row }) => (
        <span className={cn('text-sm tabular-nums', agingColor(row.original.agingDays))}>
          {row.original.agingDays}d
        </span>
      ),
    },
    {
      accessorKey: 'settlementAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{formatMoney(row.original.settlementAmount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'penaltyAccrued',
      header: 'Penalty',
      cell: ({ row }) => (
        <span className={cn('text-sm tabular-nums', row.original.penaltyAccrued > 0 && 'text-red-600 font-medium')}>
          {row.original.penaltyAccrued > 0 ? formatMoney(row.original.penaltyAccrued, row.original.currency) : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const s = row.original;
        if (s.status !== 'FAILED') return null;
        return (
          <div className="flex items-center gap-1">
            {onResubmit && (
              <button
                onClick={() => onResubmit(s)}
                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              >
                Resubmit
              </button>
            )}
            {onEscalate && (
              <button
                onClick={() => onEscalate(s)}
                className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Escalate
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => onCancel(s)}
                className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
              >
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No failed settlements"
    />
  );
}
