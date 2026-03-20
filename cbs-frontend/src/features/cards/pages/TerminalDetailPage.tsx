import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, InfoGrid, DataTable } from '@/components/shared';
import { formatDate, formatRelative, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Wifi, WifiOff, Clock, Send, Monitor,
  Cpu, CreditCard, Smartphone, Fingerprint, QrCode, BarChart3, Check, X,
} from 'lucide-react';
import { posTerminalsApi } from '../api/posTerminalApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { cardKeys } from '../hooks/useCardData';
import { getStatus } from '../components/TerminalHealthMonitor';
import type { PosTerminal } from '../types/posTerminal';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

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

  const { data: terminal, isLoading } = useQuery({
    queryKey: ['pos-terminals', 'detail', terminalId],
    queryFn: () => posTerminalsApi.getById(terminalId),
    enabled: !!terminalId,
    refetchInterval: 30_000,
  });

  // Transaction history for this terminal
  const { data: allTxns = [], isLoading: txnLoading } = useQuery({
    queryKey: ['card-switch', 'terminal', terminalId],
    queryFn: () => cardSwitchApi.getByScheme('ALL'),
    enabled: !!terminalId,
  });
  const terminalTxns = allTxns.filter((t) => t.terminalId === terminalId);

  const sendHeartbeat = useMutation({
    mutationFn: () =>
      posTerminalsApi.heartbeat({
        terminalId,
        status: 'ONLINE',
        softwareVersion: terminal?.softwareVersion ?? '1.0.0',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      toast.success('Heartbeat sent');
    },
  });

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
          <button
            onClick={() => sendHeartbeat.mutate()}
            disabled={sendHeartbeat.isPending}
            className="flex items-center gap-2 btn-primary"
          >
            <Send className="w-4 h-4" />
            {sendHeartbeat.isPending ? 'Sending...' : 'Send Heartbeat'}
          </button>
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
        <div className="rounded-xl border bg-card p-4">
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
        <div className="rounded-xl border bg-card p-4">
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
        <div className="rounded-xl border bg-card overflow-hidden">
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
