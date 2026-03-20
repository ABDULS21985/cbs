import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { Card, CardTransaction, Merchant, PosTerminal } from '../types/card';

export interface IssueCardInput {
  customerId: number;
  cardType: Card['cardType'];
  scheme: Card['scheme'];
  accountId: number;
  cardholderName: string;
  deliveryMethod: string;
  branchCode?: string;
  cardTier?: string;
}

export const cardApi = {
  getCards: (filters?: Record<string, unknown>) => apiGet<Card[]>('/api/v1/cards', filters),
  getCard: (id: number) => apiGet<Card>(`/api/v1/cards/${id}`),
  getCustomerCards: (customerId: number) => apiGet<Card[]>(`/api/v1/cards/customer/${customerId}`),
  blockCard: (id: number, reason: string) => apiPost<Card>(`/api/v1/cards/${id}/block`, { reason }),
  activateCard: (id: number) => apiPost<Card>(`/api/v1/cards/${id}/activate`),
  hotlistCard: (id: number, reason: string) => apiPost<Card>(`/api/v1/cards/${id}/hotlist`, { reason }),
  updateControls: (id: number, controls: Partial<Card['controls']>) => apiPatch<Card>(`/api/v1/cards/${id}/controls`, controls),
  getCardTransactions: (cardId: number) => apiGet<CardTransaction[]>(`/api/v1/cards/${cardId}/transactions`),
  issueCard: (data: IssueCardInput) => apiPost<Card>('/api/v1/cards', data),
  requestCard: (data: Record<string, unknown>) => apiPost<Card>('/api/v1/cards/request', data),

  getTransactions: (filters?: Record<string, unknown>) => apiGet<CardTransaction[]>('/api/v1/card-switch', filters),

  getMerchants: (filters?: Record<string, unknown>) => apiGet<Merchant[]>('/api/v1/merchants', filters),
  getMerchant: (id: number) => apiGet<Merchant>(`/api/v1/merchants/${id}`),
  onboardMerchant: (data: {
    merchantName: string;
    mcc: string;
    mccDescription?: string;
    mdrRate: number;
    riskCategory?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    bankAccountNumber?: string;
    settlementFrequency?: string;
  }) => apiPost<Merchant>('/api/v1/merchants', data),

  getTerminals: () => apiGet<PosTerminal[]>('/api/v1/pos-terminals'),
};
