import { apiGet, apiPost, apiPostParams, apiPatchParams } from '@/lib/api';
import type { RemittanceBeneficiary, RemittanceCorridor, RemittanceTransaction } from '../types/remittance';

export interface RemittanceQuote {
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  fxRate: number;
  fxMarkup: number;
  flatFee: number;
  percentageFee: number;
  totalFee: number;
  totalDebitAmount: number;
  corridorCode: string;
  settlementDays: number;
}

export const remittancesApi = {
  /** POST /v1/remittances/corridors — ADMIN only */
  createCorridor: (data: Partial<RemittanceCorridor>) =>
    apiPost<RemittanceCorridor>('/api/v1/remittances/corridors', data),

  /** GET /v1/remittances/corridors */
  getAllCorridors: (params?: Record<string, unknown>) =>
    apiGet<RemittanceCorridor[]>('/api/v1/remittances/corridors', params),

  /** GET /v1/remittances/beneficiaries — all beneficiaries */
  getAllBeneficiaries: () =>
    apiGet<RemittanceBeneficiary[]>('/api/v1/remittances/beneficiaries'),

  /** POST /v1/remittances/beneficiaries */
  addBeneficiary: (data: Partial<RemittanceBeneficiary>) =>
    apiPost<RemittanceBeneficiary>('/api/v1/remittances/beneficiaries', data),

  /** GET /v1/remittances/beneficiaries/customer/{customerId} */
  getBeneficiaries: (customerId: number) =>
    apiGet<RemittanceBeneficiary[]>(`/api/v1/remittances/beneficiaries/customer/${customerId}`),

  /** GET /v1/remittances/quote — get remittance quote */
  getQuote: (params: { sourceCountry: string; destinationCountry: string; amount: number }) =>
    apiGet<RemittanceQuote>('/api/v1/remittances/quote', params),

  /** POST /v1/remittances/send — backend uses @RequestParam */
  send: (params: Record<string, unknown>) =>
    apiPostParams<RemittanceTransaction>('/api/v1/remittances/send', params),

  /** PATCH /v1/remittances/{ref}/status — backend uses @RequestParam */
  updateStatus: (ref: string, params?: { status: string; message?: string }) =>
    apiPatchParams<RemittanceTransaction>(`/api/v1/remittances/${ref}/status`, params ?? {}),

  /** GET /v1/remittances/customer/{customerId} */
  getHistory: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<RemittanceTransaction[]>(`/api/v1/remittances/customer/${customerId}`, params),
};
