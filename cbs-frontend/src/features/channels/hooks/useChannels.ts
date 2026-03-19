import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelApi, type ChannelConfig, type ServicePointType } from '../api/channelApi';

const QK = {
  sessionCounts: ['channels', 'session-counts'] as const,
  configs: ['channels', 'configs'] as const,
  servicePointStatus: ['channels', 'service-point-status'] as const,
  servicePointMetrics: ['channels', 'service-point-metrics'] as const,
  availableServicePoints: (type?: ServicePointType) =>
    ['channels', 'service-points-available', type ?? 'all'] as const,
};

export function useChannelSessionCounts() {
  return useQuery({
    queryKey: QK.sessionCounts,
    queryFn: () => channelApi.getActiveSessionCounts(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useChannelConfigs() {
  return useQuery({
    queryKey: QK.configs,
    queryFn: () => channelApi.getChannelConfigs(),
    staleTime: 60_000,
  });
}

export function useServicePointStatus() {
  return useQuery({
    queryKey: QK.servicePointStatus,
    queryFn: () => channelApi.getServicePointStatus(),
    staleTime: 30_000,
  });
}

export function useServicePointMetrics() {
  return useQuery({
    queryKey: QK.servicePointMetrics,
    queryFn: () => channelApi.getServicePointMetrics(),
    staleTime: 60_000,
  });
}

export function useAvailableServicePoints(type?: ServicePointType) {
  return useQuery({
    queryKey: QK.availableServicePoints(type),
    queryFn: () => channelApi.getAvailableServicePoints(type),
    staleTime: 60_000,
  });
}

export function useSaveChannelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Omit<ChannelConfig, 'id'> & { id?: number }) =>
      channelApi.saveChannelConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.configs });
    },
  });
}

export function useRegisterServicePoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof channelApi.registerServicePoint>[0]) =>
      channelApi.registerServicePoint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
      queryClient.invalidateQueries({ queryKey: ['channels', 'service-points-available'] });
    },
  });
}

export function useCleanupSessions() {
  return useMutation({
    mutationFn: () => channelApi.cleanupExpiredSessions(),
  });
}
