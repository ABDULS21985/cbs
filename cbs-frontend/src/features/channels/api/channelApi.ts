import { apiGet, apiPost } from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type ChannelType = 'WEB' | 'MOBILE' | 'ATM' | 'BRANCH' | 'USSD' | 'IVR';

// Matches com.cbs.channel.entity.ChannelConfig
export interface ChannelConfig {
  id: number;
  channel: string;
  displayName: string;
  isEnabled: boolean;
  featuresEnabled: string[];
  transactionTypes: string[];
  maxTransferAmount: number | null;
  dailyLimit: number | null;
  sessionTimeoutSecs: number;
  operatingHours: string;
  maintenanceWindow: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// Active session counts map: { WEB: 3, MOBILE: 10, ... }
export type ChannelSessionCounts = Record<string, number>;

// Matches com.cbs.channel.entity.ChannelSession
export interface ChannelSession {
  id: number;
  sessionId: string;
  customerId: number;
  channel: string;
  deviceId: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  geoLatitude: number;
  geoLongitude: number;
  startedAt: string;
  lastActivityAt: string;
  endedAt: string | null;
  timeoutSeconds: number;
  parentSessionId: string | null;
  handoffFromChannel: string | null;
  contextData: Record<string, unknown>;
  status: string;
  createdAt: string;
}

// Matches com.cbs.channel.entity.ServicePoint (actual backend fields)
export interface ServicePoint {
  id: number;
  servicePointCode: string;
  servicePointName: string;
  servicePointType: string;
  locationId: number | null;
  deviceId: string | null;
  supportedServices: Record<string, unknown> | null;
  operatingHours: Record<string, unknown> | null;
  isAccessible: boolean;
  staffRequired: boolean;
  assignedStaffId: string | null;
  maxConcurrentCustomers: number;
  avgServiceTimeMinutes: number | null;
  status: string;
}

// ServicePointStatus from backend returns Map<String, Long>
export interface ServicePointStatusMap {
  online: number;
  offline: number;
  maintenance: number;
}

// ServicePointMetrics returns Map<String, Object>
export interface ServicePointMetrics {
  servicePointCode: string;
  avgDurationSeconds: number;
  avgSatisfaction: number;
  utilizationPct: number;
  activeInteractions: number;
  totalInteractions: number;
}

export type ServicePointType = 'BRANCH' | 'ATM' | 'KIOSK' | 'AGENT';
export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'HANDED_OFF';

// ─── API Functions ────────────────────────────────────────────────────────────

export const channelApi = {
  // Session counts — GET /v1/channels/sessions/active-counts → Map<String, Long>
  getActiveSessionCounts: () =>
    apiGet<ChannelSessionCounts>('/api/v1/channels/sessions/active-counts'),

  // Sessions — GET /v1/channels/sessions
  listSessions: (params?: { page?: number; size?: number }) =>
    apiGet<ChannelSession[]>('/api/v1/channels/sessions', params as Record<string, unknown>),

  // Session touch — POST /v1/channels/sessions/{sessionId}/touch
  touchSession: (sessionId: string) =>
    apiPost<void>(`/api/v1/channels/sessions/${sessionId}/touch`),

  // Session end — POST /v1/channels/sessions/{sessionId}/end
  endSession: (sessionId: string) =>
    apiPost<void>(`/api/v1/channels/sessions/${sessionId}/end`),

  // Cleanup expired — POST /v1/channels/sessions/cleanup
  cleanupExpiredSessions: () =>
    apiPost<Record<string, number>>('/api/v1/channels/sessions/cleanup'),

  // Channel config — GET /v1/channels/config
  getChannelConfigs: () =>
    apiGet<ChannelConfig[]>('/api/v1/channels/config'),

  // Save channel config — POST /v1/channels/config (@RequestBody)
  saveChannelConfig: (config: Partial<ChannelConfig>) =>
    apiPost<ChannelConfig>('/api/v1/channels/config', config),

  // Service points — GET /v1/service-points
  getAllServicePoints: () =>
    apiGet<ServicePoint[]>('/api/v1/service-points'),

  // Register service point — POST /v1/service-points (@RequestBody)
  registerServicePoint: (payload: Omit<ServicePoint, 'id' | 'servicePointCode'>) =>
    apiPost<ServicePoint>('/api/v1/service-points', payload),

  // Service point status — GET /v1/service-points/status → Map<String, Long>
  getServicePointStatus: () =>
    apiGet<ServicePointStatusMap>('/api/v1/service-points/status'),

  // Service point metrics — GET /v1/service-points/metrics
  getServicePointMetrics: (servicePointId?: number) =>
    apiGet<ServicePointMetrics>(
      '/api/v1/service-points/metrics',
      servicePointId != null ? { servicePointId } : undefined,
    ),

  // Available service points — GET /v1/service-points/available
  getAvailableServicePoints: (type?: string) =>
    apiGet<ServicePoint[]>('/api/v1/service-points/available', type ? { type } : undefined),
};
