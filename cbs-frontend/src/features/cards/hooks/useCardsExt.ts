import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '../api/cardExtApi';
import { cardClearingApi } from '../api/cardClearingApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { cardNetworksApi } from '../api/cardNetworkApi';
import { posTerminalsApi } from '../api/posTerminalApi';
import type { CardClearingBatch, CardSettlementPosition } from '../types/cardClearing';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import { cardKeys, CARD_QUERY_DEFAULTS } from './useCardData';

// Re-export cardKeys for backward compatibility
export { cardKeys as CARDS_EXT_KEYS } from './useCardData';

// ─── Card Dispute Hooks ─────────────────────────────────────────────────────

export function useCardDispute(id: number) {
  return useQuery({
    queryKey: cardKeys.disputeDetail(id),
    queryFn: () => cardsApi.get(id),
    ...CARD_QUERY_DEFAULTS,
    enabled: id > 0,
  });
}

export function useCustomerDisputes(customerId: number) {
  return useQuery({
    queryKey: cardKeys.customerDisputes(customerId),
    queryFn: () => cardsApi.getCustomerDisputes(customerId),
    ...CARD_QUERY_DEFAULTS,
    enabled: customerId > 0,
  });
}

export function useDisputesByStatus(status: string) {
  return useQuery({
    queryKey: cardKeys.disputesByStatus(status),
    queryFn: () => cardsApi.getByStatus(status),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!status,
  });
}

export function useDisputesDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...cardKeys.disputesDashboard, params] as const,
    queryFn: () => cardsApi.dashboard(params),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useDisputeSlaCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cardsApi.slaCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useHotlistCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cardsApi.hotlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useFileDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txnId: number) => cardsApi.dispute(txnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

/** @deprecated Use useFileDispute instead */
export const useDisputeTransaction = useFileDispute;

// ─── Dispute Lifecycle Hooks ────────────────────────────────────────────────

export function useInitiateDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof cardsApi.initiateDispute>[0]) =>
      cardsApi.initiateDispute(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useProvisionalCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      cardsApi.provisionalCredit(id),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputeDetail(id) });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useFileChargeback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, schemeCaseId, schemeReasonCode }: { id: number; schemeCaseId: string; schemeReasonCode: string }) =>
      cardsApi.fileChargeback(id, schemeCaseId, schemeReasonCode),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputeDetail(id) });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useSubmitRepresentment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, merchantResponse }: { id: number; merchantResponse: string }) =>
      cardsApi.submitRepresentment(id, merchantResponse),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputeDetail(id) });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useEscalateToArbitration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      cardsApi.escalateToArbitration(id, notes),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputeDetail(id) });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionType, resolutionAmount, notes }: {
      id: number; resolutionType: string; resolutionAmount: number; notes?: string;
    }) => cardsApi.resolveDispute(id, resolutionType, resolutionAmount, notes),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.disputeDetail(id) });
      queryClient.invalidateQueries({ queryKey: cardKeys.disputes });
    },
  });
}

// ─── Card Token Hooks ───────────────────────────────────────────────────────

export function useCardTokens(cardId: number) {
  return useQuery({
    queryKey: cardKeys.cardTokens(cardId),
    queryFn: () => cardsApi.getCardTokens(cardId),
    ...CARD_QUERY_DEFAULTS,
    enabled: cardId > 0,
  });
}

export function useCustomerTokens(customerId: number) {
  return useQuery({
    queryKey: cardKeys.customerTokens(customerId),
    queryFn: () => cardsApi.getCustomerTokens(customerId),
    ...CARD_QUERY_DEFAULTS,
    enabled: customerId > 0,
  });
}

export function useSuspendToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.suspend(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.tokens });
    },
  });
}

export function useResumeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.resume(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.tokens });
    },
  });
}

export function useDeactivateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => cardsApi.deactivate(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.tokens });
    },
  });
}

// ─── Card Clearing / Settlement Hooks ───────────────────────────────────────

export function useClearingBatches(network: string, date: string) {
  return useQuery({
    queryKey: cardKeys.clearingBatches(network, date),
    queryFn: () => cardClearingApi.createPosition2(network, date),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!network && !!date,
  });
}

export function useClearingPositions(date: string, network: string) {
  return useQuery({
    queryKey: cardKeys.positions(date, network),
    queryFn: () => cardClearingApi.positions(date, network),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!date && !!network,
  });
}

export function useIngestClearingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardClearingBatch>) => cardClearingApi.ingest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

/** Alias for useIngestClearingBatch — matches API naming */
export const useIngestBatch = useIngestClearingBatch;

export function useSettleClearingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, data }: { batchId: number; data: Partial<CardClearingBatch> }) =>
      cardClearingApi.ingest2(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

/** Alias for useSettleClearingBatch — matches API naming */
export const useSettleBatch = useSettleClearingBatch;

export function useCreateSettlementPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardSettlementPosition>) => cardClearingApi.createPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

export function useAllClearingBatches() {
  return useQuery({
    queryKey: [...cardKeys.clearing, 'all-batches'] as const,
    queryFn: () => cardClearingApi.getAllBatches(),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useAllSettlementPositions() {
  return useQuery({
    queryKey: [...cardKeys.clearing, 'all-positions'] as const,
    queryFn: () => cardClearingApi.getAllPositions(),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useManualClearingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardClearingBatch>) => cardClearingApi.manualBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardSettlementPosition>) => cardClearingApi.createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

export function useSettleBatchByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => cardClearingApi.settleBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.clearing });
    },
  });
}

// ─── Card Switch Hooks ──────────────────────────────────────────────────────

export function useSwitchByScheme(scheme: string) {
  return useQuery({
    queryKey: cardKeys.switchByScheme(scheme),
    queryFn: () => cardSwitchApi.getByScheme(scheme),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!scheme,
  });
}

export function useSwitchByMerchant(merchantId: number) {
  return useQuery({
    queryKey: cardKeys.switchByMerchant(merchantId),
    queryFn: () => cardSwitchApi.getByMerchant(merchantId),
    ...CARD_QUERY_DEFAULTS,
    enabled: merchantId > 0,
  });
}

export function useSwitchDeclines(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...cardKeys.switchDeclines, params] as const,
    queryFn: () => cardSwitchApi.getDeclines(params),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useSwitchStats(scheme: string, date: string) {
  return useQuery({
    queryKey: cardKeys.switchStats(scheme, date),
    queryFn: () => cardSwitchApi.getStats(scheme, date),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!scheme && !!date,
  });
}

export function useProcessSwitchTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CardSwitchTransaction>) => cardSwitchApi.process(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.cardSwitch });
    },
  });
}

// ─── Card Network Hooks ─────────────────────────────────────────────────────

export function useCardNetwork(network: string) {
  return useQuery({
    queryKey: cardKeys.network(network),
    queryFn: () => cardNetworksApi.getByNetwork(network),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!network,
  });
}

export function useAllCardNetworks() {
  return useQuery({
    queryKey: cardKeys.networks,
    queryFn: () => cardNetworksApi.getAll(),
    ...CARD_QUERY_DEFAULTS,
  });
}

export function useRegisterNetwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof cardNetworksApi.register>[0]) =>
      cardNetworksApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.networks });
    },
  });
}

export function useDeployTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof posTerminalsApi.deploy>[0]) =>
      posTerminalsApi.deploy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.terminals });
    },
  });
}

export function useSuspendMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, reason }: { merchantId: string; reason: string }) => {
      const { apiPost } = require('@/lib/api');
      return apiPost(`/api/v1/merchants/${merchantId}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.merchants });
    },
  });
}

export function useActivateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (merchantId: string) => {
      const { apiPost } = require('@/lib/api');
      return apiPost(`/api/v1/merchants/${merchantId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.merchants });
    },
  });
}

export function useProvisionToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, ...data }: { cardId: number; walletProvider: string; deviceName: string; deviceType: string }) =>
      cardsApi.provisionToken(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.tokens });
    },
  });
}

// ─── POS Terminal Hooks ─────────────────────────────────────────────────────

export function usePosTerminalsByMerchant(merchantId: string) {
  return useQuery({
    queryKey: cardKeys.posByMerchant(Number(merchantId) || 0),
    queryFn: () => posTerminalsApi.byMerchant(merchantId),
    ...CARD_QUERY_DEFAULTS,
    enabled: !!merchantId,
  });
}

export function usePosTerminalHeartbeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: string) => posTerminalsApi.heartbeat(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.terminals });
    },
  });
}

/** Alias for usePosTerminalHeartbeat — matches requirement naming */
export const usePosHeartbeat = usePosTerminalHeartbeat;

export function useUpdatePosTerminalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ terminalId, status }: { terminalId: string; status: string }) =>
      posTerminalsApi.updateStatus(terminalId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.terminals });
    },
  });
}
