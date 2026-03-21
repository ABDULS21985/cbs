import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsExtApi } from '../api/channelExtApi';
import { channelActivityExtApi } from '../api/digitalBankingApi';
import type { ChannelActivityLog } from '../api/digitalBankingApi';

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
    queryFn: () => channelsExtApi.listSessions(params),
    staleTime: 15_000,
    gcTime: 30_000,
  });
}

export function useChannelCleanupInfo(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.sessions.cleanup(params),
    queryFn: () => channelsExtApi.getCleanupInfo(params),
    staleTime: 30_000,
  });
}

export function useTouchSession() {
  const qc = useQueryClient();
  return useMutation({
    // Backend: POST /v1/channels/sessions/{sessionId}/touch — sessionId is a String
    mutationFn: (sessionId: string) => channelsExtApi.touch(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions.all });
    },
  });
}

// ─── Channel Activity ────────────────────────────────────────────────────────

export function useCustomerChannelActivity(id: number) {
  return useQuery({
    queryKey: KEYS.activity.byCustomer(id),
    queryFn: () => channelActivityExtApi.getCustomerActivity(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useLogChannelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChannelActivityLog>) => channelActivityExtApi.logActivity(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activity.all });
    },
  });
}

export function useSummarizeChannelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      customerId: number;
      channel: string;
      periodType: string;
      periodDate: string;
    }) => channelActivityExtApi.createSummary(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activity.all });
    },
  });
}
