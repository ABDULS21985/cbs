import { apiGet, apiPost } from '@/lib/api';
import type { Card, CardDispute, CardToken, CardTransaction } from '../types/cardExt';

export const cardsApi = {
  /** GET /v1/cards/disputes/{id} */
  get: (id: number) =>
    apiGet<CardDispute>(`/api/v1/cards/disputes/${id}`),

  /** GET /v1/cards/disputes/customer/{customerId} */
  getCustomerDisputes: (customerId: number) =>
    apiGet<CardDispute[]>(`/api/v1/cards/disputes/customer/${customerId}`),

  /** GET /v1/cards/disputes/status/{status} */
  getByStatus: (status: string) =>
    apiGet<CardDispute[]>(`/api/v1/cards/disputes/status/${status}`),

  /** POST /v1/cards/disputes/sla-check */
  slaCheck: () =>
    apiPost<Record<string, unknown>>('/api/v1/cards/disputes/sla-check'),

  /** GET /v1/cards/disputes/dashboard */
  dashboard: (params?: Record<string, unknown>) =>
    apiGet<CardDisputeService.DisputeDashboard>('/api/v1/cards/disputes/dashboard', params),

  /** POST /v1/cards/{id}/hotlist */
  hotlist: (id: number) =>
    apiPost<Card>(`/api/v1/cards/${id}/hotlist`),

  /** POST /v1/cards/transactions/{txnId}/dispute */
  dispute: (txnId: number) =>
    apiPost<CardTransaction>(`/api/v1/cards/transactions/${txnId}/dispute`),

  /** GET /v1/cards/tokens/card/{cardId} */
  getCardTokens: (cardId: number) =>
    apiGet<CardToken[]>(`/api/v1/cards/tokens/card/${cardId}`),

  /** GET /v1/cards/tokens/customer/{customerId} */
  getCustomerTokens: (customerId: number) =>
    apiGet<CardToken[]>(`/api/v1/cards/tokens/customer/${customerId}`),

  /** POST /v1/cards/tokens/{tokenId}/suspend */
  suspend: (tokenId: number) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/suspend`),

  /** POST /v1/cards/tokens/{tokenId}/resume */
  resume: (tokenId: number) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/resume`),

  /** POST /v1/cards/tokens/{tokenId}/deactivate */
  deactivate: (tokenId: number) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/deactivate`),

};
