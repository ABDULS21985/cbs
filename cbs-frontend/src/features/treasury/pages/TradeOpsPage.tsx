import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { mockConfirmations, mockFails } from '../api/mockTreasuryData';
import type { ColumnDef } from '@tanstack/react-table';
import type { TradeConfirmation, SettlementFail } from '../types/treasury';
import { cn } from '@/lib/utils';
import { FileCheck, AlertTriangle, XCircle, Activity } from 'lucide-react';

const confirmCols: ColumnDef<TradeConfirmation, any>[] = [
  { accessorKey: 'confirmRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.confirmRef}</span> },
  { accessorKey: 'counterparty', header: 'Counterparty' },
  { accessorKey: 'instrument', header: 'Instrument' },
  { accessorKey: 'direction', header: 'Side', cell: ({ row }) => <span className={cn('text-xs font-bold', row.original.direction === 'BUY' ? 'text-green-600' : 'text-red-600')}>{row.original.direction}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{row.original.amount.toLocaleString()}</span> },
  { accessorKey: 'valueDate', header: 'Value Date', cell: ({ row }) => formatDate(row.original.valueDate) },
  { accessorKey: 'matchStatus', header: 'Match', cell: ({ row }) => {
    const colors: Record<string, string> = { MATCHED: 'status-success', UNMATCHED: 'status-danger', ALLEGED: 'status-warning' };
    return <span className={cn('status-badge', colors[row.original.matchStatus])}>{row.original.matchStatus}</span>;
  }},
];

const failCols: ColumnDef<SettlementFail, any>[] = [
  { accessorKey: 'failRef', header: 'Fail #', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{row.original.failRef}</span> },
  { accessorKey: 'instrument', header: 'Instrument' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span> },
  { accessorKey: 'counterparty', header: 'Counterparty' },
  { accessorKey: 'failSince', header: 'Fail Since', cell: ({ row }) => formatDate(row.original.failSince) },
  { accessorKey: 'agingDays', header: 'Days', cell: ({ row }) => <span className={cn('font-mono text-sm font-bold', row.original.agingDays > 5 ? 'text-red-600' : 'text-amber-600')}>{row.original.agingDays}</span> },
  { accessorKey: 'penaltyAccrued', header: 'Penalty', cell: ({ row }) => <span className="font-mono text-sm text-red-600">{formatMoney(row.original.penaltyAccrued)}</span> },
  { accessorKey: 'escalation', header: 'Escalation' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const pendingConfs = mockConfirmations.filter((c) => c.status === 'PENDING').length;
const unmatchedConfs = mockConfirmations.filter((c) => c.matchStatus === 'UNMATCHED').length;

export function TradeOpsPage() {
  return (
    <>
      <PageHeader title="Trade Operations" subtitle="Post-trade operations — confirmations, settlement, fails management" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Confirmations" value={pendingConfs} format="number" icon={FileCheck} />
          <StatCard label="Unmatched" value={unmatchedConfs} format="number" icon={AlertTriangle} />
          <StatCard label="Failed Settlements" value={mockFails.length} format="number" icon={XCircle} />
          <StatCard label="Clearing Today" value={234} format="number" icon={Activity} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'confirmations', label: 'Confirmations', badge: pendingConfs, content: (
            <div className="p-4"><DataTable columns={confirmCols} data={mockConfirmations} enableGlobalFilter /></div>
          )},
          { id: 'fails', label: 'Fails', badge: mockFails.length, content: (
            <div className="p-4"><DataTable columns={failCols} data={mockFails} enableGlobalFilter enableExport exportFilename="settlement-fails" /></div>
          )},
          { id: 'settlement', label: 'Settlement', content: <div className="p-8 text-center text-muted-foreground">Settlement instruction tracking coming soon</div> },
          { id: 'clearing', label: 'Clearing', content: <div className="p-8 text-center text-muted-foreground">Clearing submissions coming soon</div> },
        ]} />
      </div>
    </>
  );
}
