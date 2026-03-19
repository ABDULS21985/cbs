import { apiGet, apiPost } from '@/lib/api';

export interface GatewayStats {
  messagesToday: number;
  pending: number;
  failed: number;
  avgLatencyMs: number;
  uptimePct: number;
}

export interface ThroughputPoint {
  minute: string;
  inbound: number;
  outbound: number;
  errors: number;
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

export interface GatewayStatus {
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  todayMessages: number;
  errors: number;
  lastMessageAt: string;
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
    apiGet<GatewayStats>('/api/v1/gateway/stats'),

  getThroughput: (): Promise<ThroughputPoint[]> =>
    apiGet<ThroughputPoint[]>('/api/v1/gateway/throughput'),

  getMessages: (params: GetMessagesParams): Promise<GatewayMessage[]> =>
    apiGet<GatewayMessage[]>('/api/v1/gateway/messages', params as Record<string, unknown>),

  getMessage: (id: string): Promise<GatewayMessage> =>
    apiGet<GatewayMessage>(`/v1/gateway/messages/${id}`),

  retryMessage: (id: string): Promise<GatewayMessage> =>
    apiPost<GatewayMessage>(`/v1/gateway/messages/${id}/retry`),

  cancelMessage: (id: string): Promise<void> =>
    apiPost<void>(`/v1/gateway/messages/${id}/cancel`),

  manualOverride: (id: string, data: { action: string; notes: string }): Promise<void> =>
    apiPost<void>(`/v1/gateway/messages/${id}/override`, data),

  retryAllFailed: (): Promise<{ queued: number }> =>
    apiPost<{ queued: number }>('/api/v1/gateway/messages/retry-all-failed'),

  getGatewayStatus: (): Promise<GatewayStatus[]> =>
    apiGet<GatewayStatus[]>('/api/v1/gateway/status'),

  getSwiftMessages: (params: GetSwiftMessagesParams): Promise<SwiftMessage[]> =>
    apiGet<SwiftMessage[]>('/api/v1/gateway/swift', params as Record<string, unknown>),

  getSwiftMessage: (id: string): Promise<SwiftMessage> =>
    apiGet<SwiftMessage>(`/v1/gateway/swift/${id}`),
};
