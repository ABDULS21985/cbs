import { useQuery, useMutation } from '@tanstack/react-query';
import { creditRiskApi } from '../api/creditRiskApi';

export function useCreditRiskStats() {
  return useQuery({
    queryKey: ['credit-risk', 'stats'],
    queryFn: async () => (await creditRiskApi.getStats()).data.data,
    staleTime: 60_000,
  });
}

export function useRatingDistribution() {
  return useQuery({
    queryKey: ['credit-risk', 'rating-distribution'],
    queryFn: async () => (await creditRiskApi.getRatingDistribution()).data.data,
    staleTime: 60_000,
  });
}

export function useNplTrend() {
  return useQuery({
    queryKey: ['credit-risk', 'npl-trend'],
    queryFn: async () => (await creditRiskApi.getNplTrend()).data.data,
    staleTime: 60_000,
  });
}

export function useSectorConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'sector'],
    queryFn: async () => (await creditRiskApi.getSectorConcentration()).data.data,
    staleTime: 300_000,
  });
}

export function useProductConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'product'],
    queryFn: async () => (await creditRiskApi.getProductConcentration()).data.data,
    staleTime: 300_000,
  });
}

export function useRatingConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'rating'],
    queryFn: async () => (await creditRiskApi.getRatingConcentration()).data.data,
    staleTime: 300_000,
  });
}

export function useSingleObligors() {
  return useQuery({
    queryKey: ['credit-risk', 'single-obligors'],
    queryFn: async () => (await creditRiskApi.getSingleObligors()).data.data,
    staleTime: 300_000,
  });
}

export function useRatingMigration(period?: 'QUARTERLY' | 'ANNUAL') {
  return useQuery({
    queryKey: ['credit-risk', 'migration', period],
    queryFn: async () => (await creditRiskApi.getRatingMigration(period)).data.data,
    staleTime: 300_000,
  });
}

export function useScorecards() {
  return useQuery({
    queryKey: ['credit-risk', 'scorecards'],
    queryFn: async () => (await creditRiskApi.getScorecards()).data.data,
    staleTime: 300_000,
  });
}

export function useScorecardDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['credit-risk', 'scorecard', id],
    queryFn: async () => (await creditRiskApi.getScorecardDetail(id)).data.data,
    enabled,
    staleTime: 300_000,
  });
}

export function useCreditWatchList() {
  return useQuery({
    queryKey: ['credit-risk', 'watch-list'],
    queryFn: async () => (await creditRiskApi.getWatchList()).data.data,
    staleTime: 60_000,
  });
}

export function useGenerateCommitteePack() {
  return useMutation({
    mutationFn: async () => (await creditRiskApi.generateCommitteePack()).data.data as Record<string, unknown>,
  });
}
