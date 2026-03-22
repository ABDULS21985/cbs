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

  /** POST /v1/cards/{id}/hotlist — backend uses @RequestBody with default "Hotlisted" */
  hotlist: (id: number, reason = 'Hotlisted') =>
    apiPost<Card>(`/api/v1/cards/${id}/hotlist`, { reason }),

  /** POST /v1/cards/transactions/{txnId}/dispute */
  dispute: (txnId: number, reason: string) =>
    apiPost<CardTransaction>(`/api/v1/cards/transactions/${txnId}/dispute?reason=${encodeURIComponent(reason)}`),

  /** POST /v1/cards/disputes — initiate dispute with full params */
  initiateDispute: (params: {
    cardId: number; customerId: number; accountId: number;
    transactionId?: number; transactionRef?: string;
    transactionDate: string; transactionAmount: number; transactionCurrency: string;
    merchantName?: string; merchantId?: string;
    disputeType: string; disputeReason: string; disputeAmount: number;
    cardScheme: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, String(v)); });
    return apiPost<CardDispute>(`/api/v1/cards/disputes?${qs}`);
  },

  /** POST /v1/cards/disputes/{id}/provisional-credit */
  provisionalCredit: (id: number) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/provisional-credit`),

  /** POST /v1/cards/disputes/{id}/chargeback */
  fileChargeback: (id: number, schemeCaseId: string, schemeReasonCode: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/chargeback?schemeCaseId=${encodeURIComponent(schemeCaseId)}&schemeReasonCode=${encodeURIComponent(schemeReasonCode)}`),

  /** POST /v1/cards/disputes/{id}/representment */
  submitRepresentment: (id: number, merchantResponse: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/representment?merchantResponse=${encodeURIComponent(merchantResponse)}`),

  /** POST /v1/cards/disputes/{id}/arbitration — preArbitration defaults to true on backend */
  escalateToArbitration: (id: number, preArbitration: boolean, notes?: string) => {
    const qs = new URLSearchParams({ preArbitration: String(preArbitration) });
    if (notes) qs.set('notes', notes);
    return apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/arbitration?${qs}`);
  },

  /** POST /v1/cards/disputes/{id}/resolve */
  resolveDispute: (id: number, resolutionType: string, resolutionAmount: number, notes?: string) =>
    apiPost<CardDispute>(`/api/v1/cards/disputes/${id}/resolve?resolutionType=${encodeURIComponent(resolutionType)}&resolutionAmount=${resolutionAmount}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),

  /** GET /v1/cards/tokens/card/{cardId} */
  getCardTokens: (cardId: number) =>
    apiGet<CardToken[]>(`/api/v1/cards/tokens/card/${cardId}`),

  /** GET /v1/cards/tokens/customer/{customerId} */
  getCustomerTokens: (customerId: number) =>
    apiGet<CardToken[]>(`/api/v1/cards/tokens/customer/${customerId}`),

  /** POST /v1/cards/tokens/{tokenId}/suspend — reason is @RequestParam (required) */
  suspend: (tokenId: number, reason: string) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/suspend?reason=${encodeURIComponent(reason)}`),

  /** POST /v1/cards/tokens/{tokenId}/resume */
  resume: (tokenId: number) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/resume`),

  /** POST /v1/cards/tokens/{tokenId}/deactivate — reason is @RequestParam (required) */
  deactivate: (tokenId: number, reason: string) =>
    apiPost<CardToken>(`/api/v1/cards/tokens/${tokenId}/deactivate?reason=${encodeURIComponent(reason)}`),

  /**
   * POST /v1/cards/tokens/provision/{cardId}
   * Backend uses @RequestParam (not @RequestBody) — must be sent as query params.
   * walletProvider is a required enum; deviceName/deviceId/deviceType are optional.
   */
  provisionToken: (cardId: number, data: { walletProvider: string; deviceName?: string; deviceId?: string; deviceType?: string; tokenRequestorId?: string }) => {
    const qs = new URLSearchParams({ walletProvider: data.walletProvider });
    if (data.deviceName) qs.set('deviceName', data.deviceName);
    if (data.deviceId) qs.set('deviceId', data.deviceId);
    if (data.deviceType) qs.set('deviceType', data.deviceType);
    if (data.tokenRequestorId) qs.set('tokenRequestorId', data.tokenRequestorId);
    return apiPost<CardToken>(`/api/v1/cards/tokens/provision/${cardId}?${qs}`);
  },

  /** POST /v1/cards/tokens/deactivate-all/{cardId} — reason is @RequestParam (required) */
  deactivateAllTokens: (cardId: number, reason: string) =>
    apiPost<void>(`/api/v1/cards/tokens/deactivate-all/${cardId}?reason=${encodeURIComponent(reason)}`),
};
