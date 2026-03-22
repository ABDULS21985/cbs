import { useQuery } from '@tanstack/react-query';
import {
  getExecutiveKpis,
  getPnlSummary,
  getMonthlyPnl,
  getKeyRatios,
  getCustomerGrowthData,
  getDepositLoanGrowthData,
  getTopBranches,
} from '../api/executiveReportApi';

export function useExecutiveReports() {
  const kpisQuery = useQuery({
    queryKey: ['executive-reports', 'kpis'],
    queryFn: () => getExecutiveKpis(),
    staleTime: 5 * 60 * 1000,
  });

  const pnlQuery = useQuery({
    queryKey: ['executive-reports', 'pnl'],
    queryFn: () => getPnlSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const monthlyPnlQuery = useQuery({
    queryKey: ['executive-reports', 'monthly-pnl'],
    queryFn: () => getMonthlyPnl(),
    staleTime: 5 * 60 * 1000,
  });

  const ratiosQuery = useQuery({
    queryKey: ['executive-reports', 'ratios'],
    queryFn: () => getKeyRatios(),
    staleTime: 5 * 60 * 1000,
  });

  const customerGrowthQuery = useQuery({
    queryKey: ['executive-reports', 'customer-growth'],
    queryFn: () => getCustomerGrowthData(),
    staleTime: 5 * 60 * 1000,
  });

  const depositLoanGrowthQuery = useQuery({
    queryKey: ['executive-reports', 'deposit-loan-growth'],
    queryFn: () => getDepositLoanGrowthData(),
    staleTime: 5 * 60 * 1000,
  });

  const branchesQuery = useQuery({
    queryKey: ['executive-reports', 'branches'],
    queryFn: () => getTopBranches(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    kpis: kpisQuery.data ?? [],
    kpisLoading: kpisQuery.isLoading,
    kpisError: kpisQuery.isError,

    pnl: pnlQuery.data,
    pnlLoading: pnlQuery.isLoading,
    pnlError: pnlQuery.isError,

    monthlyPnl: monthlyPnlQuery.data ?? [],
    monthlyPnlLoading: monthlyPnlQuery.isLoading,
    monthlyPnlError: monthlyPnlQuery.isError,

    ratios: ratiosQuery.data ?? [],
    ratiosLoading: ratiosQuery.isLoading,
    ratiosError: ratiosQuery.isError,

    customerGrowth: customerGrowthQuery.data ?? [],
    customerGrowthLoading: customerGrowthQuery.isLoading,
    customerGrowthError: customerGrowthQuery.isError,

    depositLoanGrowth: depositLoanGrowthQuery.data ?? [],
    depositLoanGrowthLoading: depositLoanGrowthQuery.isLoading,
    depositLoanGrowthError: depositLoanGrowthQuery.isError,

    branches: branchesQuery.data ?? [],
    branchesLoading: branchesQuery.isLoading,
    branchesError: branchesQuery.isError,

    hasLoadError:
      kpisQuery.isError ||
      pnlQuery.isError ||
      monthlyPnlQuery.isError ||
      ratiosQuery.isError ||
      customerGrowthQuery.isError ||
      depositLoanGrowthQuery.isError ||
      branchesQuery.isError,
  };
}
