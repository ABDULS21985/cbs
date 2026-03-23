import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import type { FraudAlert } from '../../types/fraud';
import { useAllowTransaction, useDismissAlert } from '../../hooks/useFraud';

interface Props {
  alert: FraudAlert;
  onInvestigate: (alertId: number) => void;
}

const severityConfig = {
  CRITICAL: {
    border: 'border-l-4 border-red-500',
    bg: 'bg-red-50/50 dark:bg-red-900/5',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    animate: true,
  },
  HIGH: {
    border: 'border-l-4 border-orange-500',
    bg: 'bg-orange-50/30 dark:bg-orange-900/5',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    animate: false,
  },
  MEDIUM: {
    border: 'border-l-4 border-amber-500',
    bg: 'bg-amber-50/30 dark:bg-amber-900/5',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    animate: false,
  },
  LOW: {
    border: 'border-l-4 border-blue-500',
    bg: 'bg-blue-50/30 dark:bg-blue-900/5',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    animate: false,
  },
};

export function AlertTriageCard({ alert, onInvestigate }: Props) {
  const config = severityConfig[alert.severity];
  const allowTransaction = useAllowTransaction();
  const dismissAlert = useDismissAlert();

  const timeAgo = formatDistanceToNow(parseISO(alert.createdAt), { addSuffix: true });

  return (
    <div className={cn('surface-card overflow-hidden', config.border, config.bg)}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                config.badge,
                config.animate && 'animate-pulse'
              )}
            >
              {alert.severity}
            </span>
            <span className="text-sm font-semibold">{alert.type}</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{alert.alertNumber}</span>
        </div>

        {/* Row 1: Customer + PAN */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{alert.customerLabel}</span>
          {alert.accountLabel && (
            <span className="text-muted-foreground">· {alert.accountLabel}</span>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {alert.description}
        </div>

        {/* Row 3: Score + Rules */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Score: <span className="font-semibold text-foreground">{alert.score}/100</span></span>
          {alert.channel && <span>Channel: <span className="font-medium text-foreground">{alert.channel}</span></span>}
          {alert.rules.length > 0 && (
            <span>Rules: <span className="font-medium text-foreground">{alert.rules.slice(0, 3).join(', ')}{alert.rules.length > 3 ? ` +${alert.rules.length - 3}` : ''}</span></span>
          )}
        </div>

        {/* Row 4: Time */}
        <div className="text-xs text-muted-foreground capitalize">{timeAgo}</div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <button
            onClick={() => onInvestigate(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="w-3 h-3" />
            Investigate
          </button>
          <button
            onClick={() => allowTransaction.mutate(alert.id, {
              onSuccess: () => { toast.success('Transaction allowed'); },
              onError: () => { toast.error('Failed to allow transaction'); },
            })}
            disabled={allowTransaction.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-200 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            Allow
          </button>
          <button
            onClick={() => dismissAlert.mutate(alert.id, {
              onSuccess: () => { toast.success('Alert dismissed'); },
              onError: () => { toast.error('Failed to dismiss alert'); },
            })}
            disabled={dismissAlert.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
