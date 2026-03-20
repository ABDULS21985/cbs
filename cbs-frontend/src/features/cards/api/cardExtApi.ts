import { apiGet, apiPost } from '@/lib/api';
import type { CardDispute, CardToken } from '../types/cardExt';
import type { Card, CardTransaction } from '../types/card';

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
    apiGet<Record<string, unknown>>('/api/v1/cards/disputes/dashboard', params),

  /** POST /v1/cards/{id}/hotlist */
  hotlist: (id: number) =>
    apiPost<Card>(`/api/v1/cards/${id}/hotlist`),

  /** POST /v1/cards/transactions/{txnId}/dispute */
  dispute: (txnId: number) =>
    apiPost<CardTransaction>(`/api/v1/cards/transactions/${txnId}/dispute`),

  /** POST /v1/cards/disputes — initiate dispute with full params */
  initiateDispute: (params: {
    cardId: number; customerId: number; accountId: number;
    transactionId?: number; transactionRef?: string;
    transactionDate: string; transactionAmount: number; transactionCurrency: string;
    merchantName?: string; merchantId?: string;
    disputeType: string; disputeReason: string; disputeAmount: number;
    cardScheme: string; createdBy: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, String(v)); });
    return apiPost<CardDispute>(`/api/v1/cards/disputes?${qs}`);
  },

  /** POST /v1/cards/disputes/{id}/provisional-credit */
  provisionalCredit: (id: number, performedBy: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/provisional-credit?performedBy=${encodeURIComponent(performedBy)}`),

  /** POST /v1/cards/disputes/{id}/chargeback */
  fileChargeback: (id: number, schemeCaseId: string, schemeReasonCode: string, performedBy: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/chargeback?schemeCaseId=${encodeURIComponent(schemeCaseId)}&schemeReasonCode=${encodeURIComponent(schemeReasonCode)}&performedBy=${encodeURIComponent(performedBy)}`),

  /** POST /v1/cards/disputes/{id}/representment */
  submitRepresentment: (id: number, merchantResponse: string, performedBy: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/representment?merchantResponse=${encodeURIComponent(merchantResponse)}&performedBy=${encodeURIComponent(performedBy)}`),

  /** POST /v1/cards/disputes/{id}/arbitration */
  escalateToArbitration: (id: number, performedBy: string, notes?: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/arbitration?performedBy=${encodeURIComponent(performedBy)}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),

  /** POST /v1/cards/disputes/{id}/resolve */
  resolveDispute: (id: number, resolutionType: string, resolutionAmount: number, performedBy: string, notes?: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/resolve?resolutionType=${encodeURIComponent(resolutionType)}&resolutionAmount=${resolutionAmount}&performedBy=${encodeURIComponent(performedBy)}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),

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
