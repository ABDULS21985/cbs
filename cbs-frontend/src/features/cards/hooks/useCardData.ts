import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { Card, CardTransaction, Merchant, PosTerminal, CardControls } from '../types/card';
import { handleApiError } from '@/lib/errorHandler';
import { cardApi } from '../api/cardApi';

export function useCards(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.cards.list(filters),
    queryFn: () => apiGet<Card[]>('/api/v1/cards', filters).catch(() => []),
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: queryKeys.cards.detail(id),
    queryFn: () => apiGet<Card>(`/api/v1/cards/${id}`),
    enabled: !!id,
  });
}

export function useCardTransactions(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['cards', 'transactions', filters],
    queryFn: () => apiGet<CardTransaction[]>('/api/v1/card-switch', filters).catch(() => []),
  });
}

export function useMerchants(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['merchants', filters],
    queryFn: () => apiGet<Merchant[]>('/api/v1/merchants', filters).catch(() => []),
  });
}

export function usePosTerminals() {
  return useQuery({
    queryKey: ['pos-terminals'],
    queryFn: () => cardApi.getTerminals(),
  });
}

export function useBlockCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost<void>(`/api/v1/cards/${id}/block`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cards.all }),
    onError: handleApiError,
  });
}

export function useActivateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiPost<void>(`/api/v1/cards/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cards.all }),
    onError: handleApiError,
  });
}
