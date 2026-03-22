import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facilityApi } from '../api/facilityApi';
import type { DrawdownRequest, CreateFacilityPayload } from '../types/facility';

const KEYS = {
  facilities: (params?: Record<string, unknown>) => ['credit-facilities', params] as const,
  facility: (id: number) => ['credit-facilities', id] as const,
  subLimits: (id: number) => ['credit-facilities', id, 'sub-limits'] as const,
  drawdowns: (id: number) => ['credit-facilities', id, 'drawdowns'] as const,
  utilizationHistory: (id: number) => ['credit-facilities', id, 'utilization-history'] as const,
  covenants: (id: number) => ['credit-facilities', id, 'covenants'] as const,
};

export function useFacilities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.facilities(params),
    queryFn: () => facilityApi.list(params),
  });
}

export function useFacility(id: number) {
  return useQuery({
    queryKey: KEYS.facility(id),
    queryFn: () => facilityApi.getById(id),
    enabled: !!id,
  });
}

export function useFacilitySubLimits(id: number) {
  return useQuery({
    queryKey: KEYS.subLimits(id),
    queryFn: () => facilityApi.getSubLimits(id),
    enabled: !!id,
  });
}

export function useFacilityDrawdowns(id: number) {
  return useQuery({
    queryKey: KEYS.drawdowns(id),
    queryFn: () => facilityApi.getDrawdowns(id),
    enabled: !!id,
  });
}

export function useFacilityUtilizationHistory(id: number) {
  return useQuery({
    queryKey: KEYS.utilizationHistory(id),
    queryFn: () => facilityApi.getUtilizationHistory(id),
    enabled: !!id,
  });
}

export function useFacilityCovenants(id: number) {
  return useQuery({
    queryKey: KEYS.covenants(id),
    queryFn: () => facilityApi.getCovenants(id),
    enabled: !!id,
  });
}

export function useSubmitDrawdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DrawdownRequest) =>
      facilityApi.submitDrawdown(data.facilityId, data.amount, data.narration),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.drawdowns(variables.facilityId) });
      queryClient.invalidateQueries({ queryKey: KEYS.facility(variables.facilityId) });
    },
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacilityPayload) => facilityApi.createFacility(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-facilities'] });
    },
  });
}

export function useRepayFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ facilityId, amount, narration }: { facilityId: number; amount: number; narration?: string }) =>
      facilityApi.repay(facilityId, amount, narration),
    onSuccess: (_data, { facilityId }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.facility(facilityId) });
      queryClient.invalidateQueries({ queryKey: KEYS.utilizationHistory(facilityId) });
    },
  });
}
