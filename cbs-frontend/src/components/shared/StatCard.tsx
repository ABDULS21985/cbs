import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus, Info, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  format?: 'money' | 'number' | 'percent';
  currency?: string;
  change?: number;
  changePeriod?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: 'up' | 'down' | 'flat';
  loading?: boolean;
  compact?: boolean;
  subtitle?: string;
  tooltip?: string;
}

export function StatCard({
  label, value, format, currency = 'NGN', change, changePeriod,
  icon: Icon, iconColor, iconBg, trend, loading, compact, subtitle, tooltip,
}: StatCardProps) {
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
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="w-10 h-10 rounded-xl bg-muted" />
        </div>
        <div className="h-8 w-28 bg-muted rounded mt-3" />
        <div className="h-3 w-16 bg-muted rounded mt-2" />
      </div>
    );
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const defaultIconBg = 'bg-primary/10 dark:bg-primary/20';
  const defaultIconColor = 'text-primary';

  return (
    <div className="stat-card group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="stat-label">{label}</span>
          {tooltip && (
            <div className="relative group/tip">
              <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg || defaultIconBg)}>
            <Icon className={cn('w-5 h-5', iconColor || defaultIconColor)} />
          </div>
        )}
      </div>
      <div className="stat-value">{formattedValue}</div>
      {subtitle && <p className="stat-sublabel">{subtitle}</p>}
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
