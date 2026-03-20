import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { SettlementInstruction } from '../../api/settlementApi';

const matchColors: Record<string, string> = {
  MATCHED: 'text-green-600',
  UNMATCHED: 'text-red-600',
  ALLEGED: 'text-amber-600',
};

interface InstructionTableProps {
  data: SettlementInstruction[];
  isLoading: boolean;
  onMatch?: (instruction: SettlementInstruction) => void;
  onSubmit?: (instruction: SettlementInstruction) => void;
  onRecordResult?: (instruction: SettlementInstruction) => void;
}

export function InstructionTable({ data, isLoading, onMatch, onSubmit, onRecordResult }: InstructionTableProps) {
  const columns: ColumnDef<SettlementInstruction, any>[] = [
    {
      accessorKey: 'ref',
      header: 'Ref',
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.ref}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-muted">{row.original.type}</span>
      ),
    },
    {
      accessorKey: 'instrumentCode',
      header: 'Instrument',
      cell: ({ row }) => (
        <div>
          <span className="text-sm font-medium">{row.original.instrumentCode}</span>
          {row.original.instrumentName && (
            <span className="block text-xs text-muted-foreground">{row.original.instrumentName}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'counterpartyName',
      header: 'Counterparty',
      cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName}</span>,
    },
    {
      accessorKey: 'settlementDate',
      header: 'Settle Date',
      cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.settlementDate)}</span>,
    },
    {
      accessorKey: 'matchStatus',
      header: 'Match',
      cell: ({ row }) => (
        <span className={cn('text-xs font-semibold', matchColors[row.original.matchStatus])}>
          {row.original.matchStatus}
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
        return (
          <div className="flex items-center gap-1">
            {s.status === 'PENDING' && s.matchStatus === 'UNMATCHED' && onMatch && (
              <button
                onClick={() => onMatch(s)}
                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              >
                Match
              </button>
            )}
            {s.status === 'MATCHED' && onSubmit && (
              <button
                onClick={() => onSubmit(s)}
                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
              >
                Submit
              </button>
            )}
            {s.status === 'SUBMITTED' && onRecordResult && (
              <button
                onClick={() => onRecordResult(s)}
                className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
              >
                Result
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
      emptyMessage="No settlement instructions"
    />
  );
}
