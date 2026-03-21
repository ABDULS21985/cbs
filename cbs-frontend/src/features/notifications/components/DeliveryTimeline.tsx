import { cn } from '@/lib/utils';
import { Clock, Send, CheckCircle2, XCircle, RefreshCw, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import type { NotificationLog } from '../types/notificationExt';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------

interface TimelineStep {
  label: string;
  icon: LucideIcon;
  timestamp: string | null;
  status: 'completed' | 'active' | 'failed' | 'pending';
  detail?: string;
}

// ---------------------------------------------------------------------------
// Build timeline steps from a notification log entry
// ---------------------------------------------------------------------------

function buildSteps(log: NotificationLog): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // CREATED
  steps.push({
    label: 'Created',
    icon: Clock,
    timestamp: log.createdAt,
    status: 'completed',
  });

  // SCHEDULED (optional)
  if (log.scheduledAt) {
    steps.push({
      label: 'Scheduled',
      icon: CalendarClock,
      timestamp: log.scheduledAt,
      status: 'completed',
    });
  }

  // SENT
  if (log.sentAt) {
    steps.push({
      label: 'Sent',
      icon: Send,
      timestamp: log.sentAt,
      status: 'completed',
      detail: log.provider ? `via ${log.provider}` : undefined,
    });
  } else if (log.status === 'PENDING' || log.status === 'PENDING_DISPATCH') {
    steps.push({
      label: log.status === 'PENDING_DISPATCH' ? 'Queued for dispatch' : 'Sent',
      icon: Send,
      timestamp: null,
      status: 'pending',
    });
  }

  // DELIVERED or FAILED or BOUNCED or OPTED_OUT
  if (log.status === 'DELIVERED' || log.status === 'READ') {
    steps.push({
      label: log.status === 'READ' ? 'Delivered & Read' : 'Delivered',
      icon: CheckCircle2,
      timestamp: log.deliveredAt,
      status: 'completed',
    });
  } else if (log.status === 'FAILED') {
    steps.push({
      label: 'Failed',
      icon: XCircle,
      timestamp: log.deliveredAt || log.sentAt || log.createdAt,
      status: 'failed',
      detail: log.failureReason || 'Unknown error',
    });
  } else if (log.status === 'BOUNCED') {
    steps.push({
      label: 'Bounced',
      icon: XCircle,
      timestamp: log.deliveredAt || log.sentAt || log.createdAt,
      status: 'failed',
      detail: log.failureReason || 'Message bounced',
    });
  } else if (log.status === 'OPTED_OUT') {
    steps.push({
      label: 'Opted Out',
      icon: XCircle,
      timestamp: log.createdAt,
      status: 'failed',
      detail: 'Recipient has opted out of this notification type',
    });
  } else if (log.status === 'SENT') {
    steps.push({
      label: 'Delivered',
      icon: CheckCircle2,
      timestamp: null,
      status: 'pending',
    });
  }

  // Retry attempts (as sub-step if retryCount > 0)
  if (log.retryCount > 0) {
    steps.push({
      label: `Retried ${log.retryCount} / ${log.maxRetries}`,
      icon: RefreshCw,
      timestamp: null,
      status: log.status === 'FAILED' ? 'failed' : 'completed',
      detail: log.status === 'FAILED' ? 'Max retries may have been reached' : undefined,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Styling per status
// ---------------------------------------------------------------------------

const statusStyles: Record<string, { dot: string; line: string; icon: string }> = {
  completed: {
    dot: 'bg-green-500',
    line: 'bg-green-200 dark:bg-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  active: {
    dot: 'bg-blue-500',
    line: 'bg-blue-200 dark:bg-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  failed: {
    dot: 'bg-red-500',
    line: 'bg-red-200 dark:bg-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  pending: {
    dot: 'bg-gray-300 dark:bg-gray-600',
    line: 'bg-gray-200 dark:bg-gray-700',
    icon: 'text-muted-foreground',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeliveryTimelineProps {
  notification: NotificationLog;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeliveryTimeline({ notification }: DeliveryTimelineProps) {
  const steps = buildSteps(notification);

  return (
    <div className="relative" role="list" aria-label="Delivery timeline">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const styles = statusStyles[step.status] || statusStyles.pending;
        const Icon = step.icon;

        return (
          <div key={idx} className="flex gap-3" role="listitem">
            {/* Vertical connector */}
            <div className="flex flex-col items-center">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', styles.dot)}>
                <Icon className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              {!isLast && <div className={cn('w-0.5 flex-1 min-h-[24px]', styles.line)} />}
            </div>

            {/* Content */}
            <div className={cn('pb-5', isLast && 'pb-0')}>
              <p className={cn('text-sm font-medium', styles.icon)}>{step.label}</p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(step.timestamp), 'dd MMM yyyy, HH:mm:ss')}
                </p>
              )}
              {!step.timestamp && step.status === 'pending' && (
                <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
              )}
              {step.detail && (
                <p className={cn(
                  'text-xs mt-0.5',
                  step.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                )}>
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
