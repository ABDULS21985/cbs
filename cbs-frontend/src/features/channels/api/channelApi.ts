import { apiGet, apiPost } from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type ChannelType = 'WEB' | 'MOBILE' | 'ATM' | 'BRANCH' | 'USSD' | 'IVR';

export interface ChannelSessionCounts {
  WEB: number;
  MOBILE: number;
  ATM: number;
  BRANCH: number;
  USSD: number;
  IVR: number;
}

export interface MaintenanceWindow {
  startTime: string;
  endTime: string;
  days: string[];
}

export interface ChannelConfig {
  id: number;
  channelType: ChannelType;
  maxSessions: number;
  timeout: number;
  enabled: boolean;
  maintenanceWindow?: MaintenanceWindow;
}

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface ChannelSession {
  id: string;
  customerId: number;
  channel: ChannelType;
  deviceId?: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
}

export type ServicePointType = 'BRANCH' | 'ATM' | 'KIOSK' | 'AGENT';
export type ServicePointStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface ServicePoint {
  id: number;
  name: string;
  type: ServicePointType;
  address: string;
  lat: number;
  lng: number;
  maxCapacity: number;
  currentLoad: number;
  status: ServicePointStatus;
  operationalStatus: string;
}

export interface ServicePointMetrics {
  servicePointId: number;
  name: string;
  avgWaitTime: number;
  transactionsToday: number;
  utilization: number;
  customerSatisfaction: number;
}

export type InteractionOutcome = 'SUCCESS' | 'FAILURE' | 'ESCALATED';

// ─── API Functions ────────────────────────────────────────────────────────────

export const channelApi = {
  // Session counts
  getActiveSessionCounts: () =>
    apiGet<ChannelSessionCounts>('/v1/channels/sessions/active-counts'),

  // Channel config
  getChannelConfigs: () =>
    apiGet<ChannelConfig[]>('/v1/channels/config'),

  saveChannelConfig: (config: Omit<ChannelConfig, 'id'> & { id?: number }) =>
    apiPost<ChannelConfig>('/v1/channels/config', config),

  // Sessions
  createSession: (payload: { customerId: number; channel: ChannelType; deviceId?: string }) =>
    apiPost<ChannelSession>('/v1/channels/sessions', payload),

  endSession: (sessionId: string) =>
    apiPost<void>(`/v1/channels/sessions/${sessionId}/end`),

  cleanupExpiredSessions: () =>
    apiPost<{ cleaned: number }>('/v1/channels/sessions/cleanup'),

  // Service points
  getServicePointStatus: () =>
    apiGet<ServicePoint[]>('/v1/service-points/status'),

  getServicePointMetrics: () =>
    apiGet<ServicePointMetrics[]>('/v1/service-points/metrics'),

  getAvailableServicePoints: (type?: ServicePointType) =>
    apiGet<ServicePoint[]>('/v1/service-points/available', type ? { type } : undefined),

  registerServicePoint: (payload: {
    name: string;
    type: ServicePointType;
    address: string;
    lat: number;
    lng: number;
    maxCapacity: number;
  }) => apiPost<ServicePoint>('/v1/service-points', payload),

  startInteraction: (servicePointId: number) =>
    apiPost<{ interactionId: string }>(`/v1/service-points/${servicePointId}/interaction/start`),

  endInteraction: (
    servicePointId: number,
    payload: { outcome: InteractionOutcome; satisfaction?: number },
  ) => apiPost<void>(`/v1/service-points/${servicePointId}/interaction/end`, payload),
};
