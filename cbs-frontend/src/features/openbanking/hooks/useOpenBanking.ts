import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openBankingApi } from '../api/openBankingApi';

const QK = {
  tppClients: ['openbanking', 'tpp-clients'] as const,
  customerConsents: (customerId: string | number) =>
    ['openbanking', 'consents', 'customer', customerId] as const,
};

export function useTppClients() {
  return useQuery({
    queryKey: QK.tppClients,
    queryFn: () => openBankingApi.getTppClients(),
    staleTime: 60_000,
  });
}

export function useCustomerConsents(customerId: string | number) {
  return useQuery({
    queryKey: QK.customerConsents(customerId),
    queryFn: () => openBankingApi.getCustomerConsents(customerId),
    enabled: !!customerId,
  });
}

export function useRegisterTppClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof openBankingApi.registerTppClient>[0]) =>
      openBankingApi.registerTppClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.tppClients });
    },
  });
}

export function useCreateConsent() {
  return useMutation({
    mutationFn: (payload: Parameters<typeof openBankingApi.createConsent>[0]) =>
      openBankingApi.createConsent(payload),
  });
}

export function useRevokeConsent(customerId?: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consentId, reason }: { consentId: string | number; reason?: string }) =>
      openBankingApi.revokeConsent(consentId, reason),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: QK.customerConsents(customerId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ['openbanking', 'consents'] });
      }
    },
  });
}
