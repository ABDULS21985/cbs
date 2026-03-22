import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { Card, CardTransaction, Merchant, CardControls } from '../types/card';
import { handleApiError } from '@/lib/errorHandler';
import { cardApi } from '../api/cardApi';

// ─── Consolidated Query Key Factory ─────────────────────────────────────────

export const cardKeys = {
  all: ['cards'] as const,
  lists: (filters?: Record<string, unknown>) => [...cardKeys.all, 'list', filters] as const,
  detail: (id: number) => [...cardKeys.all, 'detail', id] as const,
  transactions: (filters?: Record<string, unknown>) => [...cardKeys.all, 'transactions', filters] as const,
  merchants: ['merchants'] as const,
  merchantDetail: (id: string | number) => ['merchants', id] as const,
  terminals: ['pos-terminals'] as const,
  disputes: ['card-disputes'] as const,
  disputeDetail: (id: number) => ['card-disputes', 'detail', id] as const,
  disputesByStatus: (status: string) => ['card-disputes', 'status', status] as const,
  disputesDashboard: ['card-disputes', 'dashboard'] as const,
  customerDisputes: (customerId: number) => ['card-disputes', 'customer', customerId] as const,
  tokens: ['card-tokens'] as const,
  cardTokens: (cardId: number) => ['card-tokens', cardId] as const,
  customerTokens: (customerId: number) => ['card-tokens', 'customer', customerId] as const,
  clearing: ['card-clearing'] as const,
  clearingBatches: (network: string, date: string) => ['card-clearing', 'batches', network, date] as const,
  positions: (date: string, network: string) => ['card-clearing', 'positions', date, network] as const,
  cardSwitch: ['card-switch'] as const,
  switchByScheme: (scheme: string) => ['card-switch', 'scheme', scheme] as const,
  switchByMerchant: (merchantId: string) => ['card-switch', 'merchant', merchantId] as const,
  switchDeclines: ['card-switch', 'declines'] as const,
  switchStats: (scheme: string, date: string) => ['card-switch', 'scheme', scheme, 'stats', date] as const,
  networks: ['card-networks'] as const,
  network: (network: string) => ['card-networks', network] as const,
  posByMerchant: (merchantId: number) => ['pos-terminals', 'merchant', merchantId] as const,
  commissions: ['card-commissions'] as const,
  acquiring: ['acquiring'] as const,
  facilities: (merchantId: number) => ['acquiring', 'facilities', merchantId] as const,
  settlements: (merchantId: number) => ['acquiring', 'settlements', merchantId] as const,
  chargebacks: (merchantId: number) => ['acquiring', 'chargebacks', merchantId] as const,
} as const;

// ─── Query Defaults ─────────────────────────────────────────────────────────

const CARD_QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

// ─── Card Query Hooks ───────────────────────────────────────────────────────

export function useCards(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: cardKeys.lists(filters),
    queryFn: () => apiGet<Card[]>('/api/v1/cards', filters),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: cardKeys.detail(id),
    queryFn: () => apiGet<Card>(`/api/v1/cards/${id}`),
    enabled: !!id,
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useCardTransactions(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: cardKeys.transactions(filters),
    queryFn: () => apiGet<CardTransaction[]>('/api/v1/card-switch', filters),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useMerchants(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: cardKeys.merchants,
    queryFn: () => apiGet<Merchant[]>('/api/v1/merchants', filters),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function usePosTerminals() {
  return useQuery({
    queryKey: cardKeys.terminals,
    queryFn: () => cardApi.getTerminals(),
    ...CARD_QUERY_DEFAULTS,
  });
}

// ─── Card Mutation Hooks ────────────────────────────────────────────────────

export function useBlockCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost<void>(`/api/v1/cards/${id}/block`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useActivateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiPost<void>(`/api/v1/cards/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useUpdateCardControls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, controls }: { id: number; controls: Partial<CardControls> }) =>
      cardApi.updateControls(id, controls),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.detail(id) });
    },
    onError: handleApiError,
  });
}

export function useHotlistCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cardApi.hotlistCard(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useCardTransactionsByCardId(cardId: number) {
  return useQuery({
    queryKey: ['cards', 'card-transactions', cardId],
    queryFn: () => cardApi.getCardTransactions(cardId),
    enabled: !!cardId,
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useRequestCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cardApi.requestCard(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useIssueCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: import('../api/cardApi').IssueCardInput) => cardApi.issueCard(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useCustomerCards(customerId: number) {
  return useQuery({
    queryKey: [...cardKeys.all, 'customer', customerId],
    queryFn: () => cardApi.getCustomerCards(customerId),
    enabled: customerId > 0,
    ...CARD_QUERY_DEFAULTS,
  });
}

export function usePendingCards() {
  return useQuery({
    queryKey: [...cardKeys.all, 'pending'],
    queryFn: () => cardApi.getCards({ status: 'PENDING_ACTIVATION' }),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useBulkActivate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiPost<void>(`/api/v1/cards/${id}/activate`)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
    onError: handleApiError,
  });
}

export function useOnboardMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof cardApi.onboardMerchant>[0]) =>
      cardApi.onboardMerchant(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardKeys.merchants }),
    onError: handleApiError,
  });
}

export function useMerchantDetail(merchantId: string) {
  return useQuery({
    queryKey: cardKeys.merchantDetail(merchantId),
    queryFn: () => cardApi.getMerchant(merchantId),
    enabled: !!merchantId,
    ...CARD_QUERY_DEFAULTS,
  });
}

export function usePosTerminalsLive() {
  return useQuery({
    queryKey: cardKeys.terminals,
    queryFn: () => cardApi.getTerminals(),
    ...CARD_QUERY_DEFAULTS,
    refetchInterval: 30_000,
  });
}

export { CARD_QUERY_DEFAULTS };
