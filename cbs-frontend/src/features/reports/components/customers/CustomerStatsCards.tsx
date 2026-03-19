import { Users, UserPlus, UserMinus, TrendingUp, Layers, Percent, Star } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { CustomerStats } from '../../api/customerAnalyticsApi';

interface CustomerStatsCardsProps {
  stats: CustomerStats | undefined;
  isLoading: boolean;
}

function npsColorClass(score: number): string {
  if (score > 70) return 'text-green-600';
  if (score >= 62) return 'text-amber-600';
  return 'text-red-600';
}

export function CustomerStatsCards({ stats, isLoading }: CustomerStatsCardsProps) {
  const netGrowthTrend = stats ? (stats.netGrowth >= 0 ? 'up' : 'down') : undefined;
  const npsClass = stats ? npsColorClass(stats.npsScore) : '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={stats ? stats.totalCustomers.toLocaleString() : '0'}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          label="New MTD"
          value={stats ? stats.newMtd.toLocaleString() : '0'}
          icon={UserPlus}
          trend="up"
          loading={isLoading}
        />
        <StatCard
          label="Churned MTD"
          value={stats ? stats.churnedMtd.toLocaleString() : '0'}
          icon={UserMinus}
          trend="down"
          loading={isLoading}
        />
        <div className="stat-card">
          {isLoading ? (
            <>
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded mt-2" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="stat-label">Net Growth</div>
                <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <div className={`stat-value ${stats && stats.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats ? (stats.netGrowth >= 0 ? '+' : '') + stats.netGrowth.toLocaleString() : '0'}
              </div>
              {netGrowthTrend && (
                <div className={`stat-change flex items-center gap-1 ${netGrowthTrend === 'up' ? 'stat-change-up' : 'stat-change-down'}`}>
                  MTD net customer change
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="Avg Products / Customer"
          value={stats ? stats.avgProductsPerCustomer.toFixed(1) : '0'}
          icon={Layers}
          loading={isLoading}
        />
        <StatCard
          label="Cross-Sell Rate"
          value={stats ? `${stats.crossSellRate.toFixed(1)}%` : '0%'}
          icon={Percent}
          loading={isLoading}
        />
        <div className="stat-card">
          {isLoading ? (
            <>
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded mt-2" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="stat-label">NPS Score</div>
                <Star className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <div className={`stat-value ${npsClass}`}>
                {stats?.npsScore ?? 0}
              </div>
              <div className="stat-change text-muted-foreground text-xs mt-1">
                {stats && stats.npsScore > 70 ? 'Excellent — above target' : stats && stats.npsScore >= 62 ? 'Good — near target' : 'Below target'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
