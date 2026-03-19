import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { marketingAnalyticsApi } from '../api/marketingAnalyticsApi';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function useMarketingAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const statsQuery = useQuery({
    queryKey: ['marketing-analytics', 'stats', params],
    queryFn: () => marketingAnalyticsApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const campaignsQuery = useQuery({
    queryKey: ['marketing-analytics', 'campaigns', params],
    queryFn: () => marketingAnalyticsApi.getCampaigns(params),
    staleTime: 5 * 60 * 1000,
  });

  const surveyQuery = useQuery({
    queryKey: ['marketing-analytics', 'surveys', params],
    queryFn: () => marketingAnalyticsApi.getSurveyResults(params),
    staleTime: 5 * 60 * 1000,
  });

  const npsTrendQuery = useQuery({
    queryKey: ['marketing-analytics', 'nps-trend'],
    queryFn: () => marketingAnalyticsApi.getNpsTrend(12),
    staleTime: 5 * 60 * 1000,
  });

  const leadFunnelQuery = useQuery({
    queryKey: ['marketing-analytics', 'lead-funnel', params],
    queryFn: () => marketingAnalyticsApi.getLeadFunnel(params),
    staleTime: 5 * 60 * 1000,
  });

  return {
    dateRange,
    setDateRange,

    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    campaigns: campaignsQuery.data ?? [],
    campaignsLoading: campaignsQuery.isLoading,

    csatTouchpoints: surveyQuery.data?.csatTouchpoints ?? [],
    npsDistribution: surveyQuery.data?.npsDistribution ?? [],
    surveyLoading: surveyQuery.isLoading,

    npsTrend: npsTrendQuery.data ?? [],
    npsTrendLoading: npsTrendQuery.isLoading,

    leadFunnel: leadFunnelQuery.data ?? [],
    leadFunnelLoading: leadFunnelQuery.isLoading,
  };
}
