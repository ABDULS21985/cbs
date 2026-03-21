import { apiGet, apiPost } from '@/lib/api';

/** Matches GET /v1/gateway/stats — Map<String, Object> from GatewayDashboardController */
export interface GatewayStatsRaw {
  totalMessages: number;
  countByStatus: Record<string, number>;
  averageProcessingTimeMs: number;
}

/** Derived stats for UI display */
export interface GatewayStats {
  messagesToday: number;
  pending: number;
  failed: number;
  avgLatencyMs: number;
  acknowledged: number;
}

function mapStats(raw: GatewayStatsRaw): GatewayStats {
  const c = raw.countByStatus ?? {};
  return {
    messagesToday: raw.totalMessages ?? 0,
    pending: (c['QUEUED'] ?? 0) + (c['SENT'] ?? 0),
    failed: c['FAILED'] ?? 0,
    avgLatencyMs: Math.round(raw.averageProcessingTimeMs ?? 0),
    acknowledged: c['ACKNOWLEDGED'] ?? 0,
  };
}

/** Matches GET /v1/gateway/throughput — Map<String, Object> from GatewayDashboardController */
export interface ThroughputRaw {
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  avgPerHourLast24h: number;
  avgPerDayLast7d: number;
  hourlyBreakdown: Record<string, number>;
}

/** Derived chart point for hourly throughput */
export interface ThroughputPoint {
  hour: string;
  messages: number;
}

function mapThroughput(raw: ThroughputRaw): { points: ThroughputPoint[]; summary: ThroughputRaw } {
  const breakdown = raw.hourlyBreakdown ?? {};
  const points: ThroughputPoint[] = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    messages: breakdown[String(i)] ?? 0,
  }));
  return { points, summary: raw };
}

export interface GatewayMessage {
  id: string;
  reference: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: 'NIP' | 'SWIFT_MT103' | 'SWIFT_MT202' | 'ACH' | 'RTGS';
  counterparty: string;
  amount?: number;
  currency?: string;
  status: 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'SETTLED' | 'FAILED';
  sentAt: string;
  latencyMs?: number;
  attempts?: number;
  errorCode?: string;
  errorMessage?: string;
  lastAttempt?: string;
  payload?: string;
  response?: string;
  timingBreakdown?: { stage: string; durationMs: number }[];
}

/** Matches GET /v1/gateway/status — Map<String, Object> per gateway from GatewayDashboardController */
export interface GatewayStatusRaw {
  gatewayCode: string;
  gatewayName: string;
  gatewayType: string;
  protocol: string;
  connectionStatus: string;
  lastHeartbeatAt: string | null;
  isActive: boolean;
  messagesToday: number;
  valueToday: number;
}

/** Derived status for UI display */
export interface GatewayStatus {
  name: string;
  code: string;
  type: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  isActive: boolean;
  todayMessages: number;
  valueToday: number;
  lastHeartbeatAt: string | null;
}

function mapGatewayStatus(raw: GatewayStatusRaw): GatewayStatus {
  let status: GatewayStatus['status'] = 'OFFLINE';
  const cs = (raw.connectionStatus ?? '').toUpperCase();
  if (cs === 'CONNECTED' || cs === 'ONLINE' || cs === 'ACTIVE') status = 'ONLINE';
  else if (cs === 'DEGRADED' || cs === 'INTERMITTENT') status = 'DEGRADED';

  return {
    name: raw.gatewayName,
    code: raw.gatewayCode,
    type: raw.gatewayType,
    status,
    isActive: raw.isActive,
    todayMessages: raw.messagesToday ?? 0,
    valueToday: raw.valueToday ?? 0,
    lastHeartbeatAt: raw.lastHeartbeatAt,
  };
}

export interface SwiftMessage {
  id: string;
  reference: string;
  type: string;
  senderBic: string;
  receiverBic: string;
  amount: number;
  currency: string;
  status: string;
  sentAt: string;
  fields?: { tag: string; name: string; value: string }[];
}

export interface GetMessagesParams {
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface GetSwiftMessagesParams {
  reference?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

export const gatewayApi = {
  getLiveStats: (): Promise<GatewayStats> =>
    apiGet<GatewayStatsRaw>('/api/v1/gateway/stats').then(mapStats),

  getThroughput: (): Promise<{ points: ThroughputPoint[]; summary: ThroughputRaw }> =>
    apiGet<ThroughputRaw>('/api/v1/gateway/throughput').then(mapThroughput),

  getMessages: (params: GetMessagesParams): Promise<GatewayMessage[]> =>
    apiGet<GatewayMessage[]>('/api/v1/gateway/messages', params as Record<string, unknown>),

  getMessage: (id: string): Promise<GatewayMessage> =>
    apiGet<GatewayMessage>(`/api/v1/gateway/messages/${id}`),

  retryMessage: (id: string): Promise<GatewayMessage> =>
    apiPost<GatewayMessage>(`/api/v1/gateway/messages/${id}/retry`),

  cancelMessage: (id: string): Promise<void> =>
    apiPost<void>(`/api/v1/gateway/messages/${id}/cancel`),

  manualOverride: (id: string, data: { action: string; notes: string }): Promise<void> =>
    apiPost<void>(`/api/v1/gateway/messages/${id}/override`, data),

  retryAllFailed: (): Promise<{ queued: number }> =>
    apiPost<{ queued: number }>('/api/v1/gateway/messages/retry-all-failed'),

  getGatewayStatus: (): Promise<GatewayStatus[]> =>
    apiGet<GatewayStatusRaw[]>('/api/v1/gateway/status').then((list) => list.map(mapGatewayStatus)),

  getSwiftMessages: (params: GetSwiftMessagesParams): Promise<SwiftMessage[]> =>
    apiGet<SwiftMessage[]>('/api/v1/gateway/swift', params as Record<string, unknown>),

  getSwiftMessage: (id: string): Promise<SwiftMessage> =>
    apiGet<SwiftMessage>(`/api/v1/gateway/swift/${id}`),
};
