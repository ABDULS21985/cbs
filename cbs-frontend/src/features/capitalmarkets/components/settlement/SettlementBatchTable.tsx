import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { SettlementBatch } from '../../api/settlementApi';

const columns: ColumnDef<SettlementBatch, any>[] = [
  {
    accessorKey: 'batchRef',
    header: 'Batch Ref',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.batchRef}</span>,
  },
  {
    accessorKey: 'depository',
    header: 'Depository',
    cell: ({ row }) => <span className="text-sm">{row.original.depository}</span>,
  },
  {
    accessorKey: 'batchDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.batchDate)}</span>,
  },
  {
    accessorKey: 'instructionCount',
    header: 'Instructions',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.instructionCount}</span>,
  },
  {
    accessorKey: 'netAmount',
    header: 'Net Amount',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.netAmount, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      const stages = ['PREPARING', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED'];
      const idx = stages.indexOf(s);
      const pct = s === 'COMPLETED' ? 100 : Math.round(((idx + 1) / stages.length) * 100);
      return (
        <div className="flex items-center gap-2">
          <StatusBadge status={s} dot />
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    id: 'results',
    header: 'Results',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-green-600 tabular-nums">{row.original.settledCount} settled</span>
        {row.original.failedCount > 0 && (
          <span className="text-red-600 tabular-nums">{row.original.failedCount} failed</span>
        )}
      </div>
    ),
  },
];

interface SettlementBatchTableProps {
  data: SettlementBatch[];
  isLoading: boolean;
}

export function SettlementBatchTable({ data, isLoading }: SettlementBatchTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No settlement batches"
    />
  );
}
