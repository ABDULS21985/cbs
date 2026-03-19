import { apiGet, apiPost } from '@/lib/api';
import type { Card, CardTransaction, Merchant, PosTerminal } from '../types/card';

export const cardApi = {
  getCards: (filters?: Record<string, unknown>) => apiGet<Card[]>('/api/v1/cards', filters),
  getCard: (id: number) => apiGet<Card>(`/api/v1/cards/${id}`),
  blockCard: (id: number, reason: string) => apiPost<void>(`/api/v1/cards/${id}/block`, { reason }),
  activateCard: (id: number) => apiPost<void>(`/api/v1/cards/${id}/activate`),
  updateControls: (id: number, controls: Partial<Card['controls']>) => apiPost<void>(`/api/v1/cards/${id}/controls`, controls),
  requestCard: (data: Record<string, unknown>) => apiPost<Card>('/api/v1/cards/request', data),

  getTransactions: (filters?: Record<string, unknown>) => apiGet<CardTransaction[]>('/api/v1/card-switch', filters),

  getMerchants: (filters?: Record<string, unknown>) => apiGet<Merchant[]>('/api/v1/merchants', filters),
  getMerchant: (id: number) => apiGet<Merchant>(`/api/v1/merchants/${id}`),
  onboardMerchant: (data: Record<string, unknown>) => apiPost<Merchant>('/api/v1/merchants', data),

  getTerminals: () => apiGet<PosTerminal[]>('/api/v1/pos-terminals'),
};
