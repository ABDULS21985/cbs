import { AlertTriangle, DollarSign, ShieldCheck, TrendingDown, Target } from 'lucide-react';
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
        label="Active Alerts"
        value={stats?.activeAlerts ?? 0}
        format="number"
        icon={AlertTriangle}
        loading={isLoading}
      />
      <StatCard
        label="Confirmed Fraud MTD"
        value={stats?.confirmedFraudMtd ?? 0}
        format="money"
        compact
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        label="Prevented MTD"
        value={stats?.preventedMtd ?? 0}
        format="money"
        compact
        icon={ShieldCheck}
        trend="up"
        loading={isLoading}
      />
      <StatCard
        label="Loss MTD"
        value={stats?.lossMtd ?? 0}
        format="money"
        compact
        icon={TrendingDown}
        loading={isLoading}
      />
      <StatCard
        label="Detection Rate"
        value={stats?.detectionRate ?? 0}
        format="percent"
        icon={Target}
        loading={isLoading}
      />
    </div>
  );
}
