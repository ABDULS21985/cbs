import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensitivityDisplayProps {
  delta?: number;
  gamma?: number;
  vega?: number;
  duration?: number;
  modifiedDuration?: number;
  convexity?: number;
  yieldToMaturity?: number;
  spreadToBenchmark?: number;
}

interface MetricCardProps {
  label: string;
  value: number | undefined;
  format?: 'number' | 'percent' | 'years';
  precision?: number;
}

function MetricCard({ label, value, format = 'number', precision = 4 }: MetricCardProps) {
  if (value === undefined || value === null) return null;

  const formatted = format === 'percent'
    ? `${value.toFixed(2)}%`
    : format === 'years'
      ? `${value.toFixed(2)}y`
      : value.toFixed(precision);

  const isPositive = value > 0;
  const isNegative = value < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="rounded-lg border bg-card p-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <TrendIcon className={cn('w-3.5 h-3.5', trendColor)} />
      </div>
      <p className={cn('text-lg font-bold font-mono', trendColor)}>{formatted}</p>
    </div>
  );
}

export function SensitivityDisplay(props: SensitivityDisplayProps) {
  const metrics = ([
    { label: 'Delta (Δ)', value: props.delta, precision: 4 },
    { label: 'Gamma (Γ)', value: props.gamma, precision: 4 },
    { label: 'Vega (ν)', value: props.vega, precision: 4 },
    { label: 'Duration', value: props.duration, format: 'years' as const },
    { label: 'Mod. Duration', value: props.modifiedDuration, format: 'years' as const },
    { label: 'Convexity', value: props.convexity, precision: 2 },
    { label: 'YTM', value: props.yieldToMaturity, format: 'percent' as const },
    { label: 'Spread', value: props.spreadToBenchmark, format: 'percent' as const },
  ] satisfies MetricCardProps[]).filter((m) => m.value !== undefined && m.value !== null);

  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No sensitivity data available</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
    </div>
  );
}
