import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingApi } from '../api/tradingApi';
import type {
  TreasuryDealsParams,
  BookDealRequest,
  RecordAnalyticsRequest,
  RecordPnlRequest,
  SubmitOrderRequest,
} from '../api/tradingApi';

// ─── Query Keys ────────────────────────────────────────────────────────────────

const KEYS = {
  deals: (filters?: TreasuryDealsParams) => ['treasury-deals', 'list', filters] as const,
  deal: (id: string) => ['treasury-deals', 'detail', id] as const,
  analytics: (currency: string) => ['treasury-analytics', currency] as const,
  desks: () => ['dealer-desks', 'list'] as const,
  deskDashboard: (id: string) => ['dealer-desks', 'dashboard', id] as const,
  positions: (dealerId: string) => ['trader-positions', 'dealer', dealerId] as const,
  positionBreaches: (from: string, to: string) => ['trader-positions', 'breaches', from, to] as const,
  overnightPositions: (deskId: string) => ['trader-positions', 'overnight', deskId] as const,
  books: () => ['trading-books', 'list'] as const,
  bookDashboard: (id: string) => ['trading-books', 'dashboard', id] as const,
  bookCapital: (id: string) => ['trading-books', 'capital', id] as const,
  activeMarketMaking: () => ['market-making', 'active'] as const,
  compliance: () => ['market-making', 'compliance'] as const,
  mandatePerformance: (code: string) => ['market-making', 'performance', code] as const,
  openOrders: () => ['market-orders', 'open'] as const,
  order: (ref: string) => ['market-orders', 'detail', ref] as const,
  executions: (orderId: string) => ['order-executions', 'order', orderId] as const,
  activeExecutions: () => ['program-trading', 'active'] as const,
  deskQuotes: (deskId: string) => ['quotes', 'desk', deskId] as const,
  tradingModels: () => ['trading-models', 'list'] as const,
  modelsDueForReview: () => ['trading-models', 'due-for-review'] as const,
};

// ─── Deal Hooks ────────────────────────────────────────────────────────────────

export function useTreasuryDeals(filters?: TreasuryDealsParams) {
  return useQuery({
    queryKey: KEYS.deals(filters),
    queryFn: () => tradingApi.listDeals(filters),
    staleTime: 30_000,
  });
}

export function useTreasuryDeal(id: string) {
  return useQuery({
    queryKey: KEYS.deal(id),
    queryFn: () => tradingApi.getDeal(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useBookDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BookDealRequest) => tradingApi.bookDeal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-deals'] });
    },
  });
}

export function useConfirmDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tradingApi.confirmDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-deals'] });
    },
  });
}

export function useSettleDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tradingApi.settleDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-deals'] });
    },
  });
}

// ─── Analytics Hooks ───────────────────────────────────────────────────────────

export function useTreasuryAnalytics(currency: string) {
  return useQuery({
    queryKey: KEYS.analytics(currency),
    queryFn: () => tradingApi.getAnalyticsByCurrency(currency),
    enabled: !!currency,
    staleTime: 60_000,
  });
}

export function useRecordAnalytics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordAnalyticsRequest) => tradingApi.recordAnalytics(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.analytics(variables.currency) });
    },
  });
}

// ─── Dealer Desk Hooks ─────────────────────────────────────────────────────────

export function useDealerDesks() {
  return useQuery({
    queryKey: KEYS.desks(),
    queryFn: () => tradingApi.listDealerDesks(),
    staleTime: 30_000,
  });
}

export function useDeskDashboard(id: string) {
  return useQuery({
    queryKey: KEYS.deskDashboard(id),
    queryFn: () => tradingApi.getDeskDashboard(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRecordDeskPnl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordPnlRequest }) =>
      tradingApi.recordDeskPnl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dealer-desks'] });
    },
  });
}

// ─── Trader Position Hooks ─────────────────────────────────────────────────────

export function useTraderPositions(dealerId: string) {
  return useQuery({
    queryKey: KEYS.positions(dealerId),
    queryFn: () => tradingApi.getPositionsByDealer(dealerId),
    enabled: !!dealerId,
    staleTime: 30_000,
  });
}

export function usePositionBreaches(from: string, to: string) {
  return useQuery({
    queryKey: KEYS.positionBreaches(from, to),
    queryFn: () => tradingApi.getPositionBreaches({ from, to }),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export function useOvernightPositions(deskId: string) {
  return useQuery({
    queryKey: KEYS.overnightPositions(deskId),
    queryFn: () => tradingApi.getOvernightPositions(deskId),
    enabled: !!deskId,
    staleTime: 30_000,
  });
}

// ─── Trading Book Hooks ────────────────────────────────────────────────────────

export function useTradingBooks() {
  return useQuery({
    queryKey: KEYS.books(),
    queryFn: () => tradingApi.listTradingBooks(),
    staleTime: 30_000,
  });
}

export function useTradingBookDashboard(id: string) {
  return useQuery({
    queryKey: KEYS.bookDashboard(id),
    queryFn: () => tradingApi.getTradingBookDashboard(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTradingBookCapital(id: string) {
  return useQuery({
    queryKey: KEYS.bookCapital(id),
    queryFn: () => tradingApi.getTradingBookCapital(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useSnapshotTradingBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tradingApi.snapshotTradingBook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading-books'] });
    },
  });
}

// ─── Market Making Hooks ───────────────────────────────────────────────────────

export function useActiveMarketMaking() {
  return useQuery({
    queryKey: KEYS.activeMarketMaking(),
    queryFn: () => tradingApi.getActiveMarketMaking(),
    staleTime: 30_000,
  });
}

export function useMarketMakingCompliance() {
  return useQuery({
    queryKey: KEYS.compliance(),
    queryFn: () => tradingApi.getObligationCompliance(),
    staleTime: 30_000,
  });
}

export function useMandatePerformance(code: string) {
  return useQuery({
    queryKey: KEYS.mandatePerformance(code),
    queryFn: () => tradingApi.getMandatePerformance(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

// ─── Market Order Hooks ────────────────────────────────────────────────────────

export function useOpenMarketOrders() {
  return useQuery({
    queryKey: KEYS.openOrders(),
    queryFn: () => tradingApi.getOpenMarketOrders(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarketOrder(ref: string) {
  return useQuery({
    queryKey: KEYS.order(ref),
    queryFn: () => tradingApi.getMarketOrder(ref),
    enabled: !!ref,
    staleTime: 15_000,
  });
}

export function useSubmitMarketOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitOrderRequest) => tradingApi.submitMarketOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-orders'] });
    },
  });
}

export function useCancelMarketOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => tradingApi.cancelMarketOrder(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-orders'] });
    },
  });
}

// ─── Execution Hooks ───────────────────────────────────────────────────────────

export function useOrderExecutions(orderId: string) {
  return useQuery({
    queryKey: KEYS.executions(orderId),
    queryFn: () => tradingApi.getExecutionsByOrder(orderId),
    enabled: !!orderId,
    staleTime: 30_000,
  });
}

export function useActiveExecutions() {
  return useQuery({
    queryKey: KEYS.activeExecutions(),
    queryFn: () => tradingApi.getActiveProgramExecutions(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── Quote Hooks ───────────────────────────────────────────────────────────────

export function useDeskQuotes(deskId: string) {
  return useQuery({
    queryKey: KEYS.deskQuotes(deskId),
    queryFn: () => tradingApi.getActiveDeskQuotes(deskId),
    enabled: !!deskId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// ─── Trading Model Hooks ───────────────────────────────────────────────────────

export function useTradingModels() {
  return useQuery({
    queryKey: KEYS.tradingModels(),
    queryFn: () => tradingApi.listTradingModels(),
    staleTime: 60_000,
  });
}

export function useModelsDueForReview() {
  return useQuery({
    queryKey: KEYS.modelsDueForReview(),
    queryFn: () => tradingApi.getModelsDueForReview(),
    staleTime: 60_000,
  });
}
