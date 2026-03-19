import { Landmark, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { FdStats } from '../api/fixedDepositApi';

interface FdStatsCardsProps {
  stats?: FdStats;
  isLoading?: boolean;
}

export function FdStatsCards({ stats, isLoading }: FdStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total FD Balance"
        value={stats?.totalBalance ?? 0}
        format="money"
        compact
        icon={Landmark}
        loading={isLoading}
      />
      <StatCard
        label="Active Fixed Deposits"
        value={stats?.activeFds ?? 0}
        format="number"
        icon={Activity}
        loading={isLoading}
      />
      <StatCard
        label="Maturing in 30 Days"
        value={stats?.maturingSoon ?? 0}
        format="number"
        icon={AlertCircle}
        loading={isLoading}
      />
      <StatCard
        label="Average Rate"
        value={stats?.averageRate ?? 0}
        format="percent"
        icon={TrendingUp}
        loading={isLoading}
      />
    </div>
  );
}
