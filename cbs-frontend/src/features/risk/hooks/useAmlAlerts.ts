import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi } from '../api/amlApi';
import type { StrReport } from '../types/aml';

export function useAmlStats() {
  return useQuery({
    queryKey: ['aml', 'stats'],
    queryFn: async () => (await amlApi.getStats()).data.data,
    staleTime: 30_000,
  });
}

export function useAmlAlerts(params?: { status?: string; priority?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['aml', 'alerts', params],
    queryFn: async () => (await amlApi.listAlerts(params)).data.data,
    staleTime: 30_000,
  });
}

export function useAmlAlert(id: number) {
  return useQuery({
    queryKey: ['aml', 'alert', id],
    queryFn: async () => (await amlApi.getAlert(id)).data.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAssignAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedTo }: { id: number; assignedTo: string }) =>
      (await amlApi.assignAlert(id, assignedTo)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useEscalateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await amlApi.escalateAlert(id)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await amlApi.dismissAlert(id)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useStrList(params?: object) {
  return useQuery({
    queryKey: ['aml', 'strs', params],
    queryFn: async () => (await amlApi.listStrs(params)).data.data,
    staleTime: 60_000,
  });
}

export function useCreateStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { alertId: number; reference?: string; filedBy?: string }) =>
      (await amlApi.createStr(data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'strs'] });
      qc.invalidateQueries({ queryKey: ['aml', 'stats'] });
    },
  });
}

export function useCtrList(params?: object) {
  return useQuery({
    queryKey: ['aml', 'ctrs', params],
    queryFn: async () => (await amlApi.listCtrs(params)).data.data,
    staleTime: 60_000,
  });
}

export function useAmlRules() {
  return useQuery({
    queryKey: ['aml', 'rules'],
    queryFn: async () => (await amlApi.listRules()).data.data,
    staleTime: 120_000,
  });
}
