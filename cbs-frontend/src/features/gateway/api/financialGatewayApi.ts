import { apiGet, apiPost } from '@/lib/api';
import type { FinancialGateway, GatewayMessage } from '../types/financialGateway';

export const financialGatewayApi = {
  /** POST /v1/financial-gateway/messages */
  register: (data: Partial<FinancialGateway>) =>
    apiPost<FinancialGateway>('/api/v1/financial-gateway/messages', data),

  /** POST /v1/financial-gateway/messages/{ref}/ack */
  ack: (ref: string) =>
    apiPost<GatewayMessage>(`/api/v1/financial-gateway/messages/${ref}/ack`),

  /** POST /v1/financial-gateway/messages/{ref}/nack */
  ack2: (ref: string) =>
    apiPost<GatewayMessage>(`/api/v1/financial-gateway/messages/${ref}/nack`),

  /** GET /v1/financial-gateway/messages/queued/{gatewayId} */
  queued: (gatewayId: number) =>
    apiGet<GatewayMessage[]>(`/api/v1/financial-gateway/messages/queued/${gatewayId}`),

  /** GET /v1/financial-gateway/type/{type} */
  queued2: (type: string) =>
    apiGet<GatewayMessage[]>(`/api/v1/financial-gateway/type/${type}`),

};
