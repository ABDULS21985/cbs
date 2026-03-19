import { useQuery } from '@tanstack/react-query';
import { depositAnalyticsApi } from '../api/depositAnalyticsApi';

export function useDepositAnalytics() {
  const statsQuery = useQuery({
    queryKey: ['deposit-analytics', 'stats'],
    queryFn: () => depositAnalyticsApi.getDepositStats(),
    staleTime: 5 * 60 * 1000,
  });

  const mixQuery = useQuery({
    queryKey: ['deposit-analytics', 'mix'],
    queryFn: () => depositAnalyticsApi.getDepositMix(),
    staleTime: 5 * 60 * 1000,
  });

  const growthTrendQuery = useQuery({
    queryKey: ['deposit-analytics', 'growth-trend'],
    queryFn: () => depositAnalyticsApi.getDepositGrowthTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const topDepositorsQuery = useQuery({
    queryKey: ['deposit-analytics', 'top-depositors'],
    queryFn: () => depositAnalyticsApi.getTopDepositors(),
    staleTime: 5 * 60 * 1000,
  });

  const maturityProfileQuery = useQuery({
    queryKey: ['deposit-analytics', 'maturity-profile'],
    queryFn: () => depositAnalyticsApi.getMaturityProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const rateBandsQuery = useQuery({
    queryKey: ['deposit-analytics', 'rate-bands'],
    queryFn: () => depositAnalyticsApi.getRateBands(),
    staleTime: 5 * 60 * 1000,
  });

  const rateSensitivityQuery = useQuery({
    queryKey: ['deposit-analytics', 'rate-sensitivity'],
    queryFn: () => depositAnalyticsApi.getRateSensitivityData(),
    staleTime: 5 * 60 * 1000,
  });

  const costOfFundsQuery = useQuery({
    queryKey: ['deposit-analytics', 'cost-of-funds'],
    queryFn: () => depositAnalyticsApi.getCostOfFundsTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const retentionVintageQuery = useQuery({
    queryKey: ['deposit-analytics', 'retention-vintage'],
    queryFn: () => depositAnalyticsApi.getRetentionVintage(),
    staleTime: 5 * 60 * 1000,
  });

  const churnQuery = useQuery({
    queryKey: ['deposit-analytics', 'churn'],
    queryFn: () => depositAnalyticsApi.getChurnAnalysis(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    mix: mixQuery.data ?? [],
    mixLoading: mixQuery.isLoading,

    growthTrend: growthTrendQuery.data ?? [],
    growthTrendLoading: growthTrendQuery.isLoading,

    topDepositors: topDepositorsQuery.data ?? [],
    topDepositorsLoading: topDepositorsQuery.isLoading,

    maturityProfile: maturityProfileQuery.data ?? [],
    maturityProfileLoading: maturityProfileQuery.isLoading,

    rateBands: rateBandsQuery.data ?? [],
    rateBandsLoading: rateBandsQuery.isLoading,

    rateSensitivity: rateSensitivityQuery.data ?? [],
    rateSensitivityLoading: rateSensitivityQuery.isLoading,

    costOfFunds: costOfFundsQuery.data ?? [],
    costOfFundsLoading: costOfFundsQuery.isLoading,

    retentionVintage: retentionVintageQuery.data ?? [],
    retentionVintageLoading: retentionVintageQuery.isLoading,

    churnStats: churnQuery.data,
    churnLoading: churnQuery.isLoading,
  };
}
