import { AlertTriangle, Clock3, Search, ShieldCheck, Target } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { FraudStats } from '../../types/fraud';

interface Props {
  stats: FraudStats | undefined;
  isLoading: boolean;
}

export function FraudStatsCards({ stats, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-6 py-4">
      <StatCard
        label="Total Alerts"
        value={stats?.totalAlerts ?? 0}
        format="number"
        icon={AlertTriangle}
        loading={isLoading}
      />
      <StatCard
        label="New Alerts"
        value={stats?.newAlerts ?? 0}
        format="number"
        icon={Clock3}
        loading={isLoading}
      />
      <StatCard
        label="Investigating"
        value={stats?.investigatingAlerts ?? 0}
        format="number"
        icon={Search}
        loading={isLoading}
      />
      <StatCard
        label="Resolved"
        value={stats?.resolvedAlerts ?? 0}
        format="number"
        icon={ShieldCheck}
        loading={isLoading}
      />
      <StatCard
        label="Resolution Rate"
        value={stats?.resolutionRate ?? 0}
        format="percent"
        icon={Target}
        loading={isLoading}
      />
    </div>
  );
}
