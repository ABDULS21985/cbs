import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as Tabs from '@radix-ui/react-tabs';
import { BarChart2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Campaign } from '../api/marketingAnalyticsApi';
import { useMarketingAnalytics } from '../hooks/useMarketingAnalytics';
import { MarketingStatsCards } from '../components/marketing/MarketingStatsCards';
import { CampaignPerformanceTable } from '../components/marketing/CampaignPerformanceTable';
import { CampaignDetailView } from '../components/marketing/CampaignDetailView';
import { NpsTrendChart } from '../components/marketing/NpsTrendChart';
import { LeadFunnelTable } from '../components/marketing/LeadFunnelTable';
import { CostPerAcquisitionChart } from '../components/marketing/CostPerAcquisitionChart';

const TABS = [
  { value: 'campaigns', label: 'Campaign Performance' },
  { value: 'surveys', label: 'Survey Results' },
  { value: 'funnel', label: 'Lead Funnel' },
  { value: 'brand', label: 'Brand Metrics' },
];

export function MarketingAnalyticsPage() {
  useEffect(() => { document.title = 'Marketing Analytics | CBS'; }, []);
  const {
    dateRange,
    setDateRange,
    stats,
    statsLoading,
    campaigns,
    campaignsLoading,
    surveys,
    surveyLoading,
    npsTrend,
    npsTrendLoading,
    leadFunnel,
    leadFunnelLoading,
  } = useMarketingAnalytics();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const campaignDetail = selectedCampaign
    ? {
        ...selectedCampaign,
        funnelSteps: [
          { stage: 'Sent', count: selectedCampaign.sentCount, rate: 100 },
          { stage: 'Delivered', count: selectedCampaign.deliveredCount, rate: selectedCampaign.deliveryRate },
          { stage: 'Opened', count: selectedCampaign.openedCount, rate: selectedCampaign.openRate },
          { stage: 'Clicked', count: selectedCampaign.clickedCount, rate: selectedCampaign.clickThroughRate },
          { stage: 'Converted', count: selectedCampaign.convertedCount, rate: selectedCampaign.conversionRate },
        ].filter((step) => step.count > 0),
      }
    : null;

  const totalSurveySent = surveys.reduce((sum, survey) => sum + survey.totalSent, 0);
  const totalSurveyResponses = surveys.reduce((sum, survey) => sum + survey.totalResponses, 0);
  const overallSurveyResponseRate = totalSurveySent > 0 ? (totalSurveyResponses / totalSurveySent) * 100 : 0;
  const totalDelivered = campaigns.reduce((sum, campaign) => sum + campaign.deliveredCount, 0);
  const totalClicked = campaigns.reduce((sum, campaign) => sum + campaign.clickedCount, 0);
  const totalOpened = campaigns.reduce((sum, campaign) => sum + campaign.openedCount, 0);
  const campaignEngagementRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
  const campaignOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const topSurvey = [...surveys].sort((left, right) => right.responseRate - left.responseRate)[0] ?? null;
  const topCampaign = [...campaigns].sort((left, right) => right.conversionRate - left.conversionRate)[0] ?? null;

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
              campaign={campaignDetail}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
            />
          </Tabs.Content>

          {/* Survey Results */}
          <Tabs.Content value="surveys" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-4">
              <NpsTrendChart data={npsTrend} />
              <div className="surface-card p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Survey Coverage</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Survey delivery and response metrics returned by the backend reporting service.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Surveys</div>
                    <div className="mt-1 text-xl font-bold">{surveys.length}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Response Rate</div>
                    <div className="mt-1 text-xl font-bold">{formatPercent(overallSurveyResponseRate, 1)}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Responses</div>
                    <div className="mt-1 text-xl font-bold">{totalSurveyResponses.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Top Survey</div>
                    <div className="mt-1 text-sm font-semibold">{topSurvey?.name ?? 'No survey data'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="surface-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20">
                <h3 className="text-sm font-semibold text-foreground">Survey Results</h3>
              </div>
              {surveyLoading || npsTrendLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Survey</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Responses</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Response Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {surveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{survey.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{survey.totalSent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{survey.totalResponses.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatPercent(survey.responseRate, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="surface-card p-4">
                <div className="text-xs text-muted-foreground">NPS</div>
                <div className="mt-1 text-2xl font-bold">{stats?.npsScore ?? 0}</div>
              </div>
              <div className="surface-card p-4">
                <div className="text-xs text-muted-foreground">Campaign Open Rate</div>
                <div className="mt-1 text-2xl font-bold">{formatPercent(campaignOpenRate, 1)}</div>
              </div>
              <div className="surface-card p-4">
                <div className="text-xs text-muted-foreground">Engagement Rate</div>
                <div className="mt-1 text-2xl font-bold">{formatPercent(campaignEngagementRate, 1)}</div>
              </div>
              <div className="surface-card p-4">
                <div className="text-xs text-muted-foreground">Survey Response Rate</div>
                <div className="mt-1 text-2xl font-bold">{formatPercent(overallSurveyResponseRate, 1)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="surface-card p-4">
                <h3 className="text-sm font-semibold mb-3">Top Campaign</h3>
                {topCampaign ? (
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{topCampaign.name}</div>
                    <div className="text-muted-foreground">Conversion Rate: {formatPercent(topCampaign.conversionRate, 1)}</div>
                    <div className="text-muted-foreground">Revenue: {formatMoney(topCampaign.revenueGenerated)}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No campaign data returned.</div>
                )}
              </div>
              <div className="surface-card p-4">
                <h3 className="text-sm font-semibold mb-3">Sentiment Summary</h3>
                <div className="text-sm text-muted-foreground">
                  Brand health in this build is derived from campaign engagement and survey response/NPS data returned by the backend reporting service.
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  <span>{npsTrend.length} monthly NPS data points available.</span>
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </>
  );
}
