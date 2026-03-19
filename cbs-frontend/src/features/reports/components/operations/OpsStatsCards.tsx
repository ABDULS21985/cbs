import { Activity, Clock, Users, DollarSign, AlertTriangle, Zap } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { OpsStats } from '../../api/operationalReportApi';

interface OpsStatsCardsProps {
  stats: OpsStats | undefined;
  isLoading: boolean;
}

function slaColor(pct: number): string {
  if (pct >= 95) return 'text-emerald-600';
  if (pct >= 90) return 'text-amber-600';
  return 'text-red-600';
}

export function OpsStatsCards({ stats, isLoading }: OpsStatsCardsProps) {
  const slaPct = stats?.slaAchievementPct ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="stat-card">
        {isLoading ? (
          <>
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded mt-2 animate-pulse" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="stat-label">SLA Achievement</span>
              <Activity className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <div className={cn('stat-value', slaColor(slaPct))}>
              {slaPct.toFixed(1)}%
            </div>
          </>
        )}
      </div>

      <StatCard
        label="Avg Case Resolution"
        value={stats ? `${stats.avgCaseResolutionHours.toFixed(1)}h` : '—'}
        icon={Clock}
        loading={isLoading}
      />

      <StatCard
        label="Staff Utilization"
        value={stats?.staffUtilizationPct ?? 0}
        format="percent"
        icon={Users}
        loading={isLoading}
      />

      <StatCard
        label="Cost per Transaction"
        value={stats?.costPerTransaction ?? 0}
        format="money"
        icon={DollarSign}
        loading={isLoading}
      />

      <StatCard
        label="Downtime"
        value={stats ? `${stats.downtimeHours.toFixed(1)}h` : '—'}
        icon={AlertTriangle}
        loading={isLoading}
      />

      <StatCard
        label="Automation Rate"
        value={stats?.automationRatePct ?? 0}
        format="percent"
        icon={Zap}
        loading={isLoading}
      />
    </div>
  );
}
