import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { RecoveryRecord } from '../../types/collections';

interface RecoveryTrackingTableProps {
  data?: RecoveryRecord[];
  isLoading?: boolean;
}

const columns: ColumnDef<RecoveryRecord>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>
    ),
  },
  {
    accessorKey: 'writtenOff',
    header: 'Written Off',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.writtenOff)}</span>
    ),
  },
  {
    accessorKey: 'writeOffDate',
    header: 'Write-Off Date',
    cell: ({ row }) => formatDate(row.original.writeOffDate),
  },
  {
    accessorKey: 'recovered',
    header: 'Recovered',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-green-600 font-semibold">{formatMoney(row.original.recovered)}</span>
    ),
  },
  {
    accessorKey: 'recoveryPct',
    header: 'Recovery %',
    cell: ({ row }) => {
      const pct = Math.min(row.original.recoveryPct, 100);
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground w-10">{pct.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'lastRecovery',
    header: 'Last Recovery',
    cell: ({ row }) => row.original.lastRecovery
      ? formatDate(row.original.lastRecovery)
      : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'agent',
    header: 'Agent',
    cell: ({ row }) => row.original.agent ?? <span className="text-muted-foreground">—</span>,
  },
];

export function RecoveryTrackingTable({ data = [], isLoading }: RecoveryTrackingTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableExport
      exportFilename="recovery-tracking"
      emptyMessage="No recovery records found"
      pageSize={15}
    />
  );
}
