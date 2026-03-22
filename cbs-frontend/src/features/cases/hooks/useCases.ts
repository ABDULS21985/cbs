import { useQuery } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';

export function useCaseStats() {
  return useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseApi.getStats(),
    refetchInterval: 60_000,
  });
}

export function useMyCases() {
  return useQuery({
    queryKey: ['cases', 'my'],
    queryFn: () => caseApi.getMyCases(),
  });
}

export function useUnassignedCases() {
  return useQuery({
    queryKey: ['cases', 'unassigned'],
    queryFn: () => caseApi.getUnassigned(),
  });
}

export function useEscalatedCases() {
  return useQuery({
    queryKey: ['cases', 'escalated'],
    queryFn: () => caseApi.getEscalated(),
  });
}
