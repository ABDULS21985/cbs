import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedIncomeApi } from '../api/fixedIncomeApi';
import { ftpApi, type AddFtpRatePointRequest, type RunFtpAllocationRequest } from '../api/ftpApi';
import { tradingModelsApi } from '../api/tradingModelApi';
import { dealerDesksApi } from '../api/dealerDeskApi';
import { traderPositionsApi } from '../api/traderPositionApi';
import { marketOrdersApi } from '../api/marketOrderApi';
import { orderExecutionsApi } from '../api/orderExecutionApi';
import { tradingBooksApi } from '../api/tradingBookApi';
import { treasuryApi as treasuryExtApi } from '../api/treasuryExtApi';
import type { SecurityHolding } from '../types/fixedIncome';
// FtpAllocation import removed
import type { DeskDealer } from '../types/dealerDesk';
import type { TraderPosition, TraderPositionLimit } from '../types/traderPosition';
import type { ExecutionQuality } from '../types/orderExecution';

// ─── Query Key Factories ────────────────────────────────────────────────────────

export const TREASURY_EXT_KEYS = {
  // Fixed Income
  fixedIncome: ['fixed-income'] as const,
  holding: (id: number) => ['fixed-income', 'holding', id] as const,
  portfolio: (code: string) => ['fixed-income', 'portfolio', code] as const,
  portfolioFaceValue: (code: string) => ['fixed-income', 'portfolio', code, 'face-value'] as const,

  // FTP
  ftp: ['ftp'] as const,
  ftpProfitability: (entityType: string) => ['ftp', 'profitability', entityType] as const,
  ftpHistory: (entityType: string, entityId: number) =>
    ['ftp', 'history', entityType, entityId] as const,

  // Trading Models
  tradingModels: ['trading-models'] as const,

  // Dealer Desks
  dealerDesks: ['dealer-desks'] as const,
  deskDashboard: (id: number) => ['dealer-desks', id, 'dashboard'] as const,

  // Market Orders
  marketOrders: ['market-orders'] as const,
  customerOrders: (customerId: number) => ['market-orders', 'customer', customerId] as const,

  // Order Executions
  orderExecutions: ['order-executions'] as const,
  bestExecutionReport: (orderId: number) =>
    ['order-executions', 'order', orderId, 'quality'] as const,

  // Trading Books
  tradingBooks: ['trading-books'] as const,
  bookHistory: (id: number) => ['trading-books', id, 'history'] as const,
} as const;

// ─── Fixed Income Hooks ─────────────────────────────────────────────────────────

export function useFixedIncomeHolding(id: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.holding(id),
    queryFn: () => fixedIncomeApi.getHolding(id),
    staleTime: 60_000,
    enabled: id > 0,
  });
}

export function useFixedIncomePortfolio(code: string) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.portfolio(code),
    queryFn: () => fixedIncomeApi.getPortfolio(code),
    staleTime: 60_000,
    enabled: !!code,
  });
}

export function usePortfolioFaceValue(code: string) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.portfolioFaceValue(code),
    queryFn: () => fixedIncomeApi.getFaceValue(code),
    staleTime: 60_000,
    enabled: !!code,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SecurityHolding>) => fixedIncomeApi.addHolding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.fixedIncome });
    },
  });
}

export function useBatchAccrual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchAccrual(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.fixedIncome });
    },
  });
}

export function useBatchMtm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => fixedIncomeApi.batchMtm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.fixedIncome });
    },
  });
}

export function useBatchMaturity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchMaturity(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.fixedIncome });
    },
  });
}

export function useBatchCoupons() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchCoupons(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.fixedIncome });
    },
  });
}

// ─── FTP Hooks ──────────────────────────────────────────────────────────────────

export function useFtpProfitability(entityType: string) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.ftpProfitability(entityType),
    queryFn: () => ftpApi.getProfitability(entityType),
    staleTime: 60_000,
    enabled: !!entityType,
  });
}

export function useFtpHistory(entityType: string, entityId: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.ftpHistory(entityType, entityId),
    queryFn: () => ftpApi.getHistory(entityType, entityId),
    staleTime: 60_000,
    enabled: !!entityType && entityId > 0,
  });
}

export function useAddFtpRatePoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddFtpRatePointRequest) => ftpApi.addRatePoint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.ftp });
    },
  });
}

export function useFtpAllocate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RunFtpAllocationRequest) => ftpApi.allocate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.ftp });
    },
  });
}

// ─── Trading Model Hooks ────────────────────────────────────────────────────────

export function useSubmitModelForValidation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradingModelsApi.submitForValidation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.tradingModels });
    },
  });
}

export function useDeployModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradingModelsApi.deployToProduction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.tradingModels });
    },
  });
}

export function useRetireModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradingModelsApi.retireModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.tradingModels });
    },
  });
}

export function useCalibrateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradingModelsApi.calibrateModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.tradingModels });
    },
  });
}

// ─── Dealer Desk Hooks ──────────────────────────────────────────────────────────

export function useDeskDashboard(id: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.deskDashboard(id),
    queryFn: () => dealerDesksApi.getDeskDashboard(id),
    staleTime: 15_000,
    enabled: id > 0,
  });
}

export function useAuthorizeDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deskId, data }: { deskId: number; data: Partial<DeskDealer> }) =>
      dealerDesksApi.authorizeDealer(deskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.dealerDesks });
    },
  });
}

export function useRevokeDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deskId, dealerId }: { deskId: number; dealerId: number }) =>
      dealerDesksApi.revokeDealer(deskId, dealerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.dealerDesks });
    },
  });
}

export function useSuspendDesk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: number | { id: number; reason?: string }) => {
      const request = typeof payload === 'number' ? { id: payload, reason: undefined } : payload;
      return dealerDesksApi.suspendDesk(request.id, request.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.dealerDesks });
      queryClient.invalidateQueries({ queryKey: ['dealer-desks'] });
      queryClient.invalidateQueries({ queryKey: ['market-making'] });
    },
  });
}

// ─── Trader Position Hooks ──────────────────────────────────────────────────────

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TraderPosition>) => traderPositionsApi.updatePosition(data),
    onSuccess: () => {
      // Invalidate trader position caches, not market orders
      queryClient.invalidateQueries({ queryKey: ['trader-positions'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-desks'] });
    },
  });
}

export function useSetPositionLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TraderPositionLimit>) => traderPositionsApi.setLimit(data),
    onSuccess: () => {
      // Invalidate trader position caches so limit utilization percentages refresh
      queryClient.invalidateQueries({ queryKey: ['trader-positions'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-desks'] });
    },
  });
}

// ─── Market Order Hooks ─────────────────────────────────────────────────────────

export function useCustomerOrders(customerId: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.customerOrders(customerId),
    queryFn: () => marketOrdersApi.getOrdersByCustomer(customerId),
    staleTime: 15_000,
    enabled: customerId > 0,
  });
}

export function useValidateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => marketOrdersApi.validateOrder(ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.marketOrders });
    },
  });
}

export function useRouteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => marketOrdersApi.routeOrder(ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.marketOrders });
    },
  });
}

// ─── Order Execution Hooks ──────────────────────────────────────────────────────

export function useBestExecutionReport(orderId: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.bestExecutionReport(orderId),
    queryFn: () => orderExecutionsApi.getBestExecutionReport(orderId),
    staleTime: 15_000,
    enabled: orderId > 0,
  });
}

export function useBustExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => orderExecutionsApi.bustExecution(ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.orderExecutions });
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.marketOrders });
    },
  });
}

export function useAnalyzeExecutionQuality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExecutionQuality>) =>
      orderExecutionsApi.analyzeExecutionQuality(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREASURY_EXT_KEYS.orderExecutions });
    },
  });
}

// ─── Trading Book Hooks ─────────────────────────────────────────────────────────

export function useBookHistory(id: number) {
  return useQuery({
    queryKey: TREASURY_EXT_KEYS.bookHistory(id),
    queryFn: () => tradingBooksApi.getBookHistory(id),
    staleTime: 60_000,
    enabled: id > 0,
  });
}

// ─── Treasury Ext Hooks ─────────────────────────────────────────────────────────

export function useProcessMaturity() {
  return useMutation({
    mutationFn: () => treasuryExtApi.processMaturity(),
  });
}
