import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { RemittanceBeneficiary, RemittanceCorridor, RemittanceTransaction } from '../types/remittance';

export const remittancesApi = {
  /** POST /v1/remittances/corridors */
  createCorridor: (data: Partial<RemittanceCorridor>) =>
    apiPost<RemittanceCorridor>('/api/v1/remittances/corridors', data),

  /** GET /v1/remittances/corridors */
  getAllCorridors: (params?: Record<string, unknown>) =>
    apiGet<RemittanceCorridor[]>('/api/v1/remittances/corridors', params),

  /** POST /v1/remittances/beneficiaries */
  addBeneficiary: (data: Partial<RemittanceBeneficiary>) =>
    apiPost<RemittanceBeneficiary>('/api/v1/remittances/beneficiaries', data),

  /** GET /v1/remittances/beneficiaries/customer/{customerId} */
  getBeneficiaries: (customerId: number) =>
    apiGet<RemittanceBeneficiary[]>(`/api/v1/remittances/beneficiaries/customer/${customerId}`),

  /** PATCH /v1/remittances/{ref}/status */
  updateStatus: (ref: string) =>
    apiPatch<RemittanceTransaction>(`/api/v1/remittances/${ref}/status`),

  /** GET /v1/remittances/customer/{customerId} */
  getHistory: (customerId: number) =>
    apiGet<RemittanceTransaction[]>(`/api/v1/remittances/customer/${customerId}`),

};
