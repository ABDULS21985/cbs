import { useQuery } from '@tanstack/react-query';
import { riskApi } from '../api/riskApi';

export function useRiskAppetite() {
  return useQuery({
    queryKey: ['risk', 'appetite'],
    queryFn: async () => (await riskApi.getRiskAppetite()).data.data,
    staleTime: 60_000,
  });
}

export function useRiskHeatmap() {
  return useQuery({
    queryKey: ['risk', 'heatmap'],
    queryFn: async () => (await riskApi.getHeatmap()).data.data,
    staleTime: 60_000,
  });
}

export function useKris() {
  return useQuery({
    queryKey: ['risk', 'kris'],
    queryFn: async () => (await riskApi.getKris()).data.data,
    staleTime: 60_000,
  });
}

export function useRiskAlerts() {
  return useQuery({
    queryKey: ['risk', 'alerts'],
    queryFn: async () => (await riskApi.getAlerts()).data.data,
    staleTime: 30_000,
  });
}

export function useRiskLimits() {
  return useQuery({
    queryKey: ['risk', 'limits'],
    queryFn: async () => (await riskApi.getLimits()).data.data,
    staleTime: 60_000,
  });
}
