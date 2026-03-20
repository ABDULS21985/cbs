import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { fixedDepositApi, type FixedDeposit, type FdStats, type InterestCalcParams, type InterestCalcResult } from '../api/fixedDepositApi';

type ActiveTab = 'active' | 'maturing' | 'matured' | 'liquidated';

const TAB_STATUS_MAP: Record<ActiveTab, string> = {
  active: 'ACTIVE',
  maturing: 'ACTIVE',
  matured: 'MATURED',
  liquidated: 'LIQUIDATED',
};

function isMaturingSoon(fd: FixedDeposit): boolean {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const mat = new Date(fd.maturityDate);
  return mat >= today && mat <= in30Days;
}

export function useFixedDeposits() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');

  const { data: allFds = [], isLoading: listLoading } = useQuery<FixedDeposit[]>({
    queryKey: ['fixed-deposits', 'list', TAB_STATUS_MAP[activeTab]],
    queryFn: () => fixedDepositApi.getFixedDeposits({ status: TAB_STATUS_MAP[activeTab] }),
    staleTime: 30_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<FdStats>({
    queryKey: ['fixed-deposits', 'stats'],
    queryFn: () => fixedDepositApi.getStats(),
    staleTime: 60_000,
  });

  const list: FixedDeposit[] = activeTab === 'maturing'
    ? allFds.filter(isMaturingSoon)
    : allFds;

  const isLoading = listLoading || statsLoading;

  return { list, stats, isLoading, activeTab, setActiveTab };
}

// ─── Customer/Account Lookup Hooks ──────────────────────────────────────────

interface CustomerSummary {
  id: number;
  customerNumber: string;
  fullName: string;
  type: string;
  status: string;
}

interface CustomerAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  status: string;
}

export function useCustomerSearch(query: string) {
  return useQuery<CustomerSummary[]>({
    queryKey: ['customers', 'search', query],
    queryFn: () => apiGet<CustomerSummary[]>('/api/v1/customers', { search: query, page: 0, size: 10 } as Record<string, unknown>).catch(() => []),
    enabled: query.length >= 2,
    staleTime: 15_000,
  });
}

export function useCustomerAccounts(customerId: number) {
  return useQuery<CustomerAccount[]>({
    queryKey: ['accounts', 'customer', customerId],
    queryFn: () => apiGet<CustomerAccount[]>(`/api/v1/accounts/customer/${customerId}`).catch(() => []),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useCalculateInterest() {
  return useMutation({
    mutationFn: (params: InterestCalcParams) => fixedDepositApi.calculateInterest(params),
  });
}

export function useCreateFixedDeposit() {
  return useMutation({
    mutationFn: fixedDepositApi.createFixedDeposit,
  });
}

export function useAllFixedDeposits() {
  return useQuery<FixedDeposit[]>({
    queryKey: ['fixed-deposits', 'all'],
    queryFn: () => fixedDepositApi.getFixedDeposits({}),
    staleTime: 30_000,
  });
}

export function useCustomerDeposits(customerId: string) {
  return useQuery<FixedDeposit[]>({
    queryKey: ['fixed-deposits', 'customer', customerId],
    queryFn: () => fixedDepositApi.getCustomerFds(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useBatchProcessMaturity() {
  return useMutation({
    mutationFn: () => fixedDepositApi.batchProcessMaturity(),
  });
}

export function useBatchAccrueInterest() {
  return useMutation({
    mutationFn: () => fixedDepositApi.batchAccrueInterest(),
  });
}

export function useFdStats() {
  return useQuery<FdStats>({
    queryKey: ['fixed-deposits', 'stats'],
    queryFn: () => fixedDepositApi.getStats(),
    staleTime: 60_000,
  });
}

export function useRateTables() {
  return useQuery({
    queryKey: ['fixed-deposits', 'rates'],
    queryFn: () => fixedDepositApi.getRateTables(),
    staleTime: 5 * 60_000,
  });
}

export type { CustomerSummary, CustomerAccount };
