import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fraudApi } from '../api/fraudExtApi';
import { amlApi } from '../api/amlExtApi';
import { sanctionsApi } from '../api/sanctionsExtApi';
import { opriskApi } from '../api/opriskExtApi';
import { marketRiskApi } from '../api/marketRiskExtApi';
import { liquidityRiskApi } from '../api/liquidityRiskExtApi';
import { creditMarginApi } from '../api/creditMarginApi';
import { businessRiskApi } from '../api/businessRiskApi';
import { riskContributionApi } from '../api/riskContributionApi';
import { businessContributionApi } from '../api/businessContributionApi';
import { transactionLimitApi } from '../api/transactionLimitApi';
import type { FraudRule } from '../types/fraudExt';
import type { AmlRule } from '../types/amlExt';
import type { OpRiskKri } from '../types/opriskExt';
import type { MarginCall } from '../types/creditMargin';
import type { BusinessRiskAssessment } from '../types/businessRisk';
import type { BusinessContribution } from '../types/businessContribution';
import type { TransactionLimit, LimitType } from '../types/transactionLimit';

// ─── Query Key Factories ────────────────────────────────────────────────────────

export const RISK_EXT_KEYS = {
  // Fraud
  fraud: ['fraud'] as const,
  fraudRules: ['fraud', 'rules'] as const,
  fraudAlerts: ['fraud', 'alerts'] as const,

  // AML
  aml: ['aml'] as const,
  amlRules: ['aml', 'rules'] as const,
  amlAlert: (id: number) => ['aml', 'alerts', id] as const,
  amlCustomerAlerts: (customerId: number) => ['aml', 'alerts', 'customer', customerId] as const,
  amlDashboard: ['aml', 'dashboard'] as const,

  // Sanctions
  sanctions: ['sanctions'] as const,
  sanctionsPending: ['sanctions', 'pending'] as const,

  // OpRisk
  oprisk: ['oprisk'] as const,
  opriskLossEvents: (category: string) => ['oprisk', 'loss-events', category] as const,
  opriskTotalLoss: ['oprisk', 'loss-events', 'total'] as const,
  opriskKris: ['oprisk', 'kris'] as const,
  opriskDashboard: (date: string) => ['oprisk', 'dashboard', date] as const,

  // Market Risk
  marketRisk: ['market-risk'] as const,
  marketRiskRecord: (date: string) => ['market-risk', date] as const,
  marketRiskBreaches: ['market-risk', 'breaches'] as const,

  // Liquidity Risk
  liquidityRisk: ['liquidity-risk'] as const,
  liquidityRiskCalc: (currency: string) => ['liquidity-risk', currency] as const,
  liquidityRiskBreaches: ['liquidity-risk', 'breaches'] as const,

  // Credit Margin
  creditMargin: ['credit-margin'] as const,
  marginCall: (ref: string) => ['credit-margin', 'margin-calls', ref] as const,
  marginCallsByCounterparty: (code: string) =>
    ['credit-margin', 'margin-calls', 'counterparty', code] as const,
  openMarginCalls: ['credit-margin', 'margin-calls', 'open'] as const,

  // Business Risk
  businessRisk: ['business-risk'] as const,
  businessRiskByDomain: (domain: string) => ['business-risk', 'domain', domain] as const,
  businessRiskByRating: (rating: string) => ['business-risk', 'rating', rating] as const,

  // Risk Contribution
  riskContribution: ['risk-contribution'] as const,
  riskContributionPortfolio: (code: string, date: string) =>
    ['risk-contribution', 'portfolio', code, date] as const,
  riskContributionBU: (bu: string, date: string) =>
    ['risk-contribution', 'business-unit', bu, date] as const,

  // Business Contribution
  businessContribution: ['business-contribution'] as const,
  businessContributionTop: (periodType: string, limit: number) =>
    ['business-contribution', 'top', periodType, limit] as const,
  businessContributionUnder: (periodType: string) =>
    ['business-contribution', 'underperformers', periodType] as const,
  businessContributionBU: (bu: string) =>
    ['business-contribution', 'business-unit', bu] as const,
  businessContributionProduct: (family: string) =>
    ['business-contribution', 'product', family] as const,
  businessContributionRegion: (region: string) =>
    ['business-contribution', 'region', region] as const,

  // Transaction Limits
  transactionLimits: ['transaction-limits'] as const,
  transactionLimitsByAccount: (accountId: number) =>
    ['transaction-limits', 'account', accountId] as const,
  transactionLimitUsage: (accountId: number, limitType: string) =>
    ['transaction-limits', 'usage', accountId, limitType] as const,
} as const;

// ─── Fraud Ext Hooks ────────────────────────────────────────────────────────────

export function useFraudRules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.fraudRules, params] as const,
    queryFn: () => fraudApi.getRules(params),
    staleTime: 60_000,
  });
}

export function useFraudAlerts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.fraudAlerts, params] as const,
    queryFn: () => fraudApi.getAlerts(params),
    staleTime: 30_000,
  });
}

export function useCreateFraudRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FraudRule>) => fraudApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.fraudRules });
    },
  });
}

export function useFraudScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fraudApi.score(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.fraudAlerts });
    },
  });
}

export function useAssignFraudAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fraudApi.assign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.fraudAlerts });
    },
  });
}

export function useResolveFraudAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fraudApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.fraudAlerts });
    },
  });
}

// ─── AML Ext Hooks ──────────────────────────────────────────────────────────────

export function useAmlRules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.amlRules, params] as const,
    queryFn: () => amlApi.getRules(params),
    staleTime: 60_000,
  });
}

export function useAmlAlert(id: number) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.amlAlert(id),
    queryFn: () => amlApi.getAlert(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useAmlCustomerAlerts(customerId: number) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.amlCustomerAlerts(customerId),
    queryFn: () => amlApi.getCustomerAlerts(customerId),
    staleTime: 30_000,
    enabled: customerId > 0,
  });
}

export function useAmlDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.amlDashboard, params] as const,
    queryFn: () => amlApi.getDashboard(params),
    staleTime: 30_000,
  });
}

export function useCreateAmlRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmlRule>) => amlApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.amlRules });
    },
  });
}

export function useAssignAmlAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.assign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.aml });
    },
  });
}

export function useEscalateAmlAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.escalate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.aml });
    },
  });
}

export function useResolveAmlAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.aml });
    },
  });
}

// ─── Sanctions Ext Hooks ────────────────────────────────────────────────────────

export function useSanctionsPending(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.sanctionsPending, params] as const,
    queryFn: () => sanctionsApi.getPending(params),
    staleTime: 30_000,
  });
}

export function useSanctionsScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sanctionsApi.screen(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.sanctions });
    },
  });
}

export function useDisposeSanctionsMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ screeningId, matchId }: { screeningId: number; matchId: number }) =>
      sanctionsApi.dispose(screeningId, matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.sanctions });
    },
  });
}

// ─── OpRisk Hooks ───────────────────────────────────────────────────────────────

export function useOpRiskLossEvents(category: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.opriskLossEvents(category),
    queryFn: () => opriskApi.getLossEvents(category),
    staleTime: 30_000,
    enabled: !!category,
  });
}

export function useOpRiskTotalLoss(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.opriskTotalLoss, params] as const,
    queryFn: () => opriskApi.getTotalLoss(params),
    staleTime: 30_000,
  });
}

export function useOpRiskKris(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.opriskKris, params] as const,
    queryFn: () => opriskApi.getKris(params),
    staleTime: 60_000,
  });
}

export function useOpRiskDashboard(date: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.opriskDashboard(date),
    queryFn: () => opriskApi.getDashboard(date),
    staleTime: 30_000,
    enabled: !!date,
  });
}

export function useReportOpRiskEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => opriskApi.reportEvent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.oprisk });
    },
  });
}

export function useCreateOpRiskKri() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OpRiskKri>) => opriskApi.createKri(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.opriskKris });
    },
  });
}

export function useRecordKriReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kriCode: string) => opriskApi.recordReading(kriCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.oprisk });
    },
  });
}

// ─── Market Risk Ext Hooks ──────────────────────────────────────────────────────

export function useMarketRiskRecord(date: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.marketRiskRecord(date),
    queryFn: () => marketRiskApi.record(date),
    staleTime: 30_000,
    enabled: !!date,
  });
}

export function useMarketRiskBreaches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.marketRiskBreaches, params] as const,
    queryFn: () => marketRiskApi.breaches(params),
    staleTime: 30_000,
  });
}

// ─── Liquidity Risk Ext Hooks ───────────────────────────────────────────────────

export function useLiquidityRiskCalc(currency: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.liquidityRiskCalc(currency),
    queryFn: () => liquidityRiskApi.calc(currency),
    staleTime: 30_000,
    enabled: !!currency,
  });
}

export function useLiquidityRiskBreaches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.liquidityRiskBreaches, params] as const,
    queryFn: () => liquidityRiskApi.breaches(params),
    staleTime: 30_000,
  });
}

// ─── Credit Margin Hooks ────────────────────────────────────────────────────────

export function useMarginCall(ref: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.marginCall(ref),
    queryFn: () => creditMarginApi.getCall(ref),
    staleTime: 30_000,
    enabled: !!ref,
  });
}

export function useMarginCallsByCounterparty(code: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.marginCallsByCounterparty(code),
    queryFn: () => creditMarginApi.getByCounterparty(code),
    staleTime: 30_000,
    enabled: !!code,
  });
}

export function useOpenMarginCalls(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RISK_EXT_KEYS.openMarginCalls, params] as const,
    queryFn: () => creditMarginApi.getOpenCalls(params),
    staleTime: 30_000,
  });
}

export function useIssueMarginCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MarginCall>) => creditMarginApi.issue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.creditMargin });
    },
  });
}

export function useAcknowledgeMarginCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, data }: { ref: string; data: Partial<MarginCall> }) =>
      creditMarginApi.acknowledge(ref, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.creditMargin });
    },
  });
}

export function useSettleMarginCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, data }: { ref: string; data: Record<string, unknown> }) =>
      creditMarginApi.settle(ref, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.creditMargin });
    },
  });
}

export function usePostCollateral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => creditMarginApi.postCollateral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.creditMargin });
    },
  });
}

// ─── Business Risk Hooks ────────────────────────────────────────────────────────

export function useBusinessRiskByDomain(domain: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessRiskByDomain(domain),
    queryFn: () => businessRiskApi.getByDomain(domain),
    staleTime: 60_000,
    enabled: !!domain,
  });
}

export function useBusinessRiskByRating(rating: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessRiskByRating(rating),
    queryFn: () => businessRiskApi.getByRating(rating),
    staleTime: 60_000,
    enabled: !!rating,
  });
}

export function useCreateBusinessRiskAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessRiskAssessment>) =>
      businessRiskApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.businessRisk });
    },
  });
}

export function useCompleteBusinessRiskAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      businessRiskApi.complete(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.businessRisk });
    },
  });
}

// ─── Risk Contribution Hooks ────────────────────────────────────────────────────

export function useRiskContributionPortfolio(code: string, date: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.riskContributionPortfolio(code, date),
    queryFn: () => riskContributionApi.calculate(code, date),
    staleTime: 60_000,
    enabled: !!code && !!date,
  });
}

export function useRiskContributionByBU(bu: string, date: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.riskContributionBU(bu, date),
    queryFn: () => riskContributionApi.getByBU(bu, date),
    staleTime: 60_000,
    enabled: !!bu && !!date,
  });
}

// ─── Business Contribution Hooks ───────────────────────────────────────────────

export function useBusinessContributionTop(periodType: string, limit: number) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessContributionTop(periodType, limit),
    queryFn: () => businessContributionApi.getTopContributors({ periodType, limit }),
    staleTime: 60_000,
    enabled: !!periodType && limit > 0,
  });
}

export function useBusinessContributionUnderperformers(periodType: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessContributionUnder(periodType),
    queryFn: () => businessContributionApi.getUnderperformers({ periodType }),
    staleTime: 60_000,
    enabled: !!periodType,
  });
}

export function useBusinessContributionByBU(bu: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessContributionBU(bu),
    queryFn: () => businessContributionApi.getByBusinessUnit(bu),
    staleTime: 60_000,
    enabled: !!bu,
  });
}

export function useBusinessContributionByProduct(family: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessContributionProduct(family),
    queryFn: () => businessContributionApi.getByProduct(family),
    staleTime: 60_000,
    enabled: !!family,
  });
}

export function useBusinessContributionByRegion(region: string) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.businessContributionRegion(region),
    queryFn: () => businessContributionApi.getByRegion(region),
    staleTime: 60_000,
    enabled: !!region,
  });
}

// ─── Transaction Limit Hooks ──────────────────────────────────────────────────

export function useTransactionLimitsByAccount(accountId: number) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.transactionLimitsByAccount(accountId),
    queryFn: () => transactionLimitApi.getByAccount(accountId),
    staleTime: 30_000,
    enabled: accountId > 0,
  });
}

export function useTransactionLimitUsage(accountId: number, limitType: LimitType) {
  return useQuery({
    queryKey: RISK_EXT_KEYS.transactionLimitUsage(accountId, limitType),
    queryFn: () => transactionLimitApi.getUsage(accountId, limitType),
    staleTime: 15_000,
    enabled: accountId > 0,
  });
}

export function useCreateTransactionLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TransactionLimit>) => transactionLimitApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.transactionLimits });
    },
  });
}

export function useUpdateTransactionLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: number; params: { maxAmount?: number; maxCount?: number } }) =>
      transactionLimitApi.update(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RISK_EXT_KEYS.transactionLimits });
    },
  });
}
