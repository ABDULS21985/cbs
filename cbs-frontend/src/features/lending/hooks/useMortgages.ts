import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useCreateMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mortgageApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mortgages'] }),
  });
}

export function useAdvanceMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mortgageNumber, status }: { mortgageNumber: string; status?: string }) =>
      mortgageApi.advance(mortgageNumber, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mortgages'] }),
  });
}

export function useOverpayMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mortgageNumber, amount }: { mortgageNumber: string; amount: number }) =>
      mortgageApi.overpay(mortgageNumber, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mortgages'] }),
  });
}

export function useHighLtvMortgages(maxLtv = 80) {
  return useQuery({
    queryKey: ['mortgages', 'high-ltv', maxLtv],
    queryFn: () => mortgageApi.getHighLtv(maxLtv),
    staleTime: 60_000,
  });
}

export function useFixedRateExpiringMortgages() {
  return useQuery({
    queryKey: ['mortgages', 'fixed-rate-expiring'],
    queryFn: () => mortgageApi.getFixedRateExpiring(),
    staleTime: 60_000,
  });
}
