import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { psd2Api } from '../api/psd2Api';

const QK = {
  tpps: ['psd2', 'tpps'] as const,
  activeTpps: ['psd2', 'tpps', 'active'] as const,
  scaSessions: (customerId: number) => ['psd2', 'sca', 'customer', customerId] as const,
};

export function usePsd2Tpps() {
  return useQuery({ queryKey: QK.tpps, queryFn: () => psd2Api.listTpps(), staleTime: 60_000 });
}

export function useActivePsd2Tpps() {
  return useQuery({ queryKey: QK.activeTpps, queryFn: () => psd2Api.getActiveTpps(), staleTime: 60_000 });
}

export function useRegisterPsd2Tpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tppName: string;
      tppType: string;
      nationalAuthority: string;
      authorizationNumber: string;
      eidasCertificate?: string;
      allowedScopes?: string[];
      scaApproach?: string;
    }) => psd2Api.registerTpp(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.tpps }); },
  });
}

export function useActivatePsd2Tpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tppId: string) => psd2Api.activateTpp(tppId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.tpps }); },
  });
}

export function useSuspendPsd2Tpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tppId: string) => psd2Api.suspendTpp(tppId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.tpps }); },
  });
}

export function useCustomerScaSessions(customerId: number) {
  return useQuery({
    queryKey: QK.scaSessions(customerId),
    queryFn: () => psd2Api.getCustomerScaSessions(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useInitiateSca() {
  return useMutation({
    mutationFn: (data: {
      tppId: string;
      customerId: number;
      scaMethod: string;
      paymentId?: number;
      consentId?: string;
      amount?: number;
    }) => psd2Api.initiateSca(data),
  });
}

export function useFinaliseSca() {
  return useMutation({
    mutationFn: ({ sessionId, success }: { sessionId: string; success: boolean }) =>
      psd2Api.finaliseSca(sessionId, success),
  });
}
