import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfQuarter } from 'date-fns';
import { channelAnalyticsApi } from '../api/channelAnalyticsApi';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function useChannelAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfQuarter(new Date()),
    to: new Date(),
  });

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const statsQuery = useQuery({
    queryKey: ['channel-analytics', 'stats', params],
    queryFn: () => channelAnalyticsApi.getChannelStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const volumesQuery = useQuery({
    queryKey: ['channel-analytics', 'volumes', params],
    queryFn: () => channelAnalyticsApi.getChannelVolumes(params),
    staleTime: 5 * 60 * 1000,
  });

  const mixTrendQuery = useQuery({
    queryKey: ['channel-analytics', 'mix-trend'],
    queryFn: () => channelAnalyticsApi.getChannelMixTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const heatmapQuery = useQuery({
    queryKey: ['channel-analytics', 'heatmap', params],
    queryFn: () => channelAnalyticsApi.getHourlyHeatmap(params),
    staleTime: 5 * 60 * 1000,
  });

  const successRatesQuery = useQuery({
    queryKey: ['channel-analytics', 'success-rates', params],
    queryFn: () => channelAnalyticsApi.getChannelSuccessRates(params),
    staleTime: 5 * 60 * 1000,
  });

  const successTrendQuery = useQuery({
    queryKey: ['channel-analytics', 'success-trend'],
    queryFn: () => channelAnalyticsApi.getSuccessRateTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const adoptionQuery = useQuery({
    queryKey: ['channel-analytics', 'adoption'],
    queryFn: () => channelAnalyticsApi.getDigitalAdoption(),
    staleTime: 5 * 60 * 1000,
  });

  const txnTypesQuery = useQuery({
    queryKey: ['channel-analytics', 'txn-types', params],
    queryFn: () => channelAnalyticsApi.getTransactionTypes(params),
    staleTime: 5 * 60 * 1000,
  });

  const migrationsQuery = useQuery({
    queryKey: ['channel-analytics', 'migrations'],
    queryFn: () => channelAnalyticsApi.getMigrationData(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    dateRange,
    setDateRange,

    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.isError,

    volumes: volumesQuery.data ?? [],
    volumesLoading: volumesQuery.isLoading,
    volumesError: volumesQuery.isError,

    mixTrend: mixTrendQuery.data ?? [],
    mixTrendLoading: mixTrendQuery.isLoading,
    mixTrendError: mixTrendQuery.isError,

    heatmap: heatmapQuery.data ?? [],
    heatmapLoading: heatmapQuery.isLoading,
    heatmapError: heatmapQuery.isError,

    successRates: successRatesQuery.data ?? [],
    successRatesLoading: successRatesQuery.isLoading,
    successRatesError: successRatesQuery.isError,

    successTrend: successTrendQuery.data ?? [],
    successTrendLoading: successTrendQuery.isLoading,
    successTrendError: successTrendQuery.isError,

    adoption: adoptionQuery.data,
    adoptionLoading: adoptionQuery.isLoading,
    adoptionError: adoptionQuery.isError,

    txnTypes: txnTypesQuery.data ?? [],
    txnTypesLoading: txnTypesQuery.isLoading,
    txnTypesError: txnTypesQuery.isError,

    migrations: migrationsQuery.data,
    migrationsLoading: migrationsQuery.isLoading,
    migrationsError: migrationsQuery.isError,

    hasLoadError:
      statsQuery.isError ||
      volumesQuery.isError ||
      mixTrendQuery.isError ||
      heatmapQuery.isError ||
      successRatesQuery.isError ||
      successTrendQuery.isError ||
      adoptionQuery.isError ||
      txnTypesQuery.isError ||
      migrationsQuery.isError,
  };
}
