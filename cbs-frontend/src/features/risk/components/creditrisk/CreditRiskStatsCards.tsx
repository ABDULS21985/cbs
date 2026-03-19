import { DollarSign, TrendingDown, Shield, BarChart3, Activity } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { CreditRiskStats } from '../../types/creditRisk';

interface CreditRiskStatsCardsProps {
  stats?: CreditRiskStats;
  isLoading?: boolean;
}

export function CreditRiskStatsCards({ stats, isLoading }: CreditRiskStatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCard key={i} label="" value={0} loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        label="Total Exposure"
        value={stats.totalExposure}
        format="money"
        compact
        icon={DollarSign}
      />
      <StatCard
        label={`NPL (${stats.nplRatio.toFixed(1)}%)`}
        value={stats.nplAmount}
        format="money"
        compact
        icon={TrendingDown}
      />
      <StatCard
        label="Provision Coverage"
        value={stats.provisionCoverage}
        format="percent"
        icon={Shield}
      />
      <StatCard
        label="Avg PD"
        value={stats.avgPd}
        format="percent"
        icon={BarChart3}
      />
      <StatCard
        label="Avg LGD"
        value={stats.avgLgd}
        format="percent"
        icon={Activity}
      />
    </div>
  );
}
