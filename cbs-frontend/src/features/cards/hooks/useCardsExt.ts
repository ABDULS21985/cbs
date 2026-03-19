import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '../api/cardExtApi';
import { cardClearingApi } from '../api/cardClearingApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { cardNetworksApi } from '../api/cardNetworkApi';
import { posTerminalsApi } from '../api/posTerminalApi';
import type { CardClearingBatch, CardSettlementPosition } from '../types/cardClearing';
import type { CardSwitchTransaction } from '../types/cardSwitch';

// ─── Query Key Factories ────────────────────────────────────────────────────────

export const CARDS_EXT_KEYS = {
  // Card Disputes
  disputes: ['cards', 'disputes'] as const,
  dispute: (id: number) => ['cards', 'disputes', id] as const,
  customerDisputes: (customerId: number) =>
    ['cards', 'disputes', 'customer', customerId] as const,
  disputesByStatus: (status: string) => ['cards', 'disputes', 'status', status] as const,
  disputesDashboard: ['cards', 'disputes', 'dashboard'] as const,

  // Card Tokens
  tokens: ['cards', 'tokens'] as const,
  cardTokens: (cardId: number) => ['cards', 'tokens', 'card', cardId] as const,
  customerTokens: (customerId: number) => ['cards', 'tokens', 'customer', customerId] as const,

  // Card Clearing
  clearing: ['card-clearing'] as const,
  clearingBatches: (network: string, date: string) =>
    ['card-clearing', 'batches', network, date] as const,
  clearingPositions: (date: string, network: string) =>
    ['card-clearing', 'positions', date, network] as const,

  // Card Switch
  cardSwitch: ['card-switch'] as const,
  switchByScheme: (scheme: string) => ['card-switch', 'scheme', scheme] as const,
  switchByMerchant: (merchantId: number) => ['card-switch', 'merchant', merchantId] as const,
  switchDeclines: ['card-switch', 'declines'] as const,
  switchStats: (scheme: string, date: string) =>
    ['card-switch', 'scheme', scheme, 'stats', date] as const,

  // Card Networks
  networks: ['card-networks'] as const,
  network: (network: string) => ['card-networks', network] as const,

  // POS Terminals
  posTerminals: ['pos-terminals'] as const,
  posByMerchant: (merchantId: number) => ['pos-terminals', 'merchant', merchantId] as const,
} as const;

// ─── Card Dispute Hooks ─────────────────────────────────────────────────────────

export function useCardDispute(id: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.dispute(id),
    queryFn: () => cardsApi.get(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useCustomerDisputes(customerId: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.customerDisputes(customerId),
    queryFn: () => cardsApi.getCustomerDisputes(customerId),
    staleTime: 30_000,
    enabled: customerId > 0,
  });
}

export function useDisputesByStatus(status: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.disputesByStatus(status),
    queryFn: () => cardsApi.getByStatus(status),
    staleTime: 30_000,
    enabled: !!status,
  });
}

export function useDisputesDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CARDS_EXT_KEYS.disputesDashboard, params] as const,
    queryFn: () => cardsApi.dashboard(params),
    staleTime: 30_000,
  });
}

export function useDisputeSlaCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cardsApi.slaCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.disputes });
    },
  });
}

export function useHotlistCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cardsApi.hotlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.disputes });
    },
  });
}

export function useDisputeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txnId: number) => cardsApi.dispute(txnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.disputes });
    },
  });
}

// ─── Card Token Hooks ───────────────────────────────────────────────────────────

export function useCardTokens(cardId: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.cardTokens(cardId),
    queryFn: () => cardsApi.getCardTokens(cardId),
    staleTime: 30_000,
    enabled: cardId > 0,
  });
}

export function useCustomerTokens(customerId: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.customerTokens(customerId),
    queryFn: () => cardsApi.getCustomerTokens(customerId),
    staleTime: 30_000,
    enabled: customerId > 0,
  });
}

export function useSuspendToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.suspend(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.tokens });
    },
  });
}

export function useResumeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.resume(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.tokens });
    },
  });
}

export function useDeactivateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.deactivate(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.tokens });
    },
  });
}

// ─── Card Clearing / Settlement Hooks ───────────────────────────────────────────

export function useClearingBatches(network: string, date: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.clearingBatches(network, date),
    queryFn: () => cardClearingApi.createPosition2(network, date),
    staleTime: 30_000,
    enabled: !!network && !!date,
  });
}

export function useClearingPositions(date: string, network: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.clearingPositions(date, network),
    queryFn: () => cardClearingApi.positions(date, network),
    staleTime: 30_000,
    enabled: !!date && !!network,
  });
}

export function useIngestClearingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardClearingBatch>) => cardClearingApi.ingest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.clearing });
    },
  });
}

export function useSettleClearingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, data }: { batchId: number; data: Partial<CardClearingBatch> }) =>
      cardClearingApi.ingest2(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.clearing });
    },
  });
}

export function useCreateSettlementPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardSettlementPosition>) => cardClearingApi.createPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.clearing });
    },
  });
}

// ─── Card Switch Hooks ──────────────────────────────────────────────────────────

export function useSwitchByScheme(scheme: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.switchByScheme(scheme),
    queryFn: () => cardSwitchApi.getByScheme(scheme),
    staleTime: 30_000,
    enabled: !!scheme,
  });
}

export function useSwitchByMerchant(merchantId: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.switchByMerchant(merchantId),
    queryFn: () => cardSwitchApi.getByMerchant(merchantId),
    staleTime: 30_000,
    enabled: merchantId > 0,
  });
}

export function useSwitchDeclines(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CARDS_EXT_KEYS.switchDeclines, params] as const,
    queryFn: () => cardSwitchApi.getDeclines(params),
    staleTime: 30_000,
  });
}

export function useSwitchStats(scheme: string, date: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.switchStats(scheme, date),
    queryFn: () => cardSwitchApi.getStats(scheme, date),
    staleTime: 30_000,
    enabled: !!scheme && !!date,
  });
}

export function useProcessSwitchTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardSwitchTransaction>) => cardSwitchApi.process(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.cardSwitch });
    },
  });
}

// ─── Card Network Hooks ─────────────────────────────────────────────────────────

export function useCardNetwork(network: string) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.network(network),
    queryFn: () => cardNetworksApi.register(network),
    staleTime: 30_000,
    enabled: !!network,
  });
}

// ─── POS Terminal Hooks ─────────────────────────────────────────────────────────

export function usePosTerminalsByMerchant(merchantId: number) {
  return useQuery({
    queryKey: CARDS_EXT_KEYS.posByMerchant(merchantId),
    queryFn: () => posTerminalsApi.byMerchant(merchantId),
    staleTime: 30_000,
    enabled: merchantId > 0,
  });
}

export function usePosTerminalHeartbeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: number) => posTerminalsApi.heartbeat(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.posTerminals });
    },
  });
}

export function useUpdatePosTerminalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: number) => posTerminalsApi.heartbeat2(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_EXT_KEYS.posTerminals });
    },
  });
}
