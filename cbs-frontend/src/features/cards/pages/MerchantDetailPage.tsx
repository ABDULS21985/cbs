import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store, TrendingUp, AlertTriangle, CreditCard, Loader2,
  ShieldAlert, Settings, X, Terminal, Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { cardApi } from '../api/cardApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { posTerminalApi } from '../api/posTerminalApi';
import { cardsApi } from '../api/cardExtApi';
import type { Merchant } from '../types/card';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import type { PosTerminal } from '../types/posTerminal';
import type { CardDispute } from '../types/cardExt';
import { useSwitchByMerchant, usePosTerminalsByMerchant } from '../hooks/useCardsExt';

// ─── Transaction Columns ────────────────────────────────────────────────────

const txnCols: ColumnDef<CardSwitchTransaction, unknown>[] = [
  { accessorKey: 'transactionDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.transactionDate)}</span> },
  { accessorKey: 'cardNumberMasked', header: 'Card', cell: ({ row }) => <span className="font-mono text-xs">{row.original.cardNumberMasked}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currencyCode)}</span> },
  { accessorKey: 'authCode', header: 'Auth Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.authCode}</span> },
  { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => <StatusBadge status={row.original.responseCode === '00' ? 'APPROVED' : 'DECLINED'} /> },
  { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
];

// ─── Terminal Columns ────────────────────────────────────────────────────────

const terminalCols: ColumnDef<PosTerminal, unknown>[] = [
  { accessorKey: 'terminalId', header: 'Terminal ID', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.terminalId}</span> },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'model', header: 'Model' },
  { accessorKey: 'softwareVersion', header: 'SW Version', cell: ({ row }) => <span className="text-xs font-mono">{(row.original as Record<string, unknown>).softwareVersion as string ?? '—'}</span> },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status ?? (row.original as Record<string, unknown>).onlineStatus as string;
      return <StatusBadge status={status ?? 'UNKNOWN'} dot />;
    },
  },
  { accessorKey: 'lastHeartbeat', header: 'Last Heartbeat', cell: ({ row }) => <span className="text-xs">{(row.original as Record<string, unknown>).lastHeartbeat ? formatDate((row.original as Record<string, unknown>).lastHeartbeat as string) : '—'}</span> },
];

// ─── Dispute Columns ────────────────────────────────────────────────────────

const disputeCols: ColumnDef<CardDispute, unknown>[] = [
  { accessorKey: 'disputeRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.disputeRef}</span> },
  { accessorKey: 'disputeReason', header: 'Reason', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.disputeReason}</span> },
  { accessorKey: 'disputeAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.disputeAmount, row.original.disputeCurrency)}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'createdAt', header: 'Filed', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span> },
];

// ─── Suspend Confirm Dialog ─────────────────────────────────────────────────

function SuspendDialog({ merchant, onClose }: { merchant: Merchant; onClose: () => void }) {
  const handleConfirm = () => {
    toast.success(`Merchant ${merchant.merchantName} suspended`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold">Suspend Merchant?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This will suspend <strong>{merchant.merchantName}</strong> (MID: {merchant.merchantId}).
          All transactions will be declined.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Suspend</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams<{ merchantId: string }>();
  const id = parseInt(merchantId, 10);
  useEffect(() => { document.title = `Merchant ${merchantId} | CBS`; }, [merchantId]);

  const [showSuspend, setShowSuspend] = useState(false);

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchants', 'detail', id],
    queryFn: () => cardApi.getMerchant(id),
    enabled: id > 0,
  });

  const { data: transactions = [], isLoading: txnLoading } = useSwitchByMerchant(merchantId);
  const { data: terminals = [], isLoading: terminalsLoading } = usePosTerminalsByMerchant(merchantId);

  // Disputes for this merchant are fetched from all disputes then filtered
  const { data: allDisputes = [] } = useQuery({
    queryKey: ['card-disputes', 'merchant', merchantId],
    queryFn: () => cardsApi.getByStatus('OPEN'),
    enabled: !!merchantId,
  });
  const merchantDisputes = allDisputes.filter((d) => String(d.merchantId) === merchantId);

  const riskColors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600', PROHIBITED: 'text-red-800' };

  if (merchantLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/cards/merchants" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!merchant) {
    return (
      <>
        <PageHeader title="Merchant Not Found" backTo="/cards/merchants" />
        <div className="page-container">
          <EmptyState title="Merchant not found" description={`No merchant found with ID "${merchantId}".`} />
        </div>
      </>
    );
  }

  const avgTicket = transactions.length > 0
    ? transactions.reduce((s, t) => s + t.amount, 0) / transactions.length
    : 0;

  const approvedCount = transactions.filter((t) => t.responseCode === '00').length;
  const approvalRate = transactions.length > 0 ? (approvedCount / transactions.length) * 100 : 0;

  const tabs = [
    {
      id: 'transactions',
      label: 'Transactions',
      badge: transactions.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={txnCols} data={transactions} isLoading={txnLoading} enableGlobalFilter enableExport exportFilename={`merchant-${merchantId}-txns`} emptyMessage="No transactions found" />
        </div>
      ),
    },
    {
      id: 'terminals',
      label: 'Terminals',
      badge: terminals.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={terminalCols} data={terminals} isLoading={terminalsLoading} enableGlobalFilter emptyMessage="No terminals deployed" />
        </div>
      ),
    },
    {
      id: 'chargebacks',
      label: 'Chargebacks',
      badge: merchantDisputes.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={disputeCols} data={merchantDisputes} enableGlobalFilter emptyMessage="No disputes for this merchant" />
        </div>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      content: (
        <div className="p-6 space-y-6">
          <div className="rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-4">Merchant Configuration</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">MDR Rate</p><p className="font-mono font-bold text-lg">{formatPercent(merchant.mdrRate)}</p></div>
              <div><p className="text-xs text-muted-foreground">Chargeback Rate</p><p className={cn('font-mono font-bold text-lg', merchant.chargebackRate > 1 ? 'text-red-600' : '')}>{formatPercent(merchant.chargebackRate)}</p></div>
              <div><p className="text-xs text-muted-foreground">Risk Category</p><p className={cn('font-bold text-lg', riskColors[merchant.riskCategory])}>{merchant.riskCategory}</p></div>
              <div><p className="text-xs text-muted-foreground">Terminal Count</p><p className="font-bold text-lg">{merchant.terminalCount}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={merchant.status} dot /></div>
              <div><p className="text-xs text-muted-foreground">Onboarded</p><p className="font-medium">{formatDate(merchant.onboardedDate)}</p></div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showSuspend && <SuspendDialog merchant={merchant} onClose={() => setShowSuspend(false)} />}

      <PageHeader
        title={merchant.merchantName}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{merchant.merchantId}</span>
            <StatusBadge status={merchant.status} dot />
            <span className={cn('text-xs font-bold', riskColors[merchant.riskCategory])}>{merchant.riskCategory} RISK</span>
          </span>
        }
        backTo="/cards/merchants"
        actions={
          merchant.status === 'ACTIVE' ? (
            <button onClick={() => setShowSuspend(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              <ShieldAlert className="w-4 h-4" /> Suspend Merchant
            </button>
          ) : undefined
        }
      />

      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Monthly Volume" value={merchant.monthlyVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="Terminals" value={merchant.terminalCount} format="number" icon={Terminal} />
          <StatCard label="Avg Ticket" value={avgTicket} format="money" compact icon={CreditCard} />
          <StatCard label="Chargeback %" value={merchant.chargebackRate} format="percent" icon={AlertTriangle} />
          <StatCard label="Approval Rate" value={approvalRate} format="percent" icon={Store} />
        </div>

        {/* Merchant info */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Business Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">MCC</p><p className="font-medium">{merchant.mcc}</p></div>
            <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{merchant.mccDescription}</p></div>
            <div><p className="text-xs text-muted-foreground">Onboarded</p><p className="font-medium">{formatDate(merchant.onboardedDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">MDR</p><p className="font-mono font-medium">{formatPercent(merchant.mdrRate)}</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
