import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { TopObligor } from '../../api/loanAnalyticsApi';

interface SingleObligorConcentrationProps {
  obligors: TopObligor[];
}

const SINGLE_OBLIGOR_LIMIT_PCT = 10;

function getClassificationBadge(classification: string): string {
  switch (classification) {
    case 'PASS':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'WATCH':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'SUBSTANDARD':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'DOUBTFUL':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'LOSS':
      return 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getPortfolioPctColor(pct: number): string {
  if (pct > SINGLE_OBLIGOR_LIMIT_PCT) return 'text-red-600 dark:text-red-400 font-bold';
  if (pct > 7) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-foreground';
}

export function SingleObligorConcentration({ obligors }: SingleObligorConcentrationProps) {
  const breachingObligors = obligors.filter((o) => o.portfolioPct > SINGLE_OBLIGOR_LIMIT_PCT);
  const maxExposure = Math.max(...obligors.map((o) => o.exposure));

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Top 10 Obligors</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Largest single-name credit exposures</p>
      </div>

      {/* Warning banner */}
      {breachingObligors.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-red-700 dark:text-red-400">
              Single Obligor Limit Breach Detected
            </p>
            <p className="text-red-600 dark:text-red-300 mt-0.5">
              {breachingObligors.map((o) => o.name).join(', ')}{' '}
              {breachingObligors.length === 1 ? 'exceeds' : 'exceed'} the {SINGLE_OBLIGOR_LIMIT_PCT}% single obligor limit.
              Regulatory review required.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 w-6">#</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Obligor</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Sector</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Exposure</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">% Portfolio</th>
              <th className="text-center text-xs font-medium text-muted-foreground pb-2 pl-2">Class.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {obligors.map((obligor) => {
              const isBreaching = obligor.portfolioPct > SINGLE_OBLIGOR_LIMIT_PCT;
              return (
                <tr
                  key={obligor.rank}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    isBreaching && 'bg-red-50/50 dark:bg-red-900/10',
                  )}
                >
                  <td className="py-2.5 text-xs text-muted-foreground font-medium">{obligor.rank}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      {isBreaching && (
                        <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-foreground">{obligor.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">{obligor.sector}</td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-foreground">{formatMoneyCompact(obligor.exposure)}</div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden w-20 ml-auto">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(obligor.exposure / maxExposure) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={cn('py-2.5 px-2 text-right text-xs tabular-nums', getPortfolioPctColor(obligor.portfolioPct))}>
                    {obligor.portfolioPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-2 text-center">
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold', getClassificationBadge(obligor.classification))}>
                      {obligor.classification}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Limit note */}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Single obligor limit: <span className="font-medium text-foreground">{SINGLE_OBLIGOR_LIMIT_PCT}%</span> of portfolio.
        Exposures exceeding this threshold are flagged in red.
      </p>
    </div>
  );
}
