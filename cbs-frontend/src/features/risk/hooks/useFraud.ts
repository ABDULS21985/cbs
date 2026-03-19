import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fraudApi } from '../api/fraudApi';

export function useFraudStats() {
  return useQuery({
    queryKey: ['fraud', 'stats'],
    queryFn: () => fraudApi.getStats().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useFraudTrend(days?: number) {
  return useQuery({
    queryKey: ['fraud', 'trend', days],
    queryFn: () => fraudApi.getTrend(days).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useFraudAlerts(params?: { status?: string; severity?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['fraud', 'alerts', params],
    queryFn: () => fraudApi.listAlerts(params).then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useFraudAlert(id: number | null) {
  return useQuery({
    queryKey: ['fraud', 'alert', id],
    queryFn: () => fraudApi.getAlert(id!).then((r) => r.data.data),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useFraudAlertTransactions(alertId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['fraud', 'alert-transactions', alertId],
    queryFn: () => fraudApi.getAlertTransactions(alertId!).then((r) => r.data.data),
    enabled: enabled && alertId !== null,
    staleTime: 30_000,
  });
}

export function useBlockCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.blockCard(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud'] }),
  });
}

export function useBlockAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.blockAccount(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud'] }),
  });
}

export function useAllowTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.allowTransaction(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud'] }),
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, reason }: { alertId: number; reason: string }) =>
      fraudApi.dismissAlert(alertId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud'] }),
  });
}

export function useFileFraudCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.fileFraudCase(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud'] }),
  });
}

export function useFraudRules() {
  return useQuery({
    queryKey: ['fraud', 'rules'],
    queryFn: () => fraudApi.listRules().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useModelPerformance() {
  return useQuery({
    queryKey: ['fraud', 'model-performance'],
    queryFn: () => fraudApi.getModelPerformance().then((r) => r.data.data),
    staleTime: 300_000,
  });
}

export function useToggleFraudRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => fraudApi.toggleRule(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud', 'rules'] }),
  });
}
