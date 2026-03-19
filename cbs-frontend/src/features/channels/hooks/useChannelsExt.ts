import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsApi } from '../api/channelExtApi';
import { channelActivityApi } from '../api/channelActivityApi';
import type { ChannelActivityLog } from '../types/channelActivity';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  sessions: {
    all: ['channels', 'sessions'] as const,
    list: (params?: Record<string, unknown>) =>
      ['channels', 'sessions', 'list', params] as const,
    cleanup: (params?: Record<string, unknown>) =>
      ['channels', 'sessions', 'cleanup', params] as const,
  },
  activity: {
    all: ['channels', 'activity'] as const,
    byCustomer: (id: number) => ['channels', 'activity', 'customer', id] as const,
  },
} as const;

// ─── Channel Sessions ────────────────────────────────────────────────────────

export function useChannelSessions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.sessions.list(params),
    queryFn: () => channelsApi.listSessions(params),
    staleTime: 15_000,
  });
}

export function useChannelCleanupInfo(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.sessions.cleanup(params),
    queryFn: () => channelsApi.getCleanupInfo(params),
    staleTime: 30_000,
  });
}

export function useTouchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => channelsApi.touch(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions.all });
    },
  });
}

// ─── Channel Activity ────────────────────────────────────────────────────────

export function useCustomerChannelActivity(id: number) {
  return useQuery({
    queryKey: KEYS.activity.byCustomer(id),
    queryFn: () => channelActivityApi.getCustomerActivity(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useLogChannelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChannelActivityLog>) => channelActivityApi.log(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activity.all });
    },
  });
}

export function useSummarizeChannelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => channelActivityApi.summarize(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activity.all });
    },
  });
}
