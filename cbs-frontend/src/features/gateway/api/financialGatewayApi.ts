import { apiGet, apiPost } from '@/lib/api';
import type { FinancialGateway, GatewayMessage } from '../types/financialGateway';

export const financialGatewayApi = {
  /** POST /v1/financial-gateway — register a new financial gateway */
  register: (data: Partial<FinancialGateway>) =>
    apiPost<FinancialGateway>('/api/v1/financial-gateway', data),

  /** GET /v1/financial-gateway/messages — list all gateway messages */
  listMessages: () =>
    apiGet<GatewayMessage[]>('/api/v1/financial-gateway/messages'),

  /** POST /v1/financial-gateway/messages — send a gateway message */
  sendMessage: (data: Partial<GatewayMessage>) =>
    apiPost<GatewayMessage>('/api/v1/financial-gateway/messages', data),

  /** POST /v1/financial-gateway/messages/{ref}/ack — requires ackReference @RequestParam */
  ack: (ref: string, ackReference: string) =>
    apiPost<GatewayMessage>(`/api/v1/financial-gateway/messages/${ref}/ack?ackReference=${encodeURIComponent(ackReference)}`),

  /** POST /v1/financial-gateway/messages/{ref}/nack — requires reason @RequestParam */
  nack: (ref: string, reason: string) =>
    apiPost<GatewayMessage>(`/api/v1/financial-gateway/messages/${ref}/nack?reason=${encodeURIComponent(reason)}`),

  /** GET /v1/financial-gateway/messages/queued/{gatewayId} */
  getQueuedMessages: (gatewayId: number) =>
    apiGet<GatewayMessage[]>(`/api/v1/financial-gateway/messages/queued/${gatewayId}`),

  /** Alias for getQueuedMessages */
  queued: (gatewayId: number) =>
    apiGet<GatewayMessage[]>(`/api/v1/financial-gateway/messages/queued/${gatewayId}`),

  /** GET /v1/financial-gateway/type/{type} — list gateways by type */
  getByType: (type: string) =>
    apiGet<FinancialGateway[]>(`/api/v1/financial-gateway/type/${type}`),
};
