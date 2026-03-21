import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelApi, type ChannelConfig, type ServicePoint, type ServicePointInteraction } from '../api/channelApi';

const QK = {
  sessionCounts: ['channels', 'session-counts'] as const,
  sessions: ['channels', 'sessions'] as const,
  configs: ['channels', 'configs'] as const,
  servicePoints: ['channels', 'service-points'] as const,
  servicePointStatus: ['channels', 'service-point-status'] as const,
  servicePointMetrics: (id?: number) =>
    ['channels', 'service-point-metrics', id ?? 'all'] as const,
  availableServicePoints: (type?: string) =>
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

export function useChannelSessions(params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: [...QK.sessions, params],
    queryFn: () => channelApi.listSessions(params),
    staleTime: 15_000,
  });
}

export function useChannelConfigs() {
  return useQuery({
    queryKey: QK.configs,
    queryFn: () => channelApi.getChannelConfigs(),
    staleTime: 60_000,
  });
}

export function useAllServicePoints() {
  return useQuery({
    queryKey: QK.servicePoints,
    queryFn: () => channelApi.getAllServicePoints(),
    staleTime: 30_000,
  });
}

export function useServicePointStatus() {
  return useQuery({
    queryKey: QK.servicePointStatus,
    queryFn: () => channelApi.getServicePointStatus(),
    staleTime: 30_000,
  });
}

export function useServicePointMetrics(servicePointId?: number) {
  return useQuery({
    queryKey: QK.servicePointMetrics(servicePointId),
    queryFn: () => channelApi.getServicePointMetrics(servicePointId),
    staleTime: 60_000,
    enabled: servicePointId != null,
  });
}

export function useAvailableServicePoints(type?: string) {
  return useQuery({
    queryKey: QK.availableServicePoints(type),
    queryFn: () => channelApi.getAvailableServicePoints(type),
    staleTime: 60_000,
  });
}

export function useSaveChannelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<ChannelConfig>) =>
      channelApi.saveChannelConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.configs });
    },
  });
}

export function useRegisterServicePoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<ServicePoint, 'id' | 'servicePointCode'>) =>
      channelApi.registerServicePoint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePoints });
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
      queryClient.invalidateQueries({ queryKey: ['channels', 'service-points-available'] });
    },
  });
}

export function useCleanupSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => channelApi.cleanupExpiredSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sessions });
      queryClient.invalidateQueries({ queryKey: QK.sessionCounts });
    },
  });
}

export function useEndChannelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => channelApi.endSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sessions });
      queryClient.invalidateQueries({ queryKey: QK.sessionCounts });
    },
  });
}

export function useStartInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      servicePointId,
      interaction,
    }: {
      servicePointId: number;
      interaction: Partial<ServicePointInteraction>;
    }) => channelApi.startInteraction(servicePointId, interaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePoints });
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
    },
  });
}

export function useEndInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      servicePointId,
      outcome,
      satisfactionScore,
    }: {
      servicePointId: number;
      outcome: string;
      satisfactionScore?: number;
    }) => channelApi.endInteraction(servicePointId, { outcome, satisfactionScore }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePoints });
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
    },
  });
}

export function useServicePointById(id: number) {
  return useQuery({
    queryKey: ['channels', 'service-point', id] as const,
    queryFn: () => channelApi.getServicePointById(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useUpdateServicePoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ServicePoint> }) =>
      channelApi.updateServicePoint(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePoints });
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
      queryClient.invalidateQueries({ queryKey: ['channels', 'service-point'] });
    },
  });
}

export function useDeleteServicePoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => channelApi.deleteServicePoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.servicePoints });
      queryClient.invalidateQueries({ queryKey: QK.servicePointStatus });
    },
  });
}
