import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { Card, CardTransaction, Merchant } from '../types/card';
import type { PosTerminal } from '../types/posTerminal';

export interface IssueCardInput {
  customerId?: number;
  accountId: number;
  cardType: Card['cardType'];
  cardScheme: Card['cardScheme'];
  cardholderName: string;
  cardTier?: string;
  deliveryMethod?: string;
  branchCode?: string;
  expiryDate?: string;
  dailyPosLimit?: number;
  dailyAtmLimit?: number;
  dailyOnlineLimit?: number;
  singleTxnLimit?: number;
  creditLimit?: number;
}

export const cardApi = {
  getCards: (filters?: Record<string, unknown>) => apiGet<Card[]>('/api/v1/cards', filters),
  getCard: (id: number) => apiGet<Card>(`/api/v1/cards/${id}`),
  getCustomerCards: (customerId: number) => apiGet<Card[]>(`/api/v1/cards/customer/${customerId}`),
  blockCard: (id: number, reason: string) => apiPost<Card>(`/api/v1/cards/${id}/block`, { reason }),
  activateCard: (id: number) => apiPost<Card>(`/api/v1/cards/${id}/activate`),
  hotlistCard: (id: number, reason: string) => apiPost<Card>(`/api/v1/cards/${id}/hotlist`, { reason }),
  updateControls: (id: number, controls: Partial<import('../types/card').CardControls>) =>
    apiPatch<Card>(`/api/v1/cards/${id}/controls`, controls),
  getCardTransactions: (cardId: number) => apiGet<CardTransaction[]>(`/api/v1/cards/${cardId}/transactions`),
  issueCard: (data: IssueCardInput) => apiPost<Card>('/api/v1/cards', data),
  requestCard: (data: Record<string, unknown>) => apiPost<Card>('/api/v1/cards/request', data),

  getTransactions: (filters?: Record<string, unknown>) => apiGet<CardTransaction[]>('/api/v1/card-switch', filters),

  getMerchants: (filters?: Record<string, unknown>) => apiGet<Merchant[]>('/api/v1/merchants', filters),
  getMerchant: (merchantId: string) => apiGet<Merchant>(`/api/v1/merchants/${merchantId}`),
  onboardMerchant: (data: {
    merchantName: string;
    merchantCategoryCode: string;
    businessType: string;
    registrationNumber?: string;
    tradingName?: string;
    taxId?: string;
    mdrRate: number;
    riskCategory: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    settlementAccountId?: number;
    settlementFrequency?: string;
    monthlyVolumeLimit?: number;
  }) => apiPost<Merchant>('/api/v1/merchants', data),

  suspendMerchant: (merchantId: string, reason: string) =>
    apiPost<Merchant>(`/api/v1/merchants/${merchantId}/suspend`, { reason }),
  activateMerchant: (merchantId: string) =>
    apiPost<Merchant>(`/api/v1/merchants/${merchantId}/activate`),

  getTerminals: () => apiGet<PosTerminal[]>('/api/v1/pos-terminals'),
};
