import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, InfoGrid, DataTable } from '@/components/shared';
import { formatDate, formatRelative, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Wifi, WifiOff, Clock, Send, Monitor, Settings,
  Cpu, CreditCard, Smartphone, Fingerprint, QrCode, BarChart3, Check, X,
} from 'lucide-react';
import { posTerminalsApi } from '../api/posTerminalApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { cardKeys } from '../hooks/useCardData';
import { useUpdatePosTerminalStatus } from '../hooks/useCardsExt';
import { getStatus } from '../components/TerminalHealthMonitor';
import type { PosTerminal } from '../types/posTerminal';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

const TERMINAL_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TAMPERED', 'DECOMMISSIONED'] as const;

function CapBadge({ supported, label }: { supported: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      supported
        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    )}>
      {supported ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  );
}

const txnCols: ColumnDef<CardSwitchTransaction, any>[] = [
  { accessorKey: 'switchRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.switchRef}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'cardScheme', header: 'Scheme', cell: ({ row }) => <StatusBadge status={row.original.cardScheme} /> },
  { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => <StatusBadge status={row.original.responseCode === '00' ? 'APPROVED' : 'DECLINED'} dot /> },
  { accessorKey: 'authCode', header: 'Auth', cell: ({ row }) => <span className="font-mono text-xs">{row.original.authCode}</span> },
  { accessorKey: 'posEntryMode', header: 'Entry Mode', cell: ({ row }) => <span className="text-xs">{row.original.posEntryMode}</span> },
  { accessorKey: 'fraudScore', header: 'Fraud', cell: ({ row }) => <span className={cn('text-xs tabular-nums', row.original.fraudScore > 70 ? 'text-red-600 font-bold' : '')}>{row.original.fraudScore}</span> },
  { accessorKey: 'processedAt', header: 'Time', cell: ({ row }) => <span className="text-xs tabular-nums">{formatRelative(row.original.processedAt)}</span> },
];

export function TerminalDetailPage() {
  const { terminalId = '' } = useParams<{ terminalId: string }>();
  const qc = useQueryClient();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: terminal, isLoading } = useQuery({
    queryKey: ['pos-terminals', 'detail', terminalId],
    queryFn: () => posTerminalsApi.getById(terminalId),
    enabled: !!terminalId,
    refetchInterval: 30_000,
  });

  // Transaction history for this terminal — filter by merchant to reduce payload
  const merchantId = terminal?.merchantId;
  const { data: merchantTxns = [], isLoading: txnLoading } = useQuery({
    queryKey: ['card-switch', 'merchant', merchantId, 'terminal', terminalId],
    queryFn: () => cardSwitchApi.getByMerchant(merchantId!),
    enabled: !!merchantId,
  });
  const terminalTxns = merchantTxns.filter((t) => t.terminalId === terminalId);

  const sendHeartbeat = useMutation({
    mutationFn: () =>
      posTerminalsApi.heartbeat(terminalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      toast.success('Heartbeat sent');
    },
    onError: () => toast.error('Failed to send heartbeat'),
  });

  const updateStatus = useUpdatePosTerminalStatus();

  const handleStatusChange = (newStatus: string) => {
    setShowStatusMenu(false);
    updateStatus.mutate(
      { terminalId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Terminal status updated to ${newStatus}`);
          qc.invalidateQueries({ queryKey: ['pos-terminals'] });
        },
        onError: () => toast.error('Failed to update terminal status'),
      },
    );
  };

  if (isLoading || !terminal) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/cards/pos" />
        <div className="page-container">
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </div>
      </>
    );
  }

  const status = getStatus(terminal);
  const StatusIcon = status === 'online' ? Wifi : status === 'idle' ? Clock : WifiOff;
  const statusColor = status === 'online' ? 'text-green-500' : status === 'idle' ? 'text-amber-500' : 'text-red-500';

  const infoItems = [
    { label: 'Terminal ID', value: terminal.terminalId },
    { label: 'Type', value: terminal.terminalType },
    { label: 'Merchant', value: terminal.merchantName },
    { label: 'Merchant ID', value: terminal.merchantId },
    { label: 'Location', value: terminal.locationAddress },
    { label: 'MCC', value: terminal.merchantCategoryCode },
    { label: 'Acquiring Bank', value: terminal.acquiringBankCode },
    { label: 'Settlement Account', value: String(terminal.settlementAccountId) },
    { label: 'Batch Settlement', value: terminal.batchSettlementTime },
    { label: 'Max Txn Amount', value: formatMoney(terminal.maxTransactionAmount) },
    { label: 'Software Version', value: terminal.softwareVersion || '--' },
    { label: 'Last Heartbeat', value: terminal.lastHeartbeatAt ? formatRelative(terminal.lastHeartbeatAt) : 'Never' },
    { label: 'Last Transaction', value: terminal.lastTransactionAt ? formatRelative(terminal.lastTransactionAt) : 'Never' },
    { label: 'Deployed', value: terminal.createdAt ? formatDate(terminal.createdAt) : '--' },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {terminal.terminalId}
            <span className={cn('flex items-center gap-1', statusColor)}>
              <StatusIcon className={cn('w-4 h-4', status === 'online' && 'animate-pulse')} />
              <span className="text-xs font-medium uppercase">{status}</span>
            </span>
          </span>
        }
        subtitle={`${terminal.merchantName} — ${terminal.terminalType} — ${terminal.locationAddress}`}
        backTo="/cards/pos"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu((v) => !v)}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <Settings className="w-4 h-4" />
                {updateStatus.isPending ? 'Updating...' : 'Change Status'}
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-background shadow-lg py-1">
                  {TERMINAL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={terminal.operationalStatus === s}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-muted disabled:opacity-30',
                        terminal.operationalStatus === s && 'font-bold',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => sendHeartbeat.mutate()}
              disabled={sendHeartbeat.isPending}
              className="flex items-center gap-2 btn-primary"
            >
              <Send className="w-4 h-4" />
              {sendHeartbeat.isPending ? 'Sending...' : 'Send Heartbeat'}
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Txns Today" value={terminal.transactionsToday} format="number" icon={BarChart3} />
          <StatCard label="Status" value={status.toUpperCase()} icon={Monitor} />
          <StatCard label="SW Version" value={terminal.softwareVersion || '--'} icon={Cpu} />
          <StatCard label="Max Txn" value={terminal.maxTransactionAmount} format="money" compact icon={CreditCard} />
        </div>

        {/* Capabilities */}
        <div className="surface-card p-4">
          <p className="text-sm font-medium mb-3">Capabilities</p>
          <div className="flex flex-wrap gap-2">
            <CapBadge supported={terminal.supportsChip} label="Chip" />
            <CapBadge supported={terminal.supportsContactless} label="Contactless" />
            <CapBadge supported={terminal.supportsMagstripe} label="Magstripe" />
            <CapBadge supported={terminal.supportsPin} label="PIN" />
            <CapBadge supported={terminal.supportsQr} label="QR" />
          </div>
        </div>

        {/* Terminal Info */}
        <div className="surface-card p-4">
          <p className="text-sm font-medium mb-3">Terminal Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {infoItems.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="surface-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">Transaction History</p>
          </div>
          <div className="p-4">
            <DataTable
              columns={txnCols}
              data={terminalTxns}
              isLoading={txnLoading}
              enableGlobalFilter
              emptyMessage="No transactions for this terminal"
            />
          </div>
        </div>
      </div>
    </>
  );
}
