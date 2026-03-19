import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { paymentAnalyticsApi } from '../api/paymentAnalyticsApi';

type GroupBy = 'day' | 'week' | 'month';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function usePaymentAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const statsQuery = useQuery({
    queryKey: ['payment-analytics', 'stats', params],
    queryFn: () => paymentAnalyticsApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const trendQuery = useQuery({
    queryKey: ['payment-analytics', 'trend', params, groupBy],
    queryFn: () => paymentAnalyticsApi.getVolumeTrend({ ...params, groupBy }),
    staleTime: 5 * 60 * 1000,
  });

  const channelsQuery = useQuery({
    queryKey: ['payment-analytics', 'channels', params],
    queryFn: () => paymentAnalyticsApi.getChannelBreakdown(params),
    staleTime: 5 * 60 * 1000,
  });

  const failuresQuery = useQuery({
    queryKey: ['payment-analytics', 'failures', params],
    queryFn: () => paymentAnalyticsApi.getFailureAnalysis(params),
    staleTime: 5 * 60 * 1000,
  });

  const railsQuery = useQuery({
    queryKey: ['payment-analytics', 'rails', params],
    queryFn: () => paymentAnalyticsApi.getRailsUtilization(params),
    staleTime: 5 * 60 * 1000,
  });

  const reconciliationQuery = useQuery({
    queryKey: ['payment-analytics', 'reconciliation', params],
    queryFn: () => paymentAnalyticsApi.getReconciliationSummary(params),
    staleTime: 5 * 60 * 1000,
  });

  return {
    dateRange,
    setDateRange,
    groupBy,
    setGroupBy,

    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    trend: trendQuery.data ?? [],
    trendLoading: trendQuery.isLoading,

    channels: channelsQuery.data ?? [],
    channelsLoading: channelsQuery.isLoading,

    failureReasons: failuresQuery.data?.reasons ?? [],
    topFailed: failuresQuery.data?.topFailed ?? [],
    failuresLoading: failuresQuery.isLoading,

    rails: railsQuery.data ?? [],
    railsLoading: railsQuery.isLoading,

    reconciliation: reconciliationQuery.data ?? [],
    reconciliationLoading: reconciliationQuery.isLoading,
  };
}
