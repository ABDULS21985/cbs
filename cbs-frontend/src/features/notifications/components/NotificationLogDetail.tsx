import { X, RefreshCw, User, Server, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared';
import { DeliveryTimeline } from './DeliveryTimeline';
import type { NotificationLog } from '../types/notificationExt';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationLogDetailProps {
  notification: NotificationLog | null;
  open: boolean;
  onClose: () => void;
  onRetry?: (id: number) => void;
  retrying?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationLogDetail({
  notification,
  open,
  onClose,
  onRetry,
  retrying,
}: NotificationLogDetailProps) {
  if (!open || !notification) return null;

  const n = notification;
  const canRetry = n.status === 'FAILED' && n.retryCount < n.maxRetries;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-background border-l shadow-xl',
          'overflow-y-auto transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Notification detail"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-background">
          <h2 className="text-lg font-semibold truncate">Notification #{n.id}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Channel */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={n.status} dot />
            <StatusBadge status={n.channel} />
          </div>

          {/* Subject */}
          {n.subject && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
              <p className="text-sm mt-1">{n.subject}</p>
            </div>
          )}

          {/* Body */}
          {n.body && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</label>
              <div
                className="mt-1 text-sm rounded-md border p-3 bg-muted/30 max-h-60 overflow-y-auto prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: n.body }}
              />
            </div>
          )}

          {/* Recipient info grid */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <InfoItem icon={User} label="Name" value={n.recipientName || '—'} />
              <InfoItem icon={Hash} label="Customer ID" value={n.customerId ? String(n.customerId) : '—'} />
              <InfoItem icon={User} label="Address" value={n.recipientAddress || '—'} />
              <InfoItem icon={Hash} label="Event Type" value={n.eventType || '—'} />
            </div>
          </div>

          {/* Provider info */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <InfoItem icon={Server} label="Provider" value={n.provider || '—'} />
              <InfoItem icon={Hash} label="Message ID" value={n.providerMessageId || '—'} />
              <InfoItem icon={Hash} label="Template" value={n.templateCode || '—'} />
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamps</label>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p>{n.createdAt ? format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm') : '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Sent</span>
                <p>{n.sentAt ? format(new Date(n.sentAt), 'dd MMM yyyy, HH:mm') : '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Delivered</span>
                <p>{n.deliveredAt ? format(new Date(n.deliveredAt), 'dd MMM yyyy, HH:mm') : '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Scheduled</span>
                <p>{n.scheduledAt ? format(new Date(n.scheduledAt), 'dd MMM yyyy, HH:mm') : '—'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
              Delivery Timeline
            </label>
            <DeliveryTimeline notification={n} />
          </div>

          {/* Retry section */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retry</label>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Attempts: {n.retryCount} / {n.maxRetries}
              </span>
              {canRetry && onRetry && (
                <button
                  onClick={() => onRetry(n.id)}
                  disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', retrying && 'animate-spin')} />
                  Retry
                </button>
              )}
              {!canRetry && n.status === 'FAILED' && (
                <span className="text-xs text-red-600 dark:text-red-400">Max retries reached</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small info item helper
// ---------------------------------------------------------------------------

function InfoItem({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="truncate max-w-[180px]">{value}</p>
      </div>
    </div>
  );
}
