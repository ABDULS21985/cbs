import { useQuery } from '@tanstack/react-query';
import { mortgageApi } from '../api/mortgageApi';

export function useMortgageList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['mortgages', 'list', params],
    queryFn: () => mortgageApi.list(params),
  });
}

export function useMortgage(id: number) {
  return useQuery({
    queryKey: ['mortgages', id],
    queryFn: () => mortgageApi.getById(id),
    enabled: !!id,
  });
}

export function useMortgageLtvHistory(id: number) {
  return useQuery({
    queryKey: ['mortgages', id, 'ltv-history'],
    queryFn: () => mortgageApi.getLtvHistory(id),
    enabled: !!id,
  });
}
