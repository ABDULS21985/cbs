import { DollarSign, Hash, CheckCircle, Clock, XCircle } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { PaymentStats } from '../../api/paymentAnalyticsApi';

interface PaymentStatsCardsProps {
  stats: PaymentStats | undefined;
  isLoading: boolean;
}

export function PaymentStatsCards({ stats, isLoading }: PaymentStatsCardsProps) {
  const successTrend = stats
    ? stats.vsLastPeriod.successRate >= 0
      ? 'up'
      : 'down'
    : undefined;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="Total Volume"
        value={stats?.totalVolume ?? 0}
        format="money"
        compact
        change={stats?.vsLastPeriod.volume}
        changePeriod="vs last period"
        trend={stats ? (stats.vsLastPeriod.volume >= 0 ? 'up' : 'down') : undefined}
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        label="Transactions"
        value={stats ? `${(stats.transactionCount / 1000).toFixed(1)}K` : '0'}
        change={stats?.vsLastPeriod.count}
        changePeriod="vs last period"
        trend={stats ? (stats.vsLastPeriod.count >= 0 ? 'up' : 'down') : undefined}
        icon={Hash}
        loading={isLoading}
      />
      <StatCard
        label="Success Rate"
        value={stats?.successRate ?? 0}
        format="percent"
        change={stats?.vsLastPeriod.successRate}
        changePeriod="vs last period"
        trend={successTrend}
        icon={CheckCircle}
        loading={isLoading}
      />
      <StatCard
        label="Avg Processing"
        value={stats ? `${stats.avgProcessingSeconds.toFixed(1)}s` : '0s'}
        icon={Clock}
        loading={isLoading}
      />
      <StatCard
        label="Failed Volume"
        value={stats?.failedVolume ?? 0}
        format="money"
        compact
        trend={stats ? 'down' : undefined}
        icon={XCircle}
        loading={isLoading}
      />
    </div>
  );
}
