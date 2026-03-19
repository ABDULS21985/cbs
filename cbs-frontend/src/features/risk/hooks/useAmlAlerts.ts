import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi } from '../api/amlApi';
import type { StrReport } from '../types/aml';

export function useAmlStats() {
  return useQuery({
    queryKey: ['aml', 'stats'],
    queryFn: () => amlApi.getStats().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useAmlAlerts(params?: { status?: string; priority?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['aml', 'alerts', params],
    queryFn: () => amlApi.listAlerts(params).then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useAmlAlert(id: number) {
  return useQuery({
    queryKey: ['aml', 'alert', id],
    queryFn: () => amlApi.getAlert(id).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAssignAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.assignAlert(id).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useEscalateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      amlApi.escalateAlert(id, reason).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      amlApi.dismissAlert(id, reason).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'alerts'] });
    },
  });
}

export function useStrList(params?: object) {
  return useQuery({
    queryKey: ['aml', 'strs', params],
    queryFn: () => amlApi.listStrs(params).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useCreateStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StrReport>) => amlApi.createStr(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aml', 'strs'] });
      qc.invalidateQueries({ queryKey: ['aml', 'stats'] });
    },
  });
}

export function useCtrList(params?: object) {
  return useQuery({
    queryKey: ['aml', 'ctrs', params],
    queryFn: () => amlApi.listCtrs(params).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useAmlRules() {
  return useQuery({
    queryKey: ['aml', 'rules'],
    queryFn: () => amlApi.listRules().then((r) => r.data.data),
    staleTime: 120_000,
  });
}
