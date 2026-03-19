import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as Tabs from '@radix-ui/react-tabs';
import { BarChart2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker, EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import { marketingAnalyticsApi } from '../api/marketingAnalyticsApi';
import type { Campaign } from '../api/marketingAnalyticsApi';
import { useMarketingAnalytics } from '../hooks/useMarketingAnalytics';
import { MarketingStatsCards } from '../components/marketing/MarketingStatsCards';
import { CampaignPerformanceTable } from '../components/marketing/CampaignPerformanceTable';
import { CampaignDetailView } from '../components/marketing/CampaignDetailView';
import { NpsTrendChart } from '../components/marketing/NpsTrendChart';
import { NpsDistributionChart } from '../components/marketing/NpsDistributionChart';
import { CsatTouchpointTable } from '../components/marketing/CsatTouchpointTable';
import { LeadFunnelTable } from '../components/marketing/LeadFunnelTable';
import { CostPerAcquisitionChart } from '../components/marketing/CostPerAcquisitionChart';

const TABS = [
  { value: 'campaigns', label: 'Campaign Performance' },
  { value: 'surveys', label: 'Survey Results' },
  { value: 'funnel', label: 'Lead Funnel' },
  { value: 'brand', label: 'Brand Metrics' },
];

export function MarketingAnalyticsPage() {
  const {
    dateRange,
    setDateRange,
    stats,
    statsLoading,
    campaigns,
    campaignsLoading,
    csatTouchpoints,
    npsDistribution,
    surveyLoading,
    npsTrend,
    npsTrendLoading,
    leadFunnel,
    leadFunnelLoading,
  } = useMarketingAnalytics();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['marketing-analytics', 'campaign-detail', selectedCampaignId],
    queryFn: () => marketingAnalyticsApi.getCampaignDetail(selectedCampaignId!),
    enabled: !!selectedCampaignId,
    staleTime: 5 * 60 * 1000,
  });

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setDetailOpen(true);
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
    } else if (range.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  };

  return (
    <>
      <PageHeader
        title="Marketing & Campaign Analytics"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to }}
            onChange={handleDateRangeChange}
          />
        }
      />

      <div className="page-container space-y-6">
        <MarketingStatsCards stats={stats} isLoading={statsLoading} />

        <Tabs.Root defaultValue="campaigns">
          <Tabs.List className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5 w-fit">
            {TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  'text-muted-foreground hover:text-foreground',
                  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                )}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Campaign Performance */}
          <Tabs.Content value="campaigns" className="mt-4 space-y-4">
            <CampaignPerformanceTable
              data={campaigns}
              isLoading={campaignsLoading}
              onRowClick={handleCampaignClick}
            />
            <CampaignDetailView
              campaign={detailQuery.data ?? null}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
            />
          </Tabs.Content>

          {/* Survey Results */}
          <Tabs.Content value="surveys" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NpsTrendChart data={npsTrend} />
              <NpsDistributionChart data={npsDistribution} />
            </div>
            <CsatTouchpointTable data={csatTouchpoints} isLoading={surveyLoading || npsTrendLoading} />
          </Tabs.Content>

          {/* Lead Funnel */}
          <Tabs.Content value="funnel" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-1">
                <LeadFunnelTable data={leadFunnel} isLoading={leadFunnelLoading} />
              </div>
              <CostPerAcquisitionChart data={leadFunnel} />
            </div>
          </Tabs.Content>

          {/* Brand Metrics */}
          <Tabs.Content value="brand" className="mt-4">
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={BarChart2}
                title="Brand Metrics Coming Soon"
                description="Brand awareness tracking, share of voice, and sentiment analysis will be available in an upcoming release."
              />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </>
  );
}
