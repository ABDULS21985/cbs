import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashPoolsApi } from '../api/cashPoolExtApi';
import { virtualAccountsApi } from '../api/virtualAccountExtApi';
import { notionalPoolsApi } from '../api/notionalPoolApi';
import { walletsApi } from '../api/walletApi';
import type { CashPoolParticipant } from '../api/cashPoolApi';
import type { NotionalPoolMember, NotionalPoolCalcResult } from '../types/notionalPool';
import type {
  WalletCreateRequest,
  WalletCreditRequest,
  WalletDebitRequest,
  WalletConvertRequest,
} from '../types/wallet';

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
    detail: (poolCode: string) =>
      ['accounts', 'notional-pools', poolCode] as const,
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

export function useUpdateCashPoolParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poolCode, participantId, data }: { poolCode: string; participantId: number; data: Partial<CashPoolParticipant> }) =>
      cashPoolsApi.updateParticipant(poolCode, participantId, data),
    onSuccess: (_data, { poolCode }) => {
      qc.invalidateQueries({ queryKey: KEYS.cashPools.participants(poolCode) });
      qc.invalidateQueries({ queryKey: KEYS.cashPools.all });
    },
  });
}

export function useRemoveCashPoolParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poolCode, participantId }: { poolCode: string; participantId: number }) =>
      cashPoolsApi.removeParticipant(poolCode, participantId),
    onSuccess: (_data, { poolCode }) => {
      qc.invalidateQueries({ queryKey: KEYS.cashPools.participants(poolCode) });
      qc.invalidateQueries({ queryKey: KEYS.cashPools.all });
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
    mutationFn: ({ number, amount, reference }: { number: string; amount: number; reference?: string }) =>
      virtualAccountsApi.credit(number, amount, reference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

export function useDebitVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, amount }: { number: string; amount: number }) =>
      virtualAccountsApi.debit(number, amount),
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

export function useSweepSingleVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => virtualAccountsApi.sweepSingle(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.virtualAccounts.all });
    },
  });
}

export function useActivateVirtualAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => virtualAccountsApi.activate(number),
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

export function useNotionalPools() {
  return useQuery({
    queryKey: KEYS.notionalPools.all,
    queryFn: () => notionalPoolsApi.list(),
    staleTime: 30_000,
  });
}

export function useNotionalPool(poolCode: string) {
  return useQuery({
    queryKey: KEYS.notionalPools.detail(poolCode),
    queryFn: () => notionalPoolsApi.get(poolCode),
    enabled: !!poolCode,
    staleTime: 30_000,
  });
}

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
    onSuccess: (_data, poolCode) => {
      qc.invalidateQueries({ queryKey: KEYS.notionalPools.all });
      qc.invalidateQueries({ queryKey: KEYS.notionalPools.detail(poolCode) });
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
    mutationFn: ({ accountId, data }: { accountId: number; data: WalletCreateRequest }) =>
      walletsApi.addWallet(accountId, data),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useCreditWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: number; data: WalletCreditRequest }) =>
      walletsApi.credit(accountId, data),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useDebitWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: number; data: WalletDebitRequest }) =>
      walletsApi.debit(accountId, data),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useConvertWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: number; data: WalletConvertRequest }) =>
      walletsApi.convert(accountId, data),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({ queryKey: KEYS.wallets.byAccount(accountId) });
    },
  });
}

export function useWalletTransactions(walletId: number) {
  return useQuery({
    queryKey: [...KEYS.wallets.all, walletId, 'transactions'] as const,
    queryFn: () => walletsApi.transactions(walletId),
    enabled: !!walletId,
    staleTime: 30_000,
  });
}
