import { useState, useMemo } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';

interface InterestBenefitCalculatorProps {
  totalBalance: number;
}

type Period = 'monthly' | 'quarterly' | 'annual';

const PERIOD_MULTIPLIERS: Record<Period, number> = {
  monthly: 1 / 12,
  quarterly: 1 / 4,
  annual: 1,
};

const PERIOD_LABELS: Record<Period, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export function InterestBenefitCalculator({ totalBalance }: InterestBenefitCalculatorProps) {
  const [rate, setRate] = useState<string>('5.0');
  const [period, setPeriod] = useState<Period>('monthly');

  const rateNum = useMemo(() => {
    const parsed = parseFloat(rate);
    return isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, 100);
  }, [rate]);

  const interestBenefit = useMemo(() => {
    return totalBalance * (rateNum / 100) * PERIOD_MULTIPLIERS[period];
  }, [totalBalance, rateNum, period]);

  const annualBenefit = useMemo(() => {
    return totalBalance * (rateNum / 100);
  }, [totalBalance, rateNum]);

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Calculator className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">Interest Benefit Calculator</h3>
      </div>

      <div className="space-y-3">
        {/* Total balance (read-only) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Pool Balance
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
            <span className="text-sm font-mono font-semibold flex-1 tabular-nums">
              {formatMoney(totalBalance)}
            </span>
            <span className="text-xs text-muted-foreground">Read-only</span>
          </div>
        </div>

        {/* Interest rate input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Interest Rate (% p.a.)
          </label>
          <div className="relative">
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              placeholder="0.00"
              className="w-full pr-8 pl-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              %
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Calculation Period
          </label>
          <div className="flex gap-1.5">
            {(['monthly', 'quarterly', 'annual'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border',
                  period === p
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted',
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
              {PERIOD_LABELS[period]} Interest Benefit
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-green-700 dark:text-green-400">
              +{formatMoney(interestBenefit)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
            <TrendingUp className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
        </div>

        {period !== 'annual' && (
          <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-900/40">
            <div className="text-xs text-green-700 dark:text-green-400 flex justify-between">
              <span>Annual equivalent</span>
              <span className="font-semibold tabular-nums">+{formatMoney(annualBenefit)}</span>
            </div>
          </div>
        )}

        {rateNum === 0 && (
          <div className="mt-2 text-xs text-muted-foreground italic">
            Enter an interest rate above to compute the benefit.
          </div>
        )}
      </div>

      {/* Effective rate annotation */}
      {rateNum > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          At <span className="font-semibold">{rateNum.toFixed(2)}% p.a.</span> on{' '}
          <span className="font-semibold">{formatMoney(totalBalance)}</span>
        </div>
      )}
    </div>
  );
}
