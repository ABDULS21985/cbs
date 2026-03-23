import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatters';

interface AbVariant {
  variant: string;
  label: string;
  conversionRate: number;
  winner: boolean;
}

interface AbTestResultCardProps {
  variants: AbVariant[];
}

export function AbTestResultCard({ variants }: AbTestResultCardProps) {
  if (variants.length < 2) return null;

  const [variantA, variantB] = variants;
  const winner = variants.find((v) => v.winner);
  const loser = variants.find((v) => !v.winner);

  const uplift =
    loser && winner && loser.conversionRate > 0
      ? (((winner.conversionRate - loser.conversionRate) / loser.conversionRate) * 100).toFixed(1)
      : null;

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20">
        <h4 className="text-sm font-semibold text-foreground">A/B Test Results</h4>
        {uplift && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 font-medium">
            +{uplift}% conversion improvement from winning variant
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x">
        {[variantA, variantB].map((v, i) => (
          <div
            key={v.variant}
            className={cn(
              'p-4 space-y-2',
              v.winner && 'bg-green-50/50 dark:bg-green-900/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Variant {v.variant}
              </span>
              {v.winner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-semibold">
                  <CheckCircle className="w-3 h-3" />
                  Winner
                </span>
              )}
            </div>
            <p className="text-sm text-foreground font-medium leading-tight">{v.label}</p>
            <p
              className={cn(
                'text-2xl font-bold',
                v.winner ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
              )}
            >
              {formatPercent(v.conversionRate)}
            </p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            {i === 0 && uplift && !v.winner && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {uplift}% below winner
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
