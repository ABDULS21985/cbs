import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internetBankingApi } from '../api/internetBankingApi';
import { ussdApi } from '../api/ussdApi';
import type { UssdMenu } from '../types/ussd';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  internetBanking: {
    all: ['portal', 'internet-banking'] as const,
    features: (sessionId: number) =>
      ['portal', 'internet-banking', 'sessions', sessionId, 'features'] as const,
    canAccess: (sessionId: number, featureCode: string) =>
      ['portal', 'internet-banking', 'sessions', sessionId, 'can-access', featureCode] as const,
  },
  ussd: {
    all: ['portal', 'ussd'] as const,
    menus: (params?: Record<string, unknown>) =>
      ['portal', 'ussd', 'menus', params] as const,
  },
} as const;

// ─── Internet Banking ────────────────────────────────────────────────────────

export function useInternetBankingFeatures(sessionId: number) {
  return useQuery({
    queryKey: KEYS.internetBanking.features(sessionId),
    queryFn: () => internetBankingApi.features(sessionId),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useCanAccessFeature(sessionId: number, featureCode: string) {
  return useQuery({
    queryKey: KEYS.internetBanking.canAccess(sessionId, featureCode),
    queryFn: () => internetBankingApi.canAccess(sessionId, featureCode),
    enabled: !!sessionId && !!featureCode,
    staleTime: 60_000,
  });
}

export function useInternetBankingLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => internetBankingApi.login(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.internetBanking.all });
    },
  });
}

export function useCompleteMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => internetBankingApi.completeMfa(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.internetBanking.all });
    },
  });
}

export function useTouchInternetBankingSession() {
  return useMutation({
    mutationFn: (sessionId: number) => internetBankingApi.touch(sessionId),
  });
}

export function useInternetBankingLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => internetBankingApi.logout(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.internetBanking.all });
    },
  });
}

export function useExpireIdleSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => internetBankingApi.expireIdle(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.internetBanking.all });
    },
  });
}

// ─── USSD ────────────────────────────────────────────────────────────────────

export function useUssdMenus(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.ussd.menus(params),
    queryFn: () => ussdApi.getRootMenus(params),
    staleTime: 60_000,
  });
}

export function useCreateUssdMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UssdMenu>) => ussdApi.createMenu(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ussd.all });
    },
  });
}
