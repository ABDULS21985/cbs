import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import type { LucideIcon } from 'lucide-react';

// ─── Sparkline ────────────────────────────────────────────────────────────────

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 50;
  const h = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#16a34a' : '#dc2626'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiDrilldownCardProps {
  label: string;
  value: number;
  format: 'money' | 'number' | 'percent';
  change: number;
  changePeriod?: string;
  sparklineData?: number[];
  drilldownPath?: string;
  icon?: LucideIcon;
  period?: string;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatValue(value: number, fmt: 'money' | 'number' | 'percent'): string {
  switch (fmt) {
    case 'money':
      return formatMoneyCompact(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
      return value.toLocaleString('en-NG');
    default:
      return String(value);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KpiDrilldownCard({
  label,
  value,
  format: fmt,
  change,
  changePeriod = 'vs prior period',
  sparklineData,
  drilldownPath,
  icon: Icon,
}: KpiDrilldownCardProps) {
  const navigate = useNavigate();
  const isPositive = change >= 0;
  const changeColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const handleClick = () => {
    if (drilldownPath) {
      navigate(drilldownPath);
    }
  };

  return (
    <div
      role={drilldownPath ? 'button' : undefined}
      tabIndex={drilldownPath ? 0 : undefined}
      aria-label={`${label}: ${formatValue(value, fmt)}, ${isPositive ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% ${changePeriod}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (drilldownPath && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'bg-card rounded-lg border border-border p-5 flex flex-col gap-3 transition-all',
        drilldownPath && 'cursor-pointer hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">
            {label}
          </span>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <MiniSparkline data={sparklineData} positive={isPositive} />
        )}
      </div>

      {/* Main value */}
      <span className="text-2xl font-semibold font-money leading-none text-foreground">
        {formatValue(value, fmt)}
      </span>

      {/* Change indicator */}
      <div className="flex items-center gap-1.5">
        <span className={cn('flex items-center gap-0.5 text-xs font-medium', changeColor)}>
          {isPositive ? '\u25B2' : '\u25BC'}
          {isPositive ? '+' : ''}
          {change.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">{changePeriod}</span>
      </div>
    </div>
  );
}
