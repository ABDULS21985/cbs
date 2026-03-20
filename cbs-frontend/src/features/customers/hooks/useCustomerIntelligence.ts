import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import type { Customer } from '../types/customer';

const KEYS = {
  healthScore: (id: number) => ['customers', id, 'health-score'] as const,
  recommendations: (id: number) => ['customers', id, 'recommendations'] as const,
  timeline: (id: number, params?: Record<string, unknown>) => ['customers', id, 'timeline', params] as const,
  relationshipGraph: (id: number) => ['customers', id, 'relationship-graph'] as const,
};

export function useHealthScore(customerId: number) {
  return useQuery({
    queryKey: KEYS.healthScore(customerId),
    queryFn: () => customerApi.getHealthScore(customerId),
    enabled: customerId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useRecommendations(customerId: number) {
  return useQuery({
    queryKey: KEYS.recommendations(customerId),
    queryFn: () => customerApi.getRecommendations(customerId),
    enabled: customerId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCustomerTimeline(customerId: number, params?: { page?: number; size?: number; eventType?: string }) {
  return useQuery({
    queryKey: KEYS.timeline(customerId, params as Record<string, unknown>),
    queryFn: () => customerApi.getTimeline(customerId, params),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useRelationshipGraph(customerId: number) {
  return useQuery({
    queryKey: KEYS.relationshipGraph(customerId),
    queryFn: () => customerApi.getRelationshipGraph(customerId),
    enabled: customerId > 0,
    staleTime: 60_000,
  });
}

export function usePatchCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      customerApi.patchCustomer(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['customers', 'detail', id] });
    },
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      customerApi.uploadPhoto(id, file),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['customers', 'detail', id] });
    },
  });
}
