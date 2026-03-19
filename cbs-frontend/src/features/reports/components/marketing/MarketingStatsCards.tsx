import { Megaphone, Users, TrendingUp, DollarSign, BarChart2, Star } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type { MarketingStats } from '../../api/marketingAnalyticsApi';

interface MarketingStatsCardsProps {
  stats: MarketingStats | undefined;
  isLoading: boolean;
}

export function MarketingStatsCards({ stats, isLoading }: MarketingStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Active Campaigns"
        value={stats?.activeCampaigns ?? 0}
        format="number"
        icon={Megaphone}
        loading={isLoading}
      />
      <StatCard
        label="Leads MTD"
        value={stats ? stats.leadsGeneratedMtd.toLocaleString() : '0'}
        icon={Users}
        loading={isLoading}
      />
      <StatCard
        label="Conversion Rate"
        value={stats?.conversionRate ?? 0}
        format="percent"
        icon={TrendingUp}
        loading={isLoading}
      />
      <StatCard
        label="Campaign Spend MTD"
        value={stats ? formatMoney(stats.campaignSpendMtd) : '₦0.00'}
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        label="ROI"
        value={stats ? `${stats.roi.toFixed(1)}x` : '0x'}
        icon={BarChart2}
        loading={isLoading}
      />
      <StatCard
        label="NPS Score"
        value={stats?.npsScore ?? 0}
        format="number"
        icon={Star}
        loading={isLoading}
      />
    </div>
  );
}
