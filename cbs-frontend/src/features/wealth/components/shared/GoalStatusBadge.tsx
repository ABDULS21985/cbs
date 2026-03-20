import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Status Configuration ────────────────────────────────────────────────────

type GoalStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

interface GoalStatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

const GOAL_STATUS_MAP: Record<GoalStatus, GoalStatusConfig> = {
  ON_TRACK: {
    label: 'On Track',
    icon: CheckCircle2,
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  AT_RISK: {
    label: 'At Risk',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  OFF_TRACK: {
    label: 'Off Track',
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface GoalStatusBadgeProps {
  status: GoalStatus;
}

export function GoalStatusBadge({ status }: GoalStatusBadgeProps) {
  const config = GOAL_STATUS_MAP[status];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Goal status: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
