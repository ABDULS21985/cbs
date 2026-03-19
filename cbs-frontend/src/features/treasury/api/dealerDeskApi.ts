import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import type { DealingDesk, DeskDealer } from '../types/dealerDesk';

export const dealerDesksApi = {
  /** GET /v1/dealer-desks/{id} */
  getDeskDashboard: (id: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/dealer-desks/${id}`),

  /** POST /v1/dealer-desks/{id}/dealers */
  authorizeDealer: (id: number, data: Partial<DeskDealer>) =>
    apiPost<DeskDealer>(`/api/v1/dealer-desks/${id}/dealers`, data),

  /** DELETE /v1/dealer-desks/{id}/dealers/{dealerId} */
  revokeDealer: (id: number, dealerId: number) =>
    apiDelete<DeskDealer>(`/api/v1/dealer-desks/${id}/dealers/${dealerId}`),

  /** PUT /v1/dealer-desks/{id}/suspend */
  suspendDesk: (id: number) =>
    apiPut<DealingDesk>(`/api/v1/dealer-desks/${id}/suspend`),

};
