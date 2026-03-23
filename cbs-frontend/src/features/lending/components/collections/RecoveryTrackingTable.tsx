import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
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
      <span className="font-mono text-sm font-semibold text-emerald-600">{formatMoney(row.original.recovered)}</span>
    ),
  },
  {
    accessorKey: 'recoveryPct',
    header: 'Recovery %',
    cell: ({ row }) => {
      const pct = Math.min(row.original.recoveryPct, 100);
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-10 text-xs font-semibold text-muted-foreground">{pct.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'lastRecovery',
    header: 'Last Recovery',
    cell: ({ row }) =>
      row.original.lastRecovery ? formatDate(row.original.lastRecovery) : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'agent',
    header: 'Agent',
    cell: ({ row }) => row.original.agent ?? <span className="text-muted-foreground">—</span>,
  },
];

export function RecoveryTrackingTable({ data = [], isLoading }: RecoveryTrackingTableProps) {
  const writtenOffTotal = data.reduce((sum, item) => sum + (item.writtenOff || 0), 0);
  const recoveredTotal = data.reduce((sum, item) => sum + (item.recovered || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Post Write-Off Tracking</p>
          <h3 className="mt-2 text-lg font-semibold">Recovery Tracking</h3>
          <p className="mt-1 text-sm text-muted-foreground">Monitor recoveries on written-off exposures and the latest servicing owner.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="lending-hero-chip">{formatMoney(recoveredTotal)} recovered</div>
          <div className="lending-hero-chip">{formatMoney(writtenOffTotal)} written off</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableExport
        exportFilename="recovery-tracking"
        emptyMessage="No recovery records found"
        pageSize={15}
      />
    </div>
  );
}
