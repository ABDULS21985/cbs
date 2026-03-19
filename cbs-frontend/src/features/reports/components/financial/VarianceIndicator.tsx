import { cn } from '@/lib/utils';

interface VarianceIndicatorProps {
  current: number;
  prior: number;
  /** 'higher' = green when positive (default — good for assets/income). 'lower' = green when negative (good for expenses). */
  favorable?: 'higher' | 'lower';
  className?: string;
}

export function VarianceIndicator({ current, prior, favorable = 'higher', className }: VarianceIndicatorProps) {
  if (prior === 0) return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;

  const pct = ((current - prior) / Math.abs(prior)) * 100;
  const isPositive = pct >= 0;
  const isGood = favorable === 'higher' ? isPositive : !isPositive;
  const abs = Math.abs(pct);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        isGood
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
        className,
      )}
    >
      <span className="text-[10px]">{isPositive ? '▲' : '▼'}</span>
      {abs.toFixed(1)}%
    </span>
  );
}
