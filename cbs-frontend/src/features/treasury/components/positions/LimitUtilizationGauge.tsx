import { cn } from '@/lib/utils';

interface LimitUtilizationGaugeProps {
  label: string;
  value: number;
  subtitle?: string;
  className?: string;
}

function arcPath(radius: number) {
  const centerX = 60;
  const centerY = 60;
  const startX = centerX - radius;
  const endX = centerX + radius;
  return `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`;
}

export function LimitUtilizationGauge({
  label,
  value,
  subtitle,
  className,
}: LimitUtilizationGaugeProps) {
  const normalized = Math.max(0, Math.min(value, 100));
  const radius = 42;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - normalized / 100);
  const tone =
    normalized >= 90 ? 'text-red-600' : normalized >= 70 ? 'text-amber-600' : 'text-green-600';
  const stroke =
    normalized >= 90 ? 'stroke-red-500' : normalized >= 70 ? 'stroke-amber-500' : 'stroke-green-500';

  return (
    <div className={cn('surface-card p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className={cn('text-lg font-semibold font-mono', tone)}>{normalized.toFixed(1)}%</span>
      </div>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 120 72" className="h-24 w-32 overflow-visible">
          <path
            d={arcPath(radius)}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/50"
            strokeLinecap="round"
          />
          <path
            d={arcPath(radius)}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={stroke}
          />
        </svg>
      </div>
    </div>
  );
}
