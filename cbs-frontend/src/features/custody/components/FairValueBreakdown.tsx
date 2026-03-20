import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FairValueBreakdownProps {
  level1Total: number;
  level2Total: number;
  level3Total: number;
  currency?: string;
}

const LEVELS = [
  { key: 'level1', label: 'Level 1', subtitle: 'Observable Market Prices', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' },
  { key: 'level2', label: 'Level 2', subtitle: 'Model-Based (Observable Inputs)', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' },
  { key: 'level3', label: 'Level 3', subtitle: 'Unobservable Inputs', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' },
] as const;

export function FairValueBreakdown({ level1Total, level2Total, level3Total, currency = 'NGN' }: FairValueBreakdownProps) {
  const totals = [level1Total, level2Total, level3Total];
  const grandTotal = totals.reduce((s, t) => s + t, 0);

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LEVELS.map((level, i) => {
          const amount = totals[i];
          const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
          return (
            <div key={level.key} className={cn('rounded-xl border p-4', level.bgColor)}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-3 h-3 rounded-full', level.color)} />
                <span className={cn('text-xs font-bold uppercase tracking-wider', level.textColor)}>{level.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{level.subtitle}</p>
              <p className="text-xl font-bold font-mono">{formatMoney(amount, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% of total</p>
            </div>
          );
        })}
      </div>

      {/* Proportional bar */}
      {grandTotal > 0 && (
        <div className="h-4 rounded-full overflow-hidden flex bg-muted">
          {LEVELS.map((level, i) => {
            const pct = (totals[i] / grandTotal) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={level.key}
                className={cn('h-full transition-all', level.color, i === 0 && 'rounded-l-full', i === LEVELS.length - 1 && 'rounded-r-full')}
                style={{ width: `${pct}%` }}
                title={`${level.label}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total Fair Value</span>
        <span className="font-bold font-mono">{formatMoney(grandTotal, currency)}</span>
      </div>
    </div>
  );
}
