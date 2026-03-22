import { useQuery } from '@tanstack/react-query';
import {
  getBalanceSheet,
  getIncomeStatement,
  getCashFlow,
  getCapitalAdequacy,
} from '../api/financialReportApi';

export function useBalanceSheet(asOf?: string) {
  return useQuery({
    queryKey: ['financial-reports', 'balance-sheet', asOf],
    queryFn: () => getBalanceSheet(asOf),
    enabled: !!asOf,
  });
}

export function useIncomeStatement(from?: string, to?: string) {
  return useQuery({
    queryKey: ['financial-reports', 'income-statement', { from, to }],
    queryFn: () => getIncomeStatement(from, to),
  });
}

export function useCashFlow(from?: string, to?: string) {
  return useQuery({
    queryKey: ['financial-reports', 'cash-flow', { from, to }],
    queryFn: () => getCashFlow(from, to),
  });
}

export function useCapitalAdequacy() {
  return useQuery({
    queryKey: ['financial-reports', 'capital-adequacy'],
    queryFn: () => getCapitalAdequacy(),
  });
}
