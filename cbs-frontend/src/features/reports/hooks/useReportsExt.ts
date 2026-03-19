import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialStatementsApi } from '../api/financialStatementApi';
import { financialPositionsApi } from '../api/financialPositionApi';
import { financialInstrumentsApi } from '../api/financialInstrumentApi';
import { receivablesApi } from '../api/receivableApi';
import { businessContributionApi } from '../api/businessContributionApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  financialStatements: {
    all: ['reports', 'financial-statements'] as const,
    byCustomer: (id: number) =>
      ['reports', 'financial-statements', 'customer', id] as const,
    ratios: (code: string) =>
      ['reports', 'financial-statements', code, 'ratios'] as const,
  },
  financialPositions: {
    all: ['reports', 'financial-positions'] as const,
    byType: (type: string, date: string) =>
      ['reports', 'financial-positions', 'type', type, date] as const,
    breaches: (params?: Record<string, unknown>) =>
      ['reports', 'financial-positions', 'breaches', params] as const,
  },
  financialInstruments: {
    all: ['reports', 'financial-instruments'] as const,
    byCode: (code: string) =>
      ['reports', 'financial-instruments', code] as const,
    byType: (type: string) =>
      ['reports', 'financial-instruments', 'type', type] as const,
    byAssetClass: (assetClass: string) =>
      ['reports', 'financial-instruments', 'asset-class', assetClass] as const,
  },
  receivables: {
    all: ['reports', 'receivables'] as const,
    overdue: (params?: Record<string, unknown>) =>
      ['reports', 'receivables', 'overdue', params] as const,
    byCustomer: (id: number) =>
      ['reports', 'receivables', 'customer', id] as const,
  },
  businessContribution: {
    all: ['reports', 'business-contribution'] as const,
    byBusinessUnit: (bu: string) =>
      ['reports', 'business-contribution', 'bu', bu] as const,
    byProduct: (family: string) =>
      ['reports', 'business-contribution', 'product', family] as const,
    byRegion: (region: string) =>
      ['reports', 'business-contribution', 'region', region] as const,
    top: (params?: Record<string, unknown>) =>
      ['reports', 'business-contribution', 'top', params] as const,
    underperformers: (params?: Record<string, unknown>) =>
      ['reports', 'business-contribution', 'underperformers', params] as const,
  },
} as const;

// ─── Financial Statements ────────────────────────────────────────────────────

export function useFinancialStatementsByCustomer(id: number) {
  return useQuery({
    queryKey: KEYS.financialStatements.byCustomer(id),
    queryFn: () => financialStatementsApi.getByCustomer(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useFinancialStatementRatios(code: string) {
  return useQuery({
    queryKey: KEYS.financialStatements.ratios(code),
    queryFn: () => financialStatementsApi.getRatios(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useApproveFinancialStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => financialStatementsApi.approve(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.financialStatements.all });
    },
  });
}

export function useCalculateStatementRatios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => financialStatementsApi.calculateRatios(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: KEYS.financialStatements.ratios(code) });
    },
  });
}

// ─── Financial Positions ─────────────────────────────────────────────────────

export function useFinancialPositionsByType(type: string, date: string) {
  return useQuery({
    queryKey: KEYS.financialPositions.byType(type, date),
    queryFn: () => financialPositionsApi.getByType(type, date),
    enabled: !!type && !!date,
    staleTime: 60_000,
  });
}

export function useFinancialPositionBreaches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.financialPositions.breaches(params),
    queryFn: () => financialPositionsApi.getBreaches(params),
    staleTime: 30_000,
  });
}

// ─── Financial Instruments ───────────────────────────────────────────────────

export function useFinancialInstrument(code: string) {
  return useQuery({
    queryKey: KEYS.financialInstruments.byCode(code),
    queryFn: () => financialInstrumentsApi.getByCode(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useFinancialInstrumentsByType(type: string) {
  return useQuery({
    queryKey: KEYS.financialInstruments.byType(type),
    queryFn: () => financialInstrumentsApi.byType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useFinancialInstrumentsByAssetClass(assetClass: string) {
  return useQuery({
    queryKey: KEYS.financialInstruments.byAssetClass(assetClass),
    queryFn: () => financialInstrumentsApi.byAssetClass(assetClass),
    enabled: !!assetClass,
    staleTime: 60_000,
  });
}

// ─── Receivables ─────────────────────────────────────────────────────────────

export function useOverdueReceivables(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.receivables.overdue(params),
    queryFn: () => receivablesApi.getOverdue(params),
    staleTime: 30_000,
  });
}

export function useReceivablesByCustomer(id: number) {
  return useQuery({
    queryKey: KEYS.receivables.byCustomer(id),
    queryFn: () => receivablesApi.getByCustomer(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function usePayReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceNumber: string) => receivablesApi.pay(invoiceNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.receivables.all });
    },
  });
}

export function useMarkOverdueReceivables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => receivablesApi.markOverdue(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.receivables.all });
    },
  });
}

// ─── Business Contribution ───────────────────────────────────────────────────

export function useBusinessContributionByUnit(bu: string) {
  return useQuery({
    queryKey: KEYS.businessContribution.byBusinessUnit(bu),
    queryFn: () => businessContributionApi.byBusinessUnit(bu),
    enabled: !!bu,
    staleTime: 60_000,
  });
}

export function useBusinessContributionByProduct(family: string) {
  return useQuery({
    queryKey: KEYS.businessContribution.byProduct(family),
    queryFn: () => businessContributionApi.byProduct(family),
    enabled: !!family,
    staleTime: 60_000,
  });
}

export function useBusinessContributionByRegion(region: string) {
  return useQuery({
    queryKey: KEYS.businessContribution.byRegion(region),
    queryFn: () => businessContributionApi.byRegion(region),
    enabled: !!region,
    staleTime: 60_000,
  });
}

export function useTopContributors(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.businessContribution.top(params),
    queryFn: () => businessContributionApi.topContributors(params),
    staleTime: 60_000,
  });
}

export function useUnderperformers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.businessContribution.underperformers(params),
    queryFn: () => businessContributionApi.underperformers(params),
    staleTime: 60_000,
  });
}
