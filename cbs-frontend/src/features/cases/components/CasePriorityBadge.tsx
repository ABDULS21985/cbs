import { cn } from '@/lib/utils';

const priorityConfig = {
  CRITICAL: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  LOW: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

interface Props {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export function CasePriorityBadge({ priority }: Props) {
  const config = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {priority}
    </span>
  );
}
