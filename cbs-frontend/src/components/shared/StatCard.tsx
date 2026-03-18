import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  format?: 'money' | 'number' | 'percent';
  currency?: string;
  change?: number;
  changePeriod?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'flat';
  loading?: boolean;
  compact?: boolean;
}

export function StatCard({ label, value, format, currency = 'NGN', change, changePeriod, icon: Icon, trend, loading, compact }: StatCardProps) {
  const formattedValue = (() => {
    if (typeof value === 'string') return value;
    if (format === 'money') return compact ? formatMoneyCompact(value, currency) : formatMoney(value, currency);
    if (format === 'percent') return `${value.toFixed(2)}%`;
    if (format === 'number') return value.toLocaleString();
    return String(value);
  })();

  if (loading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-8 w-32 bg-muted rounded mt-2" />
        <div className="h-3 w-20 bg-muted rounded mt-2" />
      </div>
    );
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        {Icon && <Icon className="w-5 h-5 text-muted-foreground/50" />}
      </div>
      <div className="stat-value">{formattedValue}</div>
      {change !== undefined && (
        <div className={cn('stat-change flex items-center gap-1', trend === 'up' ? 'stat-change-up' : trend === 'down' ? 'stat-change-down' : 'text-muted-foreground')}>
          <TrendIcon className="w-3 h-3" />
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
          {changePeriod && <span className="text-muted-foreground ml-1">{changePeriod}</span>}
        </div>
      )}
    </div>
  );
}
