import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashPoolsApi } from '../api/cashPoolExtApi';
import { virtualAccountsApi } from '../api/virtualAccountExtApi';
import { notionalPoolsApi } from '../api/notionalPoolApi';
import { walletsApi } from '../api/walletApi';
import type { CashPoolParticipant } from '../types/cashPoolExt';
import type { NotionalPoolMember } from '../types/notionalPool';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  cashPools: {
    all: ['accounts', 'cash-pools'] as const,
    participants: (poolCode: string) =>
      ['accounts', 'cash-pools', poolCode, 'participants'] as const,
  },
  virtualAccounts: {
    all: ['accounts', 'virtual-accounts'] as const,
  },
  notionalPools: {
    all: ['accounts', 'notional-pools'] as const,
    members: (poolCode: string) =>
      ['accounts', 'notional-pools', poolCode, 'members'] as const,
  },
  wallets: {
    all: ['accounts', 'wallets'] as const,
    byAccount: (accountId: number) =>
      ['accounts', 'wallets', accountId] as const,
  },
} as const;

// ─── Cash Pools ──────────────────────────────────────────────────────────────

export function useCashPoolParticipants(poolCode: string) {
  return useQuery({
    queryKey: KEYS.cashPools.participants(poolCode),
    queryFn: () => cashPoolsApi.participants(poolCode),
    enabled: !!poolCode,
    staleTime: 30_000,
  });
}

export function useAddCashPoolParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poolCode, data }: { poolCode: string; data: Partial<CashPoolParticipant> }) =>
      cashPoolsApi.addParticipant(poolCode, data),
    onSuccess: (_data, { poolCode }) => {
      qc.invalidateQueries({ queryKey: KEYS.cashPools.participants(poolCode) });
    },
  });
}

export function useSweepCashPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poolCode: string) => cashPoolsApi.sweep(poolCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cashPools.all });
    },
  });
}

// ─── Virtual Accounts ────────────────────────────────────────────────────────

export function useCreditVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => virtualAccountsApi.credit(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

export function useDebitVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => virtualAccountsApi.debit(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

export function useSweepVirtualAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => virtualAccountsApi.sweep(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

export function useDeactivateVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => virtualAccountsApi.deactivate(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

// ─── Notional Pools ──────────────────────────────────────────────────────────

export function useNotionalPoolMembers(poolCode: string) {
  return useQuery({
    queryKey: KEYS.notionalPools.members(poolCode),
    queryFn: () => notionalPoolsApi.members(poolCode),
    enabled: !!poolCode,
    staleTime: 30_000,
  });
}

export function useAddNotionalPoolMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poolCode, data }: { poolCode: string; data: Partial<NotionalPoolMember> }) =>
      notionalPoolsApi.addMember(poolCode, data),
    onSuccess: (_data, { poolCode }) => {
      qc.invalidateQueries({ queryKey: KEYS.notionalPools.members(poolCode) });
    },
  });
}

export function useCalculateNotionalPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poolCode: string) => notionalPoolsApi.calculate(poolCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notionalPools.all });
    },
  });
}

// ─── Wallets ─────────────────────────────────────────────────────────────────

export function useWallets(accountId: number) {
  return useQuery({
    queryKey: KEYS.wallets.byAccount(accountId),
    queryFn: () => walletsApi.getWallets(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useAddWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => walletsApi.addWallet(accountId),
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useCreditWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => walletsApi.credit(accountId),
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useDebitWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => walletsApi.debit(accountId),
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useConvertWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => walletsApi.convert(accountId),
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}
