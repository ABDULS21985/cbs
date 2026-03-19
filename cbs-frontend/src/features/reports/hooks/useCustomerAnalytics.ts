import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfQuarter, endOfQuarter, subQuarters, startOfYear } from 'date-fns';
import { customerAnalyticsApi } from '../api/customerAnalyticsApi';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function useCustomerAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfQuarter(new Date()),
    to: new Date(),
  });

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const statsQuery = useQuery({
    queryKey: ['customer-analytics', 'stats', params],
    queryFn: () => customerAnalyticsApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const funnelQuery = useQuery({
    queryKey: ['customer-analytics', 'funnel', params],
    queryFn: () => customerAnalyticsApi.getAcquisitionFunnel(params),
    staleTime: 5 * 60 * 1000,
  });

  const growthQuery = useQuery({
    queryKey: ['customer-analytics', 'growth', params],
    queryFn: () => customerAnalyticsApi.getGrowthTrend(params),
    staleTime: 5 * 60 * 1000,
  });

  const lifecycleQuery = useQuery({
    queryKey: ['customer-analytics', 'lifecycle', params],
    queryFn: () => customerAnalyticsApi.getLifecycleDistribution(params),
    staleTime: 5 * 60 * 1000,
  });

  const segmentsQuery = useQuery({
    queryKey: ['customer-analytics', 'segments', params],
    queryFn: () => customerAnalyticsApi.getSegmentProfitability(params),
    staleTime: 5 * 60 * 1000,
  });

  const churnQuery = useQuery({
    queryKey: ['customer-analytics', 'churn', params],
    queryFn: () => customerAnalyticsApi.getChurnAnalysis(params),
    staleTime: 5 * 60 * 1000,
  });

  const atRiskQuery = useQuery({
    queryKey: ['customer-analytics', 'at-risk', params],
    queryFn: () => customerAnalyticsApi.getAtRiskCustomers(params),
    staleTime: 5 * 60 * 1000,
  });

  const crossSellQuery = useQuery({
    queryKey: ['customer-analytics', 'cross-sell', params],
    queryFn: () => customerAnalyticsApi.getCrossSellMatrix(params),
    staleTime: 5 * 60 * 1000,
  });

  const penetrationQuery = useQuery({
    queryKey: ['customer-analytics', 'penetration', params],
    queryFn: () => customerAnalyticsApi.getProductPenetration(params),
    staleTime: 5 * 60 * 1000,
  });

  const ltvQuery = useQuery({
    queryKey: ['customer-analytics', 'ltv', params],
    queryFn: () => customerAnalyticsApi.getLtvDistribution(params),
    staleTime: 5 * 60 * 1000,
  });

  return {
    dateRange,
    setDateRange,

    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    funnel: funnelQuery.data ?? [],
    funnelLoading: funnelQuery.isLoading,

    growth: growthQuery.data ?? [],
    growthLoading: growthQuery.isLoading,

    lifecycle: lifecycleQuery.data ?? [],
    lifecycleLoading: lifecycleQuery.isLoading,

    segments: segmentsQuery.data ?? [],
    segmentsLoading: segmentsQuery.isLoading,

    churnTrend: churnQuery.data?.trend ?? [],
    churnReasons: churnQuery.data?.reasons ?? [],
    churnLoading: churnQuery.isLoading,

    atRisk: atRiskQuery.data ?? [],
    atRiskLoading: atRiskQuery.isLoading,

    crossSell: crossSellQuery.data ?? [],
    crossSellLoading: crossSellQuery.isLoading,

    penetration: penetrationQuery.data ?? [],
    penetrationLoading: penetrationQuery.isLoading,

    ltv: ltvQuery.data ?? [],
    ltvLoading: ltvQuery.isLoading,
  };
}

export function getDatePresets() {
  const now = new Date();
  return [
    {
      label: 'This Quarter',
      range: { from: startOfQuarter(now), to: now },
    },
    {
      label: 'Last Quarter',
      range: {
        from: startOfQuarter(subQuarters(now, 1)),
        to: endOfQuarter(subQuarters(now, 1)),
      },
    },
    {
      label: 'Year to Date',
      range: { from: startOfYear(now), to: now },
    },
    {
      label: 'Last Year',
      range: {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31),
      },
    },
  ];
}
