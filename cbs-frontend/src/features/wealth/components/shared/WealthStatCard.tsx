import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';

interface WealthStatCardProps {
  label: string;
  value: string | number;
  format?: 'money' | 'number' | 'percent';
  change?: number;
  changeDirection?: 'up' | 'down' | 'flat';
  icon?: LucideIcon;
  drilldownPath?: string;
  loading?: boolean;
  sparklineData?: number[];
  currency?: string;
}

function formatValue(value: string | number, format?: string, currency = 'NGN'): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'money':
      return value >= 1e6 ? formatMoneyCompact(value, currency) : formatMoney(value, currency);
    case 'percent':
      return formatPercent(value);
    case 'number':
    default:
      return value.toLocaleString();
  }
}

function SparklineChart({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width={80} height={24}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="hsl(var(--primary))"
          fill="url(#sparkGrad)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const changeIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const changeColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-muted-foreground',
} as const;

export function WealthStatCard({
  label,
  value,
  format,
  change,
  changeDirection,
  icon: Icon,
  drilldownPath,
  loading = false,
  sparklineData,
  currency = 'NGN',
}: WealthStatCardProps) {
  const formattedValue = formatValue(value, format, currency);
  const direction = changeDirection ?? (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : undefined);
  const ChangeIcon = direction ? changeIcons[direction] : null;

  const card = (
    <div
      className="rounded-xl border bg-card p-4 relative"
      aria-label={`${label}: ${loading ? 'Loading' : formattedValue}`}
      role="group"
    >
      {loading ? (
        <>
          <div className="h-3 w-20 bg-muted animate-pulse rounded mb-3" />
          <div className="h-7 w-28 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="p-1.5 rounded-lg bg-muted">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            {sparklineData && sparklineData.length > 1 && (
              <SparklineChart data={sparklineData} />
            )}
          </div>

          <p className="text-2xl font-bold font-mono mt-2">{formattedValue}</p>

          {change !== undefined && direction && ChangeIcon && (
            <div className={cn('flex items-center gap-1 mt-1', changeColors[direction])}>
              <ChangeIcon className="w-3 h-3" />
              <span className="text-xs font-medium">
                {formatPercent(Math.abs(change))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (drilldownPath && !loading) {
    return (
      <Link to={drilldownPath} className="block hover:ring-2 hover:ring-primary/20 rounded-xl transition-shadow">
        {card}
      </Link>
    );
  }

  return card;
}
