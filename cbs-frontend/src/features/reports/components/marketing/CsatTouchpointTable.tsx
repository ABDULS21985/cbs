import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CsatTouchpoint } from '../../api/marketingAnalyticsApi';

interface CsatTouchpointTableProps {
  data: CsatTouchpoint[];
  isLoading?: boolean;
}

function ScoreStars({ score, maxScore }: { score: number; maxScore: number }) {
  const filled = Math.round((score / maxScore) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i < filled ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-xs font-medium">
        <TrendingUp className="w-3.5 h-3.5" />
        +{trend.toFixed(1)}
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400 text-xs font-medium">
        <TrendingDown className="w-3.5 h-3.5" />
        {trend.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="w-3.5 h-3.5" />
      —
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 4.0) return 'text-green-600 dark:text-green-400';
  if (score >= 3.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function CsatTouchpointTable({ data, isLoading }: CsatTouchpointTableProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">CSAT by Touchpoint</h3>
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Touchpoint</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Stars</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Responses</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.touchpoint} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{row.touchpoint}</td>
                  <td className="px-4 py-3">
                    <span className={cn('font-bold text-base', scoreColor(row.score))}>
                      {row.score.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-xs"> / {row.maxScore.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreStars score={row.score} maxScore={row.maxScore} />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {row.responses.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TrendIndicator trend={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
