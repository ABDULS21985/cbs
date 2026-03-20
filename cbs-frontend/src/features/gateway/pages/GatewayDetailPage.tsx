import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatRelative, formatDate } from '@/lib/formatters';
import {
  Wifi, WifiOff, AlertTriangle, Shield, Send, Clock,
  Loader2, Copy, Check, X, BarChart3,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { gatewayApi, type GatewayStatus } from '../api/gatewayApi';
import { financialGatewayApi } from '../api/financialGatewayApi';
import type { GatewayMessage, FinancialGateway } from '../types/financialGateway';
import { toast } from 'sonner';

const statusColors: Record<string, { bg: string; icon: typeof Wifi }> = {
  ONLINE: { bg: 'text-green-500', icon: Wifi },
  CONNECTED: { bg: 'text-green-500', icon: Wifi },
  DEGRADED: { bg: 'text-amber-500', icon: AlertTriangle },
  OFFLINE: { bg: 'text-red-500', icon: WifiOff },
  DISCONNECTED: { bg: 'text-red-500', icon: WifiOff },
};

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors" title="Copy">
      {text}{copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-40" />}
    </button>
  );
}

// ── Ack/Nack Dialog ──────────────────────────────────────────────────────────

function AckDialog({ messageRef, type, onClose }: { messageRef: string; type: 'ack' | 'nack'; onClose: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const mutation = useMutation({
    mutationFn: () => type === 'ack' ? financialGatewayApi.ack(messageRef) : financialGatewayApi.ack2(messageRef),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway'] }); toast.success(type === 'ack' ? 'Acknowledged' : 'NACKed'); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">{type === 'ack' ? 'Acknowledge' : 'NACK'} Message</h2>
        <p className="text-xs text-muted-foreground mb-3 font-mono">{messageRef}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{type === 'ack' ? 'ACK Reference' : 'NACK Reason'}</label>
            <input className="w-full mt-1 input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'ack' ? 'Reference...' : 'Reason...'} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className={cn('btn-primary', type === 'nack' && 'bg-red-600 hover:bg-red-700')}>
              {mutation.isPending ? 'Processing...' : type === 'ack' ? 'Acknowledge' : 'NACK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function GatewayDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [ackTarget, setAckTarget] = useState<{ ref: string; type: 'ack' | 'nack' } | null>(null);

  const { data: allGateways = [], isLoading } = useQuery({
    queryKey: ['gateway', 'status'],
    queryFn: () => gatewayApi.getGatewayStatus(),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const gateway = allGateways.find((g) => g.name === id || g.name.toLowerCase().replace(/\s/g, '-') === id);

  const { data: queuedMessages = [] } = useQuery({
    queryKey: ['gateway', 'financial', 'queued', id],
    queryFn: () => financialGatewayApi.queued(parseInt(id) || 1),
    enabled: !!id,
    staleTime: 10_000,
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/operations/gateway" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!gateway) {
    return (
      <>
        <PageHeader title="Gateway Not Found" backTo="/operations/gateway" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No gateway found with ID "{id}"</p>
        </div>
      </>
    );
  }

  const { icon: StatusIcon, bg: statusColor } = statusColors[gateway.status] || statusColors.OFFLINE;
  const volumePct = gateway.todayMessages > 0 ? Math.min((gateway.todayMessages / 10000) * 100, 100) : 0;

  const msgCols: ColumnDef<GatewayMessage, any>[] = [
    { accessorKey: 'messageRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.messageRef}</span> },
    { accessorKey: 'direction', header: 'Direction', cell: ({ row }) => <StatusBadge status={row.original.direction} /> },
    { accessorKey: 'messageType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.messageType}</span> },
    { accessorKey: 'senderBic', header: 'Sender', cell: ({ row }) => <span className="font-mono text-xs">{row.original.senderBic}</span> },
    { accessorKey: 'receiverBic', header: 'Receiver', cell: ({ row }) => <span className="font-mono text-xs">{row.original.receiverBic}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.amount, row.original.currency)}</span> },
    { accessorKey: 'validationStatus', header: 'Validation', cell: ({ row }) => <StatusBadge status={row.original.validationStatus} dot /> },
    { accessorKey: 'sanctionsResult', header: 'Sanctions', cell: ({ row }) => <StatusBadge status={row.original.sanctionsResult} dot /> },
    { accessorKey: 'deliveryStatus', header: 'Delivery', cell: ({ row }) => <StatusBadge status={row.original.deliveryStatus} dot /> },
    { accessorKey: 'queuedAt', header: 'Queued', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.queuedAt ? formatRelative(row.original.queuedAt) : '--'}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center gap-1">
            {m.deliveryStatus === 'QUEUED' && <button onClick={() => toast.info('Sending...')} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"><Send className="w-3 h-3" /></button>}
            {m.deliveryStatus === 'SENT' && (
              <>
                <button onClick={() => setAckTarget({ ref: m.messageRef, type: 'ack' })} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">ACK</button>
                <button onClick={() => setAckTarget({ ref: m.messageRef, type: 'nack' })} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">NACK</button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {gateway.name}
            <span className={cn('flex items-center gap-1.5', statusColor)}>
              <StatusIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{gateway.status}</span>
            </span>
          </span>
        }
        backTo="/operations/gateway"
      />
      <div className="page-container space-y-6">
        {/* Health Card */}
        <div className={cn('rounded-xl border-2 p-6', gateway.status === 'ONLINE' ? 'border-green-200 dark:border-green-800' : gateway.status === 'DEGRADED' ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800')}>
          <div className="flex items-center gap-6">
            <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', gateway.status === 'ONLINE' ? 'bg-green-100 dark:bg-green-900/30' : gateway.status === 'DEGRADED' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
              <StatusIcon className={cn('w-8 h-8', statusColor)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', statusColor)}>{gateway.status}</p>
              <p className="text-sm text-muted-foreground">Latency: {gateway.latencyMs}ms | Errors today: {gateway.errors}</p>
              <p className="text-xs text-muted-foreground">Last message: {gateway.lastMessageAt ? formatRelative(gateway.lastMessageAt) : 'Never'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Messages Today" value={gateway.todayMessages} format="number" icon={BarChart3} />
          <StatCard label="Errors" value={gateway.errors} format="number" icon={AlertTriangle} />
          <StatCard label="Latency" value={`${gateway.latencyMs}ms`} icon={Clock} />
          <StatCard label="Queued" value={queuedMessages.length} format="number" icon={Send} />
        </div>

        {/* Volume Progress */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Daily Volume</p>
            <span className="text-xs text-muted-foreground tabular-nums">{gateway.todayMessages.toLocaleString()} messages today</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', volumePct >= 95 ? 'bg-red-500' : volumePct >= 80 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${volumePct}%` }} />
          </div>
        </div>

        {/* Queued Messages */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="text-sm font-medium">Queued Messages ({queuedMessages.length})</p>
          </div>
          <div className="p-4">
            <DataTable columns={msgCols} data={queuedMessages} enableGlobalFilter emptyMessage="No queued messages" />
          </div>
        </div>
      </div>

      {ackTarget && <AckDialog messageRef={ackTarget.ref} type={ackTarget.type} onClose={() => setAckTarget(null)} />}
    </>
  );
}
