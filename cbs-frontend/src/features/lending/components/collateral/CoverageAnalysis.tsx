import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Collateral } from '../../types/collateral';

interface CoverageAnalysisProps {
  collateral: Collateral;
}

export function CoverageAnalysis({ collateral }: CoverageAnalysisProps) {
  const totalExposure = collateral.linkedLoans.reduce((sum, l) => sum + l.outstanding, 0);
  const ratio = collateral.coverageRatio;

  const isAdequate = ratio >= 100;
  const isWarning = ratio >= 80 && ratio < 100;
  const isCritical = ratio < 80;

  const StatusIcon = isAdequate ? CheckCircle2 : isWarning ? AlertTriangle : XCircle;
  const statusColor = isAdequate
    ? 'text-green-600'
    : isWarning
    ? 'text-amber-600'
    : 'text-red-600';
  const statusLabel = isAdequate ? 'Adequate' : isWarning ? 'Below Target' : 'Inadequate';
  const bgColor = isAdequate
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : isWarning
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  return (
    <div className="surface-card shadow-sm p-5 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Coverage Analysis
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Loan Exposure</span>
          <span className="font-mono font-medium">
            {formatMoney(totalExposure, collateral.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Collateral Value
            {collateral.haircut > 0 && (
              <span className="ml-1 text-xs text-muted-foreground/60">
                (after {collateral.haircut}% haircut)
              </span>
            )}
          </span>
          <span className="font-mono font-medium">
            {formatMoney(collateral.adjustedValue, collateral.currency)}
          </span>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Coverage Ratio</span>
            <span className={cn('font-mono text-lg font-bold', statusColor)}>
              {ratio.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2', bgColor)}>
        <StatusIcon className={cn('w-4 h-4 flex-shrink-0', statusColor)} />
        <span className={cn('text-sm font-medium', statusColor)}>{statusLabel}</span>
        {isCritical && (
          <span className="text-xs text-red-600 dark:text-red-400 ml-auto">
            Shortfall: {formatMoney(totalExposure - collateral.adjustedValue, collateral.currency)}
          </span>
        )}
      </div>

      {/* Ratio bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>0%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 relative">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              isAdequate ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min((ratio / 150) * 100, 100)}%` }}
          />
          {/* 100% marker */}
          <div className="absolute top-0 h-2 w-px bg-border" style={{ left: `${(100 / 150) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
