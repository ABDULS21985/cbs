import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/types/common';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const colorClasses: Record<string, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const dotColors: Record<string, string> = {
  success: 'bg-green-500', warning: 'bg-amber-500', danger: 'bg-red-500', info: 'bg-blue-500', default: 'bg-gray-400',
};

export function StatusBadge({ status, size = 'sm', dot }: StatusBadgeProps) {
  const colorKey = STATUS_COLORS[status] || 'default';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      colorClasses[colorKey],
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[colorKey])} />}
      {status.replace(/_/g, ' ')}
    </span>
  );
}
