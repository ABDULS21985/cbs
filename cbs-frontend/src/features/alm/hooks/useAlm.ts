import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { almApi, type ShockScenario } from '../api/almApi';

const KEYS = {
  gapReport: (date: string) => ['alm', 'gap-report', date],
  positions: (date: string, currency: string) => ['alm', 'positions', date, currency],
  scenarios: () => ['alm', 'scenarios'],
  regulatoryScenarios: () => ['alm', 'scenarios', 'regulatory'],
  duration: (portfolioCode: string) => ['alm', 'duration', portfolioCode],
};

export function useAlmGapReport(date: string) {
  return useQuery({
    queryKey: KEYS.gapReport(date),
    queryFn: () => almApi.getGapReport(date),
    enabled: !!date,
    staleTime: 5 * 60_000,
  });
}

export function useAlmPositions(date: string, currency: string) {
  return useQuery({
    queryKey: KEYS.positions(date, currency),
    queryFn: () => almApi.getAlmPositions(date, currency),
    enabled: !!(date && currency),
    staleTime: 5 * 60_000,
  });
}

export function useAlmScenarios() {
  return useQuery({
    queryKey: KEYS.scenarios(),
    queryFn: () => almApi.getScenarios(),
    staleTime: 60_000,
  });
}

export function useRegulatoryScenarios() {
  return useQuery({
    queryKey: KEYS.regulatoryScenarios(),
    queryFn: () => almApi.getRegulatoryScenarios(),
    staleTime: 60_000,
  });
}

export function useGenerateGapReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      asOfDate: string;
      currency: string;
      shockScenario: ShockScenario;
    }) => almApi.generateGapReport(payload),
    onSuccess: (_data, { asOfDate }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.gapReport(asOfDate) });
    },
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      type: string;
      shockBps: number;
      description: string;
    }) => almApi.createScenario(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.scenarios() });
    },
  });
}

export function usePortfolioDuration(portfolioCode: string) {
  return useQuery({
    queryKey: KEYS.duration(portfolioCode),
    queryFn: () => almApi.getPortfolioDuration(portfolioCode),
    enabled: !!portfolioCode,
  });
}
