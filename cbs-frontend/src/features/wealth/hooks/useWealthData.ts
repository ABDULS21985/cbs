import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../api/trustExtApi';
import { wealthManagementApi } from '../api/wealthExtApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  trusts: {
    all: ['wealth', 'trusts'] as const,
    byGrantor: (grantorId: number) => ['wealth', 'trusts', 'grantor', grantorId] as const,
    byType: (type: string) => ['wealth', 'trusts', 'type', type] as const,
  },
  wealthManagement: {
    all: ['wealth', 'management'] as const,
    byCustomer: (customerId: number) =>
      ['wealth', 'management', 'customer', customerId] as const,
    byAdvisor: (advisorId: number) =>
      ['wealth', 'management', 'advisor', advisorId] as const,
  },
} as const;

// ─── Trusts ──────────────────────────────────────────────────────────────────

export function useTrustsByGrantor(grantorId: number) {
  return useQuery({
    queryKey: KEYS.trusts.byGrantor(grantorId),
    queryFn: () => trustsApi.getByGrantor(grantorId),
    enabled: !!grantorId,
    staleTime: 30_000,
  });
}

export function useTrustsByType(type: string) {
  return useQuery({
    queryKey: KEYS.trusts.byType(type),
    queryFn: () => trustsApi.getByType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

// ─── Wealth Management ───────────────────────────────────────────────────────

export function useWealthPlansByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.wealthManagement.byCustomer(customerId),
    queryFn: () => wealthManagementApi.getByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useWealthPlansByAdvisor(advisorId: number) {
  return useQuery({
    queryKey: KEYS.wealthManagement.byAdvisor(advisorId),
    queryFn: () => wealthManagementApi.getByAdvisor(advisorId),
    enabled: !!advisorId,
    staleTime: 30_000,
  });
}
