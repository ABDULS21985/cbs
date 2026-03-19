import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { Search, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import type { FraudAlert } from '../../types/fraud';
import { useBlockCard, useAllowTransaction, useDismissAlert } from '../../hooks/useFraud';

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
  const blockCard = useBlockCard();
  const allowTransaction = useAllowTransaction();
  const dismissAlert = useDismissAlert();

  const timeAgo = formatDistanceToNow(parseISO(alert.createdAt), { addSuffix: true });

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', config.border, config.bg)}>
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
          <span className="font-medium">{alert.customerName}</span>
          {alert.maskedPan && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-xs text-muted-foreground">{alert.maskedPan}</span>
            </>
          )}
        </div>

        {/* Row 2: Amount + Merchant + Location */}
        <div className="text-sm">
          <span className="font-semibold text-base">{formatMoney(alert.amount, alert.currency)}</span>
          {alert.merchantName && (
            <span className="text-muted-foreground"> at {alert.merchantName}</span>
          )}
          {alert.location && (
            <span className="text-muted-foreground text-xs"> ({alert.location})</span>
          )}
        </div>

        {/* Row 3: Score + Rules */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Score: <span className="font-semibold text-foreground">{alert.score}/100</span></span>
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
          {alert.maskedPan && (
            <button
              onClick={() => blockCard.mutate(alert.id)}
              disabled={blockCard.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 transition-colors"
            >
              <CreditCard className="w-3 h-3" />
              Block Card
            </button>
          )}
          <button
            onClick={() => allowTransaction.mutate(alert.id)}
            disabled={allowTransaction.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-200 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            Allow
          </button>
          <button
            onClick={() => dismissAlert.mutate({ alertId: alert.id, reason: 'Dismissed from triage queue' })}
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
