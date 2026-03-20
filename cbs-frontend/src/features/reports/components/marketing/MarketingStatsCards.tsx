import { Megaphone, Users, TrendingUp, BarChart2, Star } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { MarketingStats } from '../../api/marketingAnalyticsApi';

interface MarketingStatsCardsProps {
  stats: MarketingStats | undefined;
  isLoading: boolean;
}

export function MarketingStatsCards({ stats, isLoading }: MarketingStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Campaigns"
        value={stats?.totalCampaigns ?? 0}
        format="number"
        icon={Megaphone}
        loading={isLoading}
      />
      <StatCard
        label="Total Leads"
        value={stats?.totalLeads ?? 0}
        format="number"
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
        label="Conversions"
        value={stats?.totalConversions ?? 0}
        format="number"
        icon={TrendingUp}
        loading={isLoading}
      />
      <StatCard
        label="Avg Leads / Campaign"
        value={stats?.averageLeadsPerCampaign ?? 0}
        format="number"
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
