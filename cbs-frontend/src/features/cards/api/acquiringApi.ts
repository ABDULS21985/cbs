import { apiGet, apiPost, apiPostParams, apiPut } from '@/lib/api';
import type { AcquiringFacility, MerchantSettlement, MerchantChargeback } from '../types/acquiring';

export const acquiringApi = {
  // ── Facilities ────────────────────────────────────────────────────────────
  getAllFacilities: () =>
    apiGet<AcquiringFacility[]>('/api/v1/acquiring/facilities'),

  setupFacility: (data: {
    merchantId: number;
    facilityType: string;
    processorConnection: string;
    terminalIdPrefix?: string;
    settlementCurrency?: string;
    settlementCycle?: string;
    mdrRatePct?: number;
    dailyTransactionLimit?: number;
    monthlyVolumeLimit?: number;
    chargebackLimitPct?: number;
    reserveHoldPct?: number;
  }) => apiPost<AcquiringFacility>('/api/v1/acquiring/facilities', data),

  activateFacility: (id: number) =>
    apiPut<AcquiringFacility>(`/api/v1/acquiring/facilities/${id}/activate`),

  getFacilitiesByMerchant: (merchantId: number) =>
    apiGet<AcquiringFacility[]>(`/api/v1/acquiring/facilities/merchant/${merchantId}`),

  // ── Settlements ───────────────────────────────────────────────────────────
  getAllSettlements: () =>
    apiGet<MerchantSettlement[]>('/api/v1/acquiring/settlements/process'),

  processSettlement: (merchantId: number, date: string) =>
    apiPostParams<MerchantSettlement>('/api/v1/acquiring/settlements/process', { merchantId, date }),

  getSettlementHistory: (merchantId: number) =>
    apiGet<MerchantSettlement[]>(`/api/v1/acquiring/settlements/merchant/${merchantId}`),

  // ── Chargebacks ───────────────────────────────────────────────────────────
  getAllChargebacks: () =>
    apiGet<MerchantChargeback[]>('/api/v1/acquiring/chargebacks'),

  recordChargeback: (data: {
    merchantId: number;
    originalTransactionRef?: string;
    transactionDate?: string;
    transactionAmount?: number;
    cardNetwork?: string;
    reasonCode?: string;
    reasonDescription?: string;
    chargebackAmount: number;
    currency?: string;
    evidenceDeadline?: string;
  }) => apiPost<MerchantChargeback>('/api/v1/acquiring/chargebacks', data),

  submitRepresentment: (chargebackId: number, data: {
    responseRef: string;
    evidence: Record<string, unknown>;
  }) => apiPost<MerchantChargeback>(`/api/v1/acquiring/chargebacks/${chargebackId}/representment`, data),

  // ── PCI Compliance ────────────────────────────────────────────────────────
  getPciComplianceReport: () =>
    apiGet<Record<string, AcquiringFacility[]>>('/api/v1/acquiring/compliance/pci'),
};
