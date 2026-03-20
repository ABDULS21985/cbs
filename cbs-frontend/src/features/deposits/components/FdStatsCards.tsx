import { Landmark, Activity, AlertCircle, TrendingUp, DollarSign, RotateCw } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { FdStats } from '../api/fixedDepositApi';
import type { FixedDeposit } from '../api/fixedDepositApi';

interface FdStatsCardsProps {
  stats?: FdStats;
  deposits?: FixedDeposit[];
  isLoading?: boolean;
}

export function FdStatsCards({ stats, deposits = [], isLoading }: FdStatsCardsProps) {
  const totalInterest = deposits
    .filter((d) => d.status === 'ACTIVE')
    .reduce((s, d) => s + d.grossInterest, 0);

  const maturedCount = deposits.filter((d) => d.status === 'MATURED').length;
  const rolledOverCount = deposits.filter((d) => d.status === 'ROLLED_OVER').length;
  const rolloverRate = maturedCount + rolledOverCount > 0
    ? (rolledOverCount / (maturedCount + rolledOverCount)) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
      <StatCard
        label="Total Interest"
        value={totalInterest}
        format="money"
        compact
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        label="Rollover Rate"
        value={rolloverRate}
        format="percent"
        icon={RotateCw}
        loading={isLoading}
      />
    </div>
  );
}
