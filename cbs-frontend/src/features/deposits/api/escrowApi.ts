import { apiGet, apiPost } from '@/lib/api';
import type { EscrowMandate, EscrowRelease, CreateEscrowRequest } from '../types/escrow';

export const escrowApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<EscrowMandate[]>('/api/v1/escrow', params),

  getById: (id: number) =>
    apiGet<EscrowMandate>(`/api/v1/escrow/${id}`),

  getByCustomer: (customerId: number, page = 0, size = 20) =>
    apiGet<EscrowMandate[]>(`/api/v1/escrow/customer/${customerId}`, { page, size }),

  create: (data: CreateEscrowRequest) =>
    apiPost<EscrowMandate>('/api/v1/escrow', data),

  requestRelease: (mandateId: number, amount: number, reason: string, releaseToAccountId?: number) => {
    const params = new URLSearchParams({ amount: String(amount), reason });
    if (releaseToAccountId) params.set('releaseToAccountId', String(releaseToAccountId));
    return apiPost<EscrowRelease>(`/api/v1/escrow/${mandateId}/release?${params.toString()}`);
  },

  approveRelease: (releaseId: number) =>
    apiPost<EscrowRelease>(`/api/v1/escrow/releases/${releaseId}/approve`),
};
