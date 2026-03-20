import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDateTime, formatRelative } from '@/lib/formatters';
import {
  Loader2, AlertTriangle, RotateCw, X, Shield, CheckCircle, XCircle,
  Copy, Check, Send, Clock,
} from 'lucide-react';
import { gatewayApi, type GatewayMessage } from '../api/gatewayApi';
import { toast } from 'sonner';
import { useState } from 'react';

const LIFECYCLE_STEPS = ['QUEUED', 'VALIDATED', 'SENT', 'ACKNOWLEDGED'];

function LifecycleTracker({ status, sentAt, message }: { status: string; sentAt?: string; message: GatewayMessage }) {
  const stepIndex = LIFECYCLE_STEPS.indexOf(
    status === 'FAILED' ? 'SENT' : status === 'SETTLED' ? 'ACKNOWLEDGED' : status,
  );

  return (
    <div className="flex items-center gap-0 w-full">
      {LIFECYCLE_STEPS.map((step, i) => {
        const isActive = i <= stepIndex;
        const isCurrent = i === stepIndex;
        const isFailed = status === 'FAILED' && isCurrent;
        return (
          <div key={step} className="flex items-center flex-1">
            {i > 0 && <div className={cn('flex-1 h-0.5', isActive ? 'bg-primary' : 'bg-muted')} />}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2',
                isFailed ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/30' :
                isActive ? 'border-primary bg-primary text-primary-foreground' :
                'border-muted bg-background text-muted-foreground',
                isCurrent && !isFailed && 'ring-4 ring-primary/20',
              )}>
                {isFailed ? <XCircle className="w-4 h-4" /> : isActive ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1">{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CodeBlock({ content, language }: { content?: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  if (!content) return <p className="text-sm text-muted-foreground italic">No content</p>;
  return (
    <div className="relative">
      <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-muted hover:bg-muted/80 z-10">
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
      <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap">{content}</pre>
    </div>
  );
}

export function MessageDetailPage() {
  const { ref = '' } = useParams<{ ref: string }>();
  const qc = useQueryClient();

  const { data: message, isLoading } = useQuery({
    queryKey: ['gateway', 'message', ref],
    queryFn: () => gatewayApi.getMessage(ref),
    enabled: !!ref,
  });

  const retryMutation = useMutation({
    mutationFn: () => gatewayApi.retryMessage(ref),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway'] }); toast.success('Message retried'); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => gatewayApi.cancelMessage(ref),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway'] }); toast.success('Message cancelled'); },
  });

  const overrideMutation = useMutation({
    mutationFn: (data: { action: string; notes: string }) => gatewayApi.manualOverride(ref, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway'] }); toast.success('Override applied'); },
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

  if (!message) {
    return (
      <>
        <PageHeader title="Message Not Found" backTo="/operations/gateway" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No message found with reference "{ref}"</p>
        </div>
      </>
    );
  }

  const infoItems = [
    { label: 'Reference', value: message.reference },
    { label: 'Direction', value: message.direction },
    { label: 'Type', value: message.type },
    { label: 'Status', value: message.status },
    { label: 'Counterparty', value: message.counterparty },
    { label: 'Amount', value: message.amount ? formatMoney(message.amount, message.currency) : '--' },
    { label: 'Sent At', value: message.sentAt ? formatDateTime(message.sentAt) : '--' },
    { label: 'Latency', value: message.latencyMs ? `${message.latencyMs}ms` : '--' },
    { label: 'Attempts', value: String(message.attempts ?? 0) },
    { label: 'Last Attempt', value: message.lastAttempt ? formatRelative(message.lastAttempt) : '--' },
    { label: 'Error Code', value: message.errorCode || '--' },
    { label: 'Error', value: message.errorMessage || '--' },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{message.reference}</span>
            <StatusBadge status={message.direction} />
            <StatusBadge status={message.status} dot />
          </span>
        }
        backTo="/operations/gateway"
      />
      <div className="page-container space-y-6">
        {/* Lifecycle Tracker */}
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm font-medium mb-4">Message Lifecycle</p>
          <LifecycleTracker status={message.status} sentAt={message.sentAt} message={message} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {message.status === 'QUEUED' && (
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
          {message.status === 'FAILED' && (
            <>
              <button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                <RotateCw className="w-3.5 h-3.5" /> {retryMutation.isPending ? 'Retrying...' : 'Retry'}
              </button>
              <button onClick={() => overrideMutation.mutate({ action: 'FORCE_ACK', notes: 'Manual override' })} disabled={overrideMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border hover:bg-muted">
                <Shield className="w-3.5 h-3.5" /> Manual Override
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium mb-4">Message Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {infoItems.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payload */}
        {message.payload && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium mb-3">Payload</p>
            <CodeBlock content={message.payload} language={message.payload.trim().startsWith('<') ? 'xml' : 'json'} />
          </div>
        )}

        {/* Response */}
        {message.response && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium mb-3">Response</p>
            <CodeBlock content={message.response} />
          </div>
        )}

        {/* Timing Breakdown */}
        {message.timingBreakdown && message.timingBreakdown.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium mb-3">Timing Breakdown</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {message.timingBreakdown.map((t) => (
                    <tr key={t.stage} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{t.stage}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{t.durationMs}ms</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="px-4 py-2 font-bold">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">{message.timingBreakdown.reduce((s, t) => s + t.durationMs, 0)}ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Details */}
        {message.errorCode && (
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Error Details</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-red-600/70">Error Code</p><p className="font-mono font-medium text-red-700 dark:text-red-400">{message.errorCode}</p></div>
              <div><p className="text-xs text-red-600/70">Error Message</p><p className="text-red-700 dark:text-red-400">{message.errorMessage}</p></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
