import { cn } from '@/lib/utils';

// ─── Status Color Mapping ────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  ACTIVE: {
    label: 'Active',
    dotColor: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  CLOSED: {
    label: 'Closed',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
  SUSPENDED: {
    label: 'Suspended',
    dotColor: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
};

const DEFAULT_STATUS: StatusConfig = {
  label: 'Unknown',
  dotColor: 'bg-gray-400',
  bgColor: 'bg-gray-100 dark:bg-gray-800',
  textColor: 'text-gray-600 dark:text-gray-400',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface PlanStatusBadgeProps {
  status: string;
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? DEFAULT_STATUS;

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
