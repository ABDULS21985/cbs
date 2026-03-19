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

// ─── Bank Portfolios ─────────────────────────────────────────────────────────

export function useBankPortfolioByType(type: string) {
  return useQuery({
    queryKey: KEYS.bankPortfolios.byType(type),
    queryFn: () => bankPortfoliosApi.create(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

// ─── Interbank Relationships ─────────────────────────────────────────────────

export function useInterbankRelationshipsByType(type: string) {
  return useQuery({
    queryKey: KEYS.interbank.byType(type),
    queryFn: () => interbankRelationshipsApi.byType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}
