import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'down';
  uptimePct: number;
  avgLatencyMs: number;
  errorRate: number;
  requestsPerMin: number;
}

interface ApiHealthDashboardProps {
  metrics: HealthMetrics;
  loading?: boolean;
  hasData?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  healthy: {
    label: 'Operational',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  down: {
    label: 'Down',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    icon: XCircle,
  },
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function ApiHealthDashboard({ metrics, loading, hasData = true }: ApiHealthDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ob-monitor-panel p-4 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="ob-monitor-empty-state">
        <Activity className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground">No monitoring feed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            API health cards will populate when marketplace usage aggregates arrive.
          </p>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[metrics.status];
  const StatusIcon = statusCfg.icon;

  const cards = [
    {
      label: 'API Status',
      value: statusCfg.label,
      icon: StatusIcon,
      valueClass: statusCfg.color,
      extra: (
        <span className={cn('w-2 h-2 rounded-full animate-pulse', statusCfg.dot)} />
      ),
    },
    {
      label: 'Uptime',
      value: `${metrics.uptimePct.toFixed(2)}%`,
      icon: Activity,
      valueClass: metrics.uptimePct >= 99.9 ? 'text-green-600' : metrics.uptimePct >= 99 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avgLatencyMs.toFixed(0)} ms`,
      icon: Clock,
      valueClass: metrics.avgLatencyMs <= 200 ? 'text-green-600' : metrics.avgLatencyMs <= 500 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Error Rate',
      value: `${metrics.errorRate.toFixed(2)}%`,
      icon: AlertTriangle,
      valueClass: metrics.errorRate <= 1 ? 'text-green-600' : metrics.errorRate <= 5 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Req / min',
      value: metrics.requestsPerMin.toLocaleString(),
      icon: Zap,
      valueClass: 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              'ob-monitor-panel flex flex-col gap-2 p-4',
              card.label === 'API Status' && statusCfg.bg,
              card.label === 'API Status' && statusCfg.border,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </span>
              <Icon className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="flex items-center gap-2">
              {card.extra}
              <span className={cn('text-xl font-bold tabular-nums', card.valueClass)}>
                {card.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
