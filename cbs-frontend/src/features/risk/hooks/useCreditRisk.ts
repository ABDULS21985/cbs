import { useQuery, useMutation } from '@tanstack/react-query';
import { creditRiskApi } from '../api/creditRiskApi';

export function useCreditRiskStats() {
  return useQuery({
    queryKey: ['credit-risk', 'stats'],
    queryFn: () => creditRiskApi.getStats().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useRatingDistribution() {
  return useQuery({
    queryKey: ['credit-risk', 'rating-distribution'],
    queryFn: () => creditRiskApi.getRatingDistribution().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useNplTrend() {
  return useQuery({
    queryKey: ['credit-risk', 'npl-trend'],
    queryFn: () => creditRiskApi.getNplTrend().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useSectorConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'sector'],
    queryFn: () => creditRiskApi.getSectorConcentration().then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useProductConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'product'],
    queryFn: () => creditRiskApi.getProductConcentration().then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useRatingConcentration() {
  return useQuery({
    queryKey: ['credit-risk', 'concentration', 'rating'],
    queryFn: () => creditRiskApi.getRatingConcentration().then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useSingleObligors() {
  return useQuery({
    queryKey: ['credit-risk', 'single-obligors'],
    queryFn: () => creditRiskApi.getSingleObligors().then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useRatingMigration(period?: 'QUARTERLY' | 'ANNUAL') {
  return useQuery({
    queryKey: ['credit-risk', 'migration', period],
    queryFn: () => creditRiskApi.getRatingMigration(period).then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useScorecards() {
  return useQuery({
    queryKey: ['credit-risk', 'scorecards'],
    queryFn: () => creditRiskApi.getScorecards().then(r => r.data.data),
    staleTime: 300_000,
  });
}

export function useScorecardDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['credit-risk', 'scorecard', id],
    queryFn: () => creditRiskApi.getScorecardDetail(id).then(r => r.data.data),
    enabled,
    staleTime: 300_000,
  });
}

export function useCreditWatchList() {
  return useQuery({
    queryKey: ['credit-risk', 'watch-list'],
    queryFn: () => creditRiskApi.getWatchList().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useGenerateCommitteePack() {
  return useMutation({
    mutationFn: () => creditRiskApi.generateCommitteePack().then(r => r.data.data),
  });
}
