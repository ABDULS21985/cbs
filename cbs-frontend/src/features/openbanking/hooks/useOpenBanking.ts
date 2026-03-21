import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openBankingApi } from '../api/openBankingApi';
import type { RegisterTppPayload, CreateConsentPayload } from '../api/openBankingApi';

const QK = {
  tppClients: ['openbanking', 'tpp-clients'] as const,
  consents: ['openbanking', 'consents'] as const,
  consentsList: (params?: Record<string, unknown>) => ['openbanking', 'consents', 'list', params] as const,
  customerConsents: (customerId: string | number) => ['openbanking', 'consents', 'customer', customerId] as const,
};

// ─── TPP Client Hooks ───────────────────────────────────────────────────────

export function useTppClients() {
  return useQuery({
    queryKey: QK.tppClients,
    queryFn: () => openBankingApi.getTppClients(),
    staleTime: 60_000,
  });
}

export function useRegisterTppClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterTppPayload) => openBankingApi.registerTppClient(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.tppClients }); },
  });
}

// ─── Consent Hooks ──────────────────────────────────────────────────────────

export function useConsents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.consentsList(params),
    queryFn: () => openBankingApi.getConsents(),
    staleTime: 30_000,
  });
}

export function useCustomerConsents(customerId: string | number) {
  return useQuery({
    queryKey: QK.customerConsents(customerId),
    queryFn: () => openBankingApi.getCustomerConsents(customerId),
    enabled: !!customerId,
  });
}

export function useCreateConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConsentPayload) => openBankingApi.createConsent(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.consents }); },
  });
}

export function useAuthoriseConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consentId, customerId }: { consentId: string | number; customerId: number }) =>
      openBankingApi.authoriseConsent(consentId, customerId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.consents }); },
  });
}

export function useRevokeConsent(customerId?: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consentId }: { consentId: string | number; reason?: string }) =>
      openBankingApi.revokeConsent(consentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.consents });
      if (customerId) qc.invalidateQueries({ queryKey: QK.customerConsents(customerId) });
    },
  });
}
