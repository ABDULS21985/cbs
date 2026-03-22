import { apiGet, apiPost, apiPostParams, apiPut, apiDelete } from '@/lib/api';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InternetBankingSession {
  id: number;
  sessionId: string;
  customerId: number;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: string;
  mfaCompleted: boolean;
  sessionStatus: string;
  lastActivityAt: string;
  idleTimeoutMin: number;
  absoluteTimeoutMin: number;
  loginAt: string;
  logoutAt: string | null;
  createdAt: string;
}

export interface InternetBankingFeature {
  id: number;
  featureCode: string;
  featureName: string;
  featureCategory: string;
  description: string;
  requiresMfa: boolean;
  requiresSca: boolean;
  dailyLimit: number | null;
  isEnabled: boolean;
  allowedSegments: string[];
  createdAt: string;
}

export interface UssdMenu {
  id: number;
  menuCode: string;
  parentMenuCode: string | null;
  displayOrder: number;
  title: string;
  shortcode: string | null;
  actionType: string;
  serviceCode: string | null;
  requiresPin: boolean;
  isActive: boolean;
  createdAt: string;
  version: number;
}

export interface ChannelActivityLog {
  id: number;
  logId: string;
  customerId: number;
  sessionId: string;
  channel: string;
  activityType: string;
  activityDetail: Record<string, unknown>;
  ipAddress: string;
  deviceFingerprint: string;
  geoLocation: string;
  responseTimeMs: number;
  resultStatus: string;
  errorCode: string;
  createdAt: string;
}

export interface ChannelActivitySummary {
  id: number;
  customerId: number;
  channel: string;
  periodType: string;
  periodDate: string;
  totalSessions: number;
  totalTransactions: number;
  totalAmount: number;
  avgResponseTimeMs: number;
  failureCount: number;
  uniqueActivities: number;
  mostUsedActivity: string;
}

// ─── Internet Banking API ──────────────────────────────────────────────────────

export const internetBankingApi = {
  getLoginInfo: () =>
    apiGet<{ status: string; methods: string }>('/api/v1/internet-banking/login'),

  // POST /v1/internet-banking/login with @RequestParam — send as query params
  login: (params: {
    customerId: number;
    loginMethod: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    api
      .post<ApiResponse<InternetBankingSession>>('/api/v1/internet-banking/login', undefined, { params })
      .then((r) => r.data.data),

  completeMfa: (sessionId: string) =>
    apiPost<InternetBankingSession>(`/api/v1/internet-banking/sessions/${sessionId}/mfa-complete`),

  touch: (sessionId: string) =>
    apiPost<InternetBankingSession>(`/api/v1/internet-banking/sessions/${sessionId}/touch`),

  logout: (sessionId: string) =>
    apiPost<void>(`/api/v1/internet-banking/sessions/${sessionId}/logout`),

  getFeatures: (sessionId: string) =>
    apiGet<InternetBankingFeature[]>(`/api/v1/internet-banking/sessions/${sessionId}/features`),

  canAccess: (sessionId: string, featureCode: string) =>
    apiGet<{ feature: string; granted: boolean }>(
      `/api/v1/internet-banking/sessions/${sessionId}/can-access/${featureCode}`,
    ),

  // GET /v1/internet-banking/sessions/expire-idle
  getExpireIdleStatus: () =>
    apiGet<{ expired: number }>('/api/v1/internet-banking/sessions/expire-idle'),

  expireIdleSessions: () =>
    apiPost<{ expired: number }>('/api/v1/internet-banking/sessions/expire-idle'),
};

// ─── USSD API ─────────────────────────────────────────────────────────────────

export const ussdApi = {
  getRootMenus: () =>
    apiGet<UssdMenu[]>('/api/v1/ussd/menus'),

  // POST /v1/ussd/menus — @RequestBody
  createMenu: (menu: {
    menuCode: string;
    parentMenuCode?: string;
    displayOrder: number;
    title: string;
    shortcode?: string;
    actionType: string;
    serviceCode?: string;
    requiresPin: boolean;
    isActive: boolean;
  }) => apiPost<UssdMenu>('/api/v1/ussd/menus', menu),

  // POST /v1/ussd/request — @RequestParam
  processRequest: (params: { msisdn: string; sessionId?: string; input?: string }) =>
    api
      .post<ApiResponse<{ sessionId: string; text: string; continueSession: boolean }>>(
        '/api/v1/ussd/request',
        undefined,
        { params },
      )
      .then((r) => r.data.data),

  // GET /v1/ussd/menus/all — get all menus (root + children)
  getAllMenus: () =>
    apiGet<UssdMenu[]>('/api/v1/ussd/menus/all'),

  // PUT /v1/ussd/menus/{id} — update menu (@RequestBody)
  updateMenu: (id: number, menu: Partial<UssdMenu>) =>
    apiPut<UssdMenu>(`/api/v1/ussd/menus/${id}`, menu),

  // DELETE /v1/ussd/menus/{id} — delete menu
  deleteMenu: (id: number) =>
    apiDelete<void>(`/api/v1/ussd/menus/${id}`),
};

// ─── Channel Activity API (extended) ─────────────────────────────────────────

export const channelActivityExtApi = {
  listLogs: () =>
    apiGet<ChannelActivityLog[]>('/api/v1/channel-activity/log'),

  logActivity: (entry: Partial<ChannelActivityLog>) =>
    apiPost<ChannelActivityLog>('/api/v1/channel-activity/log', entry),

  // GET /v1/channel-activity/customer/{id} with optional @RequestParam channel
  getCustomerActivity: (id: number, channel?: string) =>
    apiGet<ChannelActivityLog[]>(
      `/api/v1/channel-activity/customer/${id}`,
      channel ? { channel } : undefined,
    ),

  getSummaries: () =>
    apiGet<ChannelActivitySummary[]>('/api/v1/channel-activity/summarize'),

  // POST /v1/channel-activity/summarize with @RequestParam
  createSummary: (params: {
    customerId: number;
    channel: string;
    periodType: string;
    periodDate: string;
  }) =>
    apiPostParams<ChannelActivitySummary>(
      '/api/v1/channel-activity/summarize',
      params as Record<string, unknown>,
    ),
};
