import { useQuery } from '@tanstack/react-query';
import { riskApi } from '../api/riskApi';

export function useRiskAppetite() {
  return useQuery({
    queryKey: ['risk', 'appetite'],
    queryFn: () => riskApi.getRiskAppetite().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useRiskHeatmap() {
  return useQuery({
    queryKey: ['risk', 'heatmap'],
    queryFn: () => riskApi.getHeatmap().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useKris() {
  return useQuery({
    queryKey: ['risk', 'kris'],
    queryFn: () => riskApi.getKris().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useRiskAlerts() {
  return useQuery({
    queryKey: ['risk', 'alerts'],
    queryFn: () => riskApi.getAlerts().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useRiskLimits() {
  return useQuery({
    queryKey: ['risk', 'limits'],
    queryFn: () => riskApi.getLimits().then((r) => r.data.data),
    staleTime: 60_000,
  });
}
