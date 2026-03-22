import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  internetBankingApi,
  ussdApi,
  channelActivityExtApi,
  type UssdMenu,
  type ChannelActivityLog,
} from '../api/digitalBankingApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  ibFeatures: (sessionId: string) => ['ib', 'features', sessionId] as const,
  ibLoginInfo: ['ib', 'login-info'] as const,
  ibIdleStatus: ['ib', 'idle-status'] as const,

  ussdMenus: ['ussd', 'menus'] as const,

  activityLogs: ['channel-activity', 'logs'] as const,
  activityByCustomer: (id: number, channel?: string) =>
    ['channel-activity', 'customer', id, channel ?? 'all'] as const,
  activitySummaries: ['channel-activity', 'summaries'] as const,
} as const;

// ─── Internet Banking ─────────────────────────────────────────────────────────

export function useIbLoginInfo() {
  return useQuery({
    queryKey: KEYS.ibLoginInfo,
    queryFn: () => internetBankingApi.getLoginInfo(),
    staleTime: 300_000,
  });
}

export function useIbIdleStatus() {
  return useQuery({
    queryKey: KEYS.ibIdleStatus,
    queryFn: () => internetBankingApi.getExpireIdleStatus(),
    staleTime: 30_000,
  });
}

export function useIbFeatures(sessionId: string) {
  return useQuery({
    queryKey: KEYS.ibFeatures(sessionId),
    queryFn: () => internetBankingApi.getFeatures(sessionId),
    enabled: !!sessionId,
    staleTime: 60_000,
    gcTime: 120_000,
  });
}

export function useExpireIdleSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => internetBankingApi.expireIdleSessions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ibIdleStatus });
    },
  });
}

export function useIbLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { customerId: number; loginMethod: string; deviceFingerprint?: string; ipAddress?: string; userAgent?: string }) =>
      internetBankingApi.login(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ibIdleStatus });
    },
  });
}

export function useIbCompleteMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => internetBankingApi.completeMfa(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ib'] });
    },
  });
}

export function useIbTouch() {
  return useMutation({
    mutationFn: (sessionId: string) => internetBankingApi.touch(sessionId),
  });
}

export function useIbLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => internetBankingApi.logout(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ibIdleStatus });
    },
  });
}

export function useIbCanAccess() {
  return useMutation({
    mutationFn: ({ sessionId, featureCode }: { sessionId: string; featureCode: string }) =>
      internetBankingApi.canAccess(sessionId, featureCode),
  });
}

// ─── USSD ─────────────────────────────────────────────────────────────────────

export function useUssdMenus() {
  return useQuery({
    queryKey: KEYS.ussdMenus,
    queryFn: () => ussdApi.getAllMenus(),
    staleTime: 60_000,
    gcTime: 120_000,
  });
}

export function useCreateUssdMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      menu: Omit<UssdMenu, 'id' | 'createdAt' | 'version'> & {
        parentMenuCode?: string;
        shortcode?: string;
        serviceCode?: string;
      },
    ) => ussdApi.createMenu(menu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ussdMenus });
    },
  });
}

export function useUpdateUssdMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, menu }: { id: number; menu: Partial<UssdMenu> }) =>
      ussdApi.updateMenu(id, menu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ussdMenus });
    },
  });
}

export function useDeleteUssdMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ussdApi.deleteMenu(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ussdMenus });
    },
  });
}

// ─── Channel Activity ─────────────────────────────────────────────────────────

export function useChannelActivityLogs() {
  return useQuery({
    queryKey: KEYS.activityLogs,
    queryFn: () => channelActivityExtApi.listLogs(),
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

export function useCustomerChannelActivity(id: number, channel?: string) {
  return useQuery({
    queryKey: KEYS.activityByCustomer(id, channel),
    queryFn: () => channelActivityExtApi.getCustomerActivity(id, channel),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useChannelActivitySummaries() {
  return useQuery({
    queryKey: KEYS.activitySummaries,
    queryFn: () => channelActivityExtApi.getSummaries(),
    staleTime: 60_000,
  });
}

export function useLogChannelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: Partial<ChannelActivityLog>) =>
      channelActivityExtApi.logActivity(entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activityLogs });
    },
  });
}

export function useCreateActivitySummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      customerId: number;
      channel: string;
      periodType: string;
      periodDate: string;
    }) => channelActivityExtApi.createSummary(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activitySummaries });
    },
  });
}
