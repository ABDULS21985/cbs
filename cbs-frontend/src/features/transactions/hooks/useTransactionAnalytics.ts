import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  differenceInCalendarDays,
  format,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import { transactionAnalyticsApi } from '../api/transactionAnalyticsApi';

export type AnalyticsPeriodPreset = 'today' | 'week' | 'mtd' | 'ytd' | 'custom';

export interface AnalyticsDateRange {
  from: Date;
  to: Date;
}

function toDateParam(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function buildRange(period: AnalyticsPeriodPreset): AnalyticsDateRange {
  const today = new Date();
  switch (period) {
    case 'today':
      return { from: startOfToday(), to: today };
    case 'week':
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
    case 'ytd':
      return { from: startOfYear(today), to: today };
    case 'custom':
      return { from: startOfMonth(today), to: today };
    case 'mtd':
    default:
      return { from: startOfMonth(today), to: today };
  }
}

function deriveGranularity(range: AnalyticsDateRange): 'day' | 'week' | 'month' {
  const daySpan = differenceInCalendarDays(range.to, range.from) + 1;
  if (daySpan > 365) return 'month';
  if (daySpan > 92) return 'week';
  return 'day';
}

function buildPriorRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const span = differenceInCalendarDays(range.to, range.from) + 1;
  const priorTo = subDays(range.from, 1);
  return {
    from: subDays(priorTo, span - 1),
    to: priorTo,
  };
}

export function useTransactionAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriodPreset>('mtd');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(buildRange('mtd'));
  const [showComparison, setShowComparison] = useState(false);

  const rangeParams = useMemo(
    () => ({
      from: toDateParam(dateRange.from),
      to: toDateParam(dateRange.to),
    }),
    [dateRange],
  );
  const granularity = useMemo(() => deriveGranularity(dateRange), [dateRange]);
  const priorRange = useMemo(() => buildPriorRange(dateRange), [dateRange]);
  const priorParams = useMemo(
    () => ({
      from: toDateParam(priorRange.from),
      to: toDateParam(priorRange.to),
    }),
    [priorRange],
  );

  const summaryQuery = useQuery({
    queryKey: ['transaction-analytics', 'summary', rangeParams],
    queryFn: () => transactionAnalyticsApi.getSummary(rangeParams),
    staleTime: 60_000,
  });

  const priorSummaryQuery = useQuery({
    queryKey: ['transaction-analytics', 'summary', 'prior', priorParams],
    queryFn: () => transactionAnalyticsApi.getSummary(priorParams),
    enabled: showComparison,
    staleTime: 60_000,
  });

  const volumeTrendQuery = useQuery({
    queryKey: ['transaction-analytics', 'volume-trend', rangeParams, granularity],
    queryFn: () => transactionAnalyticsApi.getVolumeTrend({ ...rangeParams, granularity }),
    staleTime: 60_000,
  });

  const priorVolumeTrendQuery = useQuery({
    queryKey: ['transaction-analytics', 'volume-trend', 'prior', priorParams, granularity],
    queryFn: () => transactionAnalyticsApi.getVolumeTrend({ ...priorParams, granularity }),
    enabled: showComparison,
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['transaction-analytics', 'categories', rangeParams],
    queryFn: () => transactionAnalyticsApi.getCategories(rangeParams),
    staleTime: 60_000,
  });

  const priorCategoriesQuery = useQuery({
    queryKey: ['transaction-analytics', 'categories', 'prior', priorParams],
    queryFn: () => transactionAnalyticsApi.getCategories(priorParams),
    enabled: showComparison,
    staleTime: 60_000,
  });

  const channelsQuery = useQuery({
    queryKey: ['transaction-analytics', 'channels', rangeParams],
    queryFn: () => transactionAnalyticsApi.getChannels(rangeParams),
    staleTime: 60_000,
  });

  const priorChannelsQuery = useQuery({
    queryKey: ['transaction-analytics', 'channels', 'prior', priorParams],
    queryFn: () => transactionAnalyticsApi.getChannels(priorParams),
    enabled: showComparison,
    staleTime: 60_000,
  });

  const topAccountsQuery = useQuery({
    queryKey: ['transaction-analytics', 'top-accounts', rangeParams],
    queryFn: () => transactionAnalyticsApi.getTopAccounts({ ...rangeParams, limit: 100 }),
    staleTime: 60_000,
  });

  const failuresQuery = useQuery({
    queryKey: ['transaction-analytics', 'failures', rangeParams],
    queryFn: () => transactionAnalyticsApi.getFailures(rangeParams),
    staleTime: 60_000,
  });

  const priorFailuresQuery = useQuery({
    queryKey: ['transaction-analytics', 'failures', 'prior', priorParams],
    queryFn: () => transactionAnalyticsApi.getFailures(priorParams),
    enabled: showComparison,
    staleTime: 60_000,
  });

  const heatmapQuery = useQuery({
    queryKey: ['transaction-analytics', 'hourly-heatmap', rangeParams],
    queryFn: () => transactionAnalyticsApi.getHourlyHeatmap(rangeParams),
    staleTime: 60_000,
  });

  return {
    period,
    setPeriod: (next: AnalyticsPeriodPreset) => {
      setPeriod(next);
      if (next !== 'custom') {
        setDateRange(buildRange(next));
      }
    },
    dateRange,
    setDateRange: (next: AnalyticsDateRange) => {
      setPeriod('custom');
      setDateRange(next);
    },
    showComparison,
    setShowComparison,
    granularity,
    rangeParams,
    priorRange,
    priorParams,
    summary: summaryQuery.data ?? null,
    summaryLoading: summaryQuery.isLoading,
    priorSummary: priorSummaryQuery.data ?? null,
    volumeTrend: volumeTrendQuery.data ?? [],
    volumeTrendLoading: volumeTrendQuery.isLoading,
    priorVolumeTrend: priorVolumeTrendQuery.data ?? [],
    categories: categoriesQuery.data ?? null,
    categoriesLoading: categoriesQuery.isLoading,
    priorCategories: priorCategoriesQuery.data ?? null,
    channels: channelsQuery.data ?? null,
    channelsLoading: channelsQuery.isLoading,
    priorChannels: priorChannelsQuery.data ?? null,
    topAccounts: topAccountsQuery.data ?? [],
    topAccountsLoading: topAccountsQuery.isLoading,
    failures: failuresQuery.data ?? null,
    failuresLoading: failuresQuery.isLoading,
    priorFailures: priorFailuresQuery.data ?? null,
    heatmap: heatmapQuery.data ?? null,
    heatmapLoading: heatmapQuery.isLoading,
    isLoading:
      summaryQuery.isLoading ||
      volumeTrendQuery.isLoading ||
      categoriesQuery.isLoading ||
      channelsQuery.isLoading ||
      topAccountsQuery.isLoading ||
      failuresQuery.isLoading ||
      heatmapQuery.isLoading,
  };
}
