import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { securitizationApi } from '../api/securitizationApi';
import { suitabilityApi } from '../api/suitabilityApi';
import { publicOfferingsApi } from '../api/publicOfferingApi';
import { programTradingApi } from '../api/programTradingApi';
import { quantModelsApi } from '../api/quantModelApi';
import { modelOpsApi } from '../api/modelOpsApi';
import { economicCapitalApi } from '../api/economicCapitalApi';
import { quotesApi } from '../api/quoteApi';
import type { SecuritizationVehicle } from '../types/securitization';
import type { SuitabilityCheck } from '../types/suitability';
import type { TradingStrategy, ProgramExecution } from '../types/programTrading';
import type { ModelBacktest } from '../types/quantModel';
import type { QuoteRequest, PriceQuote } from '../types/quote';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const CAPITAL_MARKETS_EXT_KEYS = {
  // Securitization
  securitization: ['capital-markets-ext', 'securitization'] as const,
  securitizationByType: (type: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.securitization, 'type', type] as const,
  securitizationActive: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.securitization, 'active'] as const,

  // Suitability
  suitability: ['capital-markets-ext', 'suitability'] as const,
  suitabilityProfiles: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.suitability, 'profiles'] as const,
  suitabilityChecks: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.suitability, 'checks'] as const,
  suitabilityByCustomer: (customerId: number) =>
    [...CAPITAL_MARKETS_EXT_KEYS.suitability, 'customer', customerId] as const,

  // Public Offerings
  publicOfferings: ['capital-markets-ext', 'public-offerings'] as const,
  offeringByDeal: (dealId: number) =>
    [...CAPITAL_MARKETS_EXT_KEYS.publicOfferings, 'deal', dealId] as const,

  // Program Trading
  programTrading: ['capital-markets-ext', 'program-trading'] as const,
  slippageReport: (code: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.programTrading, 'slippage', code] as const,

  // Quant Models
  quantModels: ['capital-markets-ext', 'quant-models'] as const,
  quantModelsByType: (type: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.quantModels, 'type', type] as const,
  quantModelsDueForReview: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.quantModels, 'due-for-review'] as const,
  quantModelBacktests: (code: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.quantModels, code, 'backtests'] as const,

  // Model Ops
  modelOps: ['capital-markets-ext', 'model-ops'] as const,
  modelOpsEvents: (code: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.modelOps, 'model', code] as const,
  modelOpsAlerts: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.modelOps, 'alerts'] as const,

  // Economic Capital
  economicCapital: ['capital-markets-ext', 'economic-capital'] as const,
  economicCapitalByDate: (date: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.economicCapital, date] as const,
  economicCapitalByBu: (date: string, bu: string) =>
    [...CAPITAL_MARKETS_EXT_KEYS.economicCapital, date, bu] as const,

  // Quotes
  quotes: ['capital-markets-ext', 'quotes'] as const,
  quoteRequests: () =>
    [...CAPITAL_MARKETS_EXT_KEYS.quotes, 'requests'] as const,
} as const;

// ─── Securitization Hooks ─────────────────────────────────────────────────────

export function useSecuritizationsByType(type: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.securitizationByType(type),
    queryFn: () => securitizationApi.byType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

export function useActiveSecuritizations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.securitizationActive(), params],
    queryFn: () => securitizationApi.byType2(params),
    staleTime: 30_000,
  });
}

export function useIssueSecuritization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<SecuritizationVehicle> }) =>
      securitizationApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.securitization });
    },
  });
}

// ─── Suitability Hooks ────────────────────────────────────────────────────────

export function useSuitabilityProfiles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.suitabilityProfiles(), params],
    queryFn: () => suitabilityApi.listProfiles(params),
    staleTime: 60_000,
  });
}

export function useSuitabilityChecks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.suitabilityChecks(), params],
    queryFn: () => suitabilityApi.getExpired(params),
    staleTime: 60_000,
  });
}

export function useCustomerSuitabilityCheck(customerId: number) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.suitabilityByCustomer(customerId),
    queryFn: () => suitabilityApi.acknowledge(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useOverrideSuitabilityCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, data }: { ref: string; data: Partial<SuitabilityCheck> }) =>
      suitabilityApi.performCheck(ref, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.suitability });
    },
  });
}

// ─── Public Offerings Hooks ───────────────────────────────────────────────────

export function usePublicOfferingByDeal(dealId: number) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.offeringByDeal(dealId),
    queryFn: () => publicOfferingsApi.getByDeal(dealId),
    enabled: !!dealId,
    staleTime: 30_000,
  });
}

export function useSubmitOfferingToRegulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => publicOfferingsApi.getByDeal2(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.publicOfferings });
    },
  });
}

export function useRecordAllotment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => publicOfferingsApi.recordAllotment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.publicOfferings });
    },
  });
}

// ─── Program Trading Hooks ────────────────────────────────────────────────────

export function useDefineStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TradingStrategy>) => programTradingApi.defineStrategy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.programTrading });
    },
  });
}

export function useLaunchExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<ProgramExecution> }) =>
      programTradingApi.launchExecution(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.programTrading });
    },
  });
}

export function usePauseExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => programTradingApi.pauseExecution(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.programTrading });
    },
  });
}

export function useResumeExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => programTradingApi.resumeExecution(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.programTrading });
    },
  });
}

export function useCancelExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => programTradingApi.cancelExecution(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.programTrading });
    },
  });
}

export function useSlippageReport(code: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.slippageReport(code),
    queryFn: () => programTradingApi.getSlippageReport(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

// ─── Quant Models Hooks ───────────────────────────────────────────────────────

export function useQuantModelsByType(type: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModelsByType(type),
    queryFn: () => quantModelsApi.getByType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useQuantModelsDueForReview(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.quantModelsDueForReview(), params],
    queryFn: () => quantModelsApi.getDueForReview(params),
    staleTime: 60_000,
  });
}

export function useQuantModelBacktests(code: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModelBacktests(code),
    queryFn: () => quantModelsApi.getBacktests(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useApproveQuantModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => quantModelsApi.approve(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModels });
    },
  });
}

export function usePromoteQuantModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => quantModelsApi.promote(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModels });
    },
  });
}

export function useRetireQuantModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => quantModelsApi.retire(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModels });
    },
  });
}

export function useRecordBacktest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<ModelBacktest> }) =>
      quantModelsApi.recordBacktest(code, data),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModelBacktests(code) });
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quantModels });
    },
  });
}

// ─── Model Ops Hooks ──────────────────────────────────────────────────────────

export function useModelOpsEvents(code: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.modelOpsEvents(code),
    queryFn: () => modelOpsApi.record(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useModelOpsAlerts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.modelOpsAlerts(), params],
    queryFn: () => modelOpsApi.getAlerts(params),
    staleTime: 30_000,
  });
}

// ─── Economic Capital Hooks ───────────────────────────────────────────────────

export function useEconomicCapitalByDate(date: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.economicCapitalByDate(date),
    queryFn: () => economicCapitalApi.calc(date),
    enabled: !!date,
    staleTime: 60_000,
  });
}

export function useEconomicCapitalByBu(date: string, bu: string) {
  return useQuery({
    queryKey: CAPITAL_MARKETS_EXT_KEYS.economicCapitalByBu(date, bu),
    queryFn: () => economicCapitalApi.byBu(date, bu),
    enabled: !!date && !!bu,
    staleTime: 60_000,
  });
}

// ─── Quotes Hooks ─────────────────────────────────────────────────────────────

export function useQuoteRequests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.quoteRequests(), params],
    queryFn: () => quotesApi.getQuoteRequests(params),
    staleTime: 30_000,
  });
}

export function useSubmitQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<QuoteRequest>) => quotesApi.submitRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quoteRequests() });
    },
  });
}

export function useGenerateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PriceQuote>) => quotesApi.generateQuote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quotes });
    },
  });
}

export function useAcceptQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => quotesApi.acceptQuote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quotes });
    },
  });
}

export function useExpireStaleQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => quotesApi.expireStaleQuotes(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAPITAL_MARKETS_EXT_KEYS.quotes });
    },
  });
}

// ─── Fixed Income Hooks ──────────────────────────────────────────────────────

import { fixedIncomeApi } from '@/features/treasury/api/fixedIncomeApi';
import type { SecurityHolding as FISecurityHolding } from '@/features/treasury/types/fixedIncome';

const FI_KEYS = {
  holdings: ['fixed-income', 'holdings'] as const,
  holding: (id: number) => ['fixed-income', 'holding', id] as const,
  portfolio: (code: string) => ['fixed-income', 'portfolio', code] as const,
  batchAccrual: ['fixed-income', 'batch', 'accrual'] as const,
  batchMtm: ['fixed-income', 'batch', 'mtm'] as const,
  batchMaturity: ['fixed-income', 'batch', 'maturity'] as const,
  batchCoupons: ['fixed-income', 'batch', 'coupons'] as const,
};

export function useFixedIncomeHolding(id: number) {
  return useQuery({
    queryKey: FI_KEYS.holding(id),
    queryFn: () => fixedIncomeApi.getHolding(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useFixedIncomePortfolio(code: string) {
  return useQuery({
    queryKey: FI_KEYS.portfolio(code),
    queryFn: () => fixedIncomeApi.getPortfolio(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useAddFixedIncomeHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FISecurityHolding>) => fixedIncomeApi.addHolding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FI_KEYS.holdings });
    },
  });
}

export function useRunBatchAccrual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchAccrual(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FI_KEYS.holdings });
    },
  });
}

export function useRunBatchMtm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchMtm({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FI_KEYS.holdings });
    },
  });
}

export function useRunBatchMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchMaturity(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FI_KEYS.holdings });
    },
  });
}

export function useRunBatchCoupons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fixedIncomeApi.batchCoupons(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FI_KEYS.holdings });
    },
  });
}

// ─── Valuation Hooks ────────────────────────────────────────────────────────

import { valuationApi } from '../api/valuationApi';
import type { ValuationModel, ValuationRun } from '../api/valuationApi';

const VAL_KEYS = {
  models: ['valuation', 'models'] as const,
  runs: ['valuation', 'runs'] as const,
  runSummary: (ref: string) => ['valuation', 'run', ref] as const,
  exceptions: (ref: string) => ['valuation', 'exceptions', ref] as const,
};

export function useValuationModels() {
  return useQuery({
    queryKey: VAL_KEYS.models,
    queryFn: () => valuationApi.getModels(),
    staleTime: 60_000,
  });
}

export function useValuationRuns() {
  return useQuery({
    queryKey: VAL_KEYS.runs,
    queryFn: () => valuationApi.getRuns(),
    staleTime: 30_000,
  });
}

export function useValuationRunSummary(ref: string) {
  return useQuery({
    queryKey: VAL_KEYS.runSummary(ref),
    queryFn: () => valuationApi.getRunSummary(ref),
    enabled: !!ref,
    staleTime: 30_000,
  });
}

export function useValuationExceptions(ref: string) {
  return useQuery({
    queryKey: VAL_KEYS.exceptions(ref),
    queryFn: () => valuationApi.getExceptions(ref),
    enabled: !!ref,
    staleTime: 30_000,
  });
}

export function useDefineValuationModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ValuationModel>) => valuationApi.defineModel(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: VAL_KEYS.models }); },
  });
}

export function useRunValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, date, runType }: { modelId: number; date: string; runType: string }) =>
      valuationApi.runValuation(modelId, date, runType),
    onSuccess: () => { qc.invalidateQueries({ queryKey: VAL_KEYS.runs }); },
  });
}

export function useCompleteValuationRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => valuationApi.completeRun(ref),
    onSuccess: () => { qc.invalidateQueries({ queryKey: VAL_KEYS.runs }); },
  });
}
