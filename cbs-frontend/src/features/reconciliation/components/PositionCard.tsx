import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, ArrowRightLeft } from 'lucide-react';
import type { NostroPosition } from '../types/nostro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getAgingColor(days: number | null): { bg: string; text: string; label: string } {
  if (days === null) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', label: 'Never' };
  if (days < 1) return { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Today' };
  if (days < 3) return { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: `${days}d ago` };
  return { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: `${days}d ago` };
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  RECONCILED: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  PARTIALLY_RECONCILED: { color: 'text-amber-600 dark:text-amber-400', icon: Clock },
  UNRECONCILED: { color: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
  PENDING: { color: 'text-blue-600 dark:text-blue-400', icon: Clock },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PositionCardProps {
  position: NostroPosition;
  onClick?: (position: NostroPosition) => void;
}

export function PositionCard({ position, onClick }: PositionCardProps) {
  const difference = position.bookBalance - position.statementBalance;
  const hasMismatch = Math.abs(difference) > 0.005;
  const agingDays = daysSince(position.lastReconciledDate);
  const aging = getAgingColor(agingDays);
  const statusCfg = STATUS_CONFIG[position.reconciliationStatus] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  return (
    <button
      type="button"
      onClick={() => onClick?.(position)}
      className={cn(
        'w-full text-left rounded-xl border bg-card p-5 transition-all',
        'hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        hasMismatch && 'border-red-200 dark:border-red-800/50',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              {position.currencyCode}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {position.correspondentBankName || 'Unknown Bank'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {position.accountNumber || position.correspondentBankSwift || '--'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusIcon className={cn('w-4 h-4', statusCfg.color)} />
          <span className={cn('text-xs font-medium', statusCfg.color)}>
            {position.reconciliationStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Book Balance</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(position.bookBalance, position.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Statement</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(position.statementBalance, position.currencyCode)}
          </p>
        </div>
      </div>

      {/* Difference */}
      <div className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2 mb-3',
        hasMismatch
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-green-50 dark:bg-green-900/20',
      )}>
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className={cn('w-3.5 h-3.5', hasMismatch ? 'text-red-500' : 'text-green-500')} />
          <span className="text-xs text-muted-foreground">Difference</span>
        </div>
        <span className={cn(
          'text-sm font-bold',
          hasMismatch ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
        )}>
          {formatCurrency(difference, position.currencyCode)}
        </span>
      </div>

      {/* Footer: aging + outstanding items */}
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', aging.bg, aging.text)}>
          <Clock className="w-3 h-3" />
          {aging.label}
        </span>
        {position.outstandingItemsCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary px-1.5 text-[11px] font-bold">
            {position.outstandingItemsCount}
          </span>
        )}
      </div>
    </button>
  );
}
