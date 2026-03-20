import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';

interface SummaryItem {
  label: string;
  value: string | number;
  format?: 'money' | 'number' | 'percent';
  currency?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

interface SummaryBarProps {
  items: SummaryItem[];
  isLoading?: boolean;
}

const colorClasses = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

export function SummaryBar({ items, isLoading = false }: SummaryBarProps) {
  if (isLoading) {
    const skeletonCount = items.length > 0 ? items.length : 4;
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-muted/30 rounded-lg border text-sm">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 animate-pulse">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-muted/30 rounded-lg border text-sm">
      {items.map((item, i) => {
        const formatted = (() => {
          if (typeof item.value === 'string') return item.value;
          if (item.format === 'money') return formatMoney(item.value, item.currency);
          if (item.format === 'percent') return formatPercent(item.value);
          if (item.format === 'number') return item.value.toLocaleString();
          return String(item.value);
        })();
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{item.label}:</span>
            <span className={cn('font-semibold font-mono', colorClasses[item.color || 'default'])}>{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
