import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';

interface MoneyDisplayProps {
  amount: number | string;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  colorCode?: boolean;
  compact?: boolean;
  className?: string;
}

const sizeClasses = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-2xl font-semibold' };

export function MoneyDisplay({ amount, currency = 'NGN', size = 'md', showSign, colorCode, compact, className }: MoneyDisplayProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isNegative = num < 0;
  const formatted = compact ? formatMoneyCompact(Math.abs(num), currency) : formatMoney(Math.abs(num), currency);
  const display = isNegative ? `(${formatted})` : (showSign && num > 0 ? `+${formatted}` : formatted);

  return (
    <span className={cn(
      'font-mono tabular-nums',
      sizeClasses[size],
      colorCode && isNegative && 'text-red-600 dark:text-red-400',
      colorCode && !isNegative && num > 0 && 'text-green-600 dark:text-green-400',
      className,
    )}>
      {display}
    </span>
  );
}
