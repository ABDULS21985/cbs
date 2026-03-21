import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentAccountingApi } from '../api/investmentAccountingApi';
import { bankPortfoliosApi } from '../api/bankPortfolioApi';
import { interbankRelationshipsApi } from '../api/interbankApi';
import type { InvestmentPortfolio } from '../types/investmentAccounting';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  portfolios: {
    all: ['investments', 'portfolios'] as const,
    list: (params?: Record<string, unknown>) =>
      ['investments', 'portfolios', 'list', params] as const,
    valuations: (portfolioCode: string, date: string) =>
      ['investments', 'portfolios', portfolioCode, 'valuations', date] as const,
  },
  bankPortfolios: {
    all: ['investments', 'bank-portfolios'] as const,
    byType: (type: string) => ['investments', 'bank-portfolios', 'type', type] as const,
  },
  interbank: {
    all: ['investments', 'interbank'] as const,
    byType: (type: string) => ['investments', 'interbank', 'type', type] as const,
  },
} as const;

// ─── Investment Accounting ───────────────────────────────────────────────────

export function useInvestmentPortfolios(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.portfolios.list(params),
    queryFn: () => investmentAccountingApi.getPortfolios(params),
    staleTime: 60_000,
  });
}

export function useInvestmentValuations(portfolioCode: string, date: string) {
  return useQuery({
    queryKey: KEYS.portfolios.valuations(portfolioCode, date),
    queryFn: () => investmentAccountingApi.getValuations(portfolioCode, date),
    enabled: !!portfolioCode && !!date,
    staleTime: 60_000,
  });
}

export function useCreateInvestmentPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InvestmentPortfolio>) =>
      investmentAccountingApi.createPortfolio(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.portfolios.all });
    },
  });
}

// ─── Customer Portfolios (InvestmentPortfolioController) ─────────────────────

export function usePortfolios() {
  return useQuery({
    queryKey: ['investment-portfolios', 'all'],
    queryFn: async () => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.getPortfolios();
    },
    staleTime: 30_000,
  });
}

export function usePortfolioDetail(code: string) {
  return useQuery({
    queryKey: ['investment-portfolios', code],
    queryFn: async () => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.getPortfolioDetail(code);
    },
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function usePortfolioHoldings(code: string) {
  return useQuery({
    queryKey: ['investment-portfolios', code, 'holdings'],
    queryFn: async () => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.getHoldings(code);
    },
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useCustomerPortfolios(customerId: number) {
  return useQuery({
    queryKey: ['investment-portfolios', 'customer', customerId],
    queryFn: async () => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.getPortfolios(customerId);
    },
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { customerId: number; type: string; name: string; currency: string; benchmark?: string; manager?: string }) => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.createPortfolio(input as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investment-portfolios'] }); },
  });
}

export function useAddHolding(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { instrumentCode: string; instrumentName: string; holdingType: string; quantity: number; costPrice: number; currency: string }) => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.addHolding(code, input as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investment-portfolios', code] }); },
  });
}

export function useValuatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { capitalMarketsApi } = await import('../../capitalmarkets/api/capitalMarketsApi');
      return capitalMarketsApi.valuatePortfolio(code);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investment-portfolios'] }); },
  });
}

export function useAccountingSummary(code: string, date: string) {
  return useQuery({
    queryKey: ['investment-accounting', 'summary', code, date],
    queryFn: async () => {
      const { apiGet } = await import('@/lib/api');
      return apiGet<Record<string, unknown>>(`/api/v1/investment-accounting/summary/${code}/${date}`);
    },
    enabled: !!code && !!date,
    staleTime: 60_000,
  });
}

// ─── Bank Portfolios ─────────────────────────────────────────────────────────

export function useBankPortfolios() {
  return useQuery({
    queryKey: KEYS.bankPortfolios.all,
    queryFn: () => bankPortfoliosApi.getAll(),
    staleTime: 30_000,
  });
}

export function useBankPortfolioByType(type: string) {
  return useQuery({
    queryKey: KEYS.bankPortfolios.byType(type),
    queryFn: () => bankPortfoliosApi.getByType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useCreateBankPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/bankPortfolio').BankPortfolio>) =>
      bankPortfoliosApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankPortfolios.all });
    },
  });
}

// ─── Interbank Relationships ─────────────────────────────────────────────────

export function useInterbankRelationships() {
  return useQuery({
    queryKey: KEYS.interbank.all,
    queryFn: () => interbankRelationshipsApi.getAll(),
    staleTime: 30_000,
  });
}

export function useInterbankRelationshipsByType(type: string) {
  return useQuery({
    queryKey: KEYS.interbank.byType(type),
    queryFn: () => interbankRelationshipsApi.byType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useCreateInterbankRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/interbank').InterbankRelationship>) =>
      interbankRelationshipsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.interbank.all });
    },
  });
}
