import { useQuery } from '@tanstack/react-query';
import { openbankingApi } from '../api/openBankingExtApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  consents: {
    all: ['openbanking', 'consents'] as const,
    list: (params?: Record<string, unknown>) =>
      ['openbanking', 'consents', 'list', params] as const,
  },
} as const;

// ─── Open Banking Consents ───────────────────────────────────────────────────

export function useOpenBankingConsents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.consents.list(params),
    queryFn: () => openbankingApi.listConsents(params),
    staleTime: 30_000,
  });
}
