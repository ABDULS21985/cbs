import { X, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { channelIcon } from './ChannelSelector';
import type { NotificationLog } from '../api/communicationApi';

interface MessageDetailDrawerProps {
  message: NotificationLog | null;
  onClose: () => void;
  onRetry?: (id: number) => void;
  retrying?: boolean;
}

export function MessageDetailDrawer({ message, onClose, onRetry, retrying }: MessageDetailDrawerProps) {
  if (!message) return null;

  const Icon = channelIcon(message.channel);
  const timeline = [
    { label: 'Created', time: message.createdAt, done: true },
    { label: 'Sent', time: message.sentAt, done: !!message.sentAt },
    { label: 'Delivered', time: message.deliveredAt, done: !!message.deliveredAt },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Message Detail</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatusBadge status={message.status} dot />
              <span className="text-xs text-muted-foreground">{formatRelative(message.createdAt)}</span>
            </div>
            {message.subject && <h4 className="font-semibold">{message.subject}</h4>}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>To: {message.recipientName ?? '—'} ({message.recipientAddress ?? '—'})</p>
              <p>Channel: {message.channel} via {message.provider ?? 'Unknown'}</p>
              {message.eventType && <p>Event: {message.eventType}</p>}
              {message.templateCode && <p>Template: {message.templateCode}</p>}
              {message.providerMessageId && <p>Message ID: <code className="font-mono text-[10px]">{message.providerMessageId}</code></p>}
            </div>
          </div>

          {/* Delivery Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Delivery Trace</h4>
            <div className="space-y-0">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1', step.done ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className={cn('text-sm font-medium', step.done ? '' : 'text-muted-foreground')}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.time ? formatDateTime(step.time) : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error info */}
          {message.status === 'FAILED' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Delivery Failed</p>
              <p className="text-xs text-red-600 dark:text-red-400">{message.failureReason ?? 'Unknown error'}</p>
              <p className="text-xs text-muted-foreground">Retries: {message.retryCount} / {message.maxRetries}</p>
              {onRetry && message.retryCount < message.maxRetries && (
                <button onClick={() => onRetry(message.id)} disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                  {retrying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Message Body */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Content</h4>
            {message.channel === 'EMAIL' && message.body ? (
              <div className="surface-card p-4 prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: message.body }} />
            ) : (
              <div className="surface-card p-4 text-sm whitespace-pre-wrap">
                {message.body ?? 'No content'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
