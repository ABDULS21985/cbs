import { apiGet, apiPost, apiPut } from '@/lib/api';
import type {
  CustomerAgreement,
  CreateCustomerAgreementPayload,
  TdFrameworkAgreement,
  CreateTdFrameworkPayload,
  TdFrameworkSummary,
  RateCheckResult,
  CommissionAgreement,
  CreateCommissionAgreementPayload,
  CommissionPayout,
  DiscountScheme,
  CreateDiscountSchemePayload,
  SpecialPricingAgreement,
  CreateSpecialPricingPayload,
  AgreementTemplate,
} from '../types/agreementExt';

// ── Legacy types re-exported for existing components ─────────────────────────

export interface Agreement {
  id: number;
  customerId: number;
  customerName: string;
  agreementCode: string;
  agreementType: 'TERMS_AND_CONDITIONS' | 'PRODUCT_AGREEMENT' | 'STANDING_MANDATE' | 'DIRECT_DEBIT_MANDATE' | 'NDA' | 'GENERAL';
  productCode?: string;
  productName?: string;
  templateId?: number;
  title: string;
  content: string;
  version: number;
  signedAt?: string;
  signatureData?: string;
  signatureType?: 'CANVAS' | 'TYPED';
  effectiveDate?: string;
  expiryDate?: string;
  linkedAccountId?: number;
  mandateAmountLimit?: number;
  mandateFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUPERSEDED';
  amendments?: Amendment[];
  createdAt: string;
  updatedAt: string;
}

export interface Amendment {
  id: number;
  description: string;
  changedBy: string;
  changedAt: string;
  previousVersion: number;
  newVersion: number;
}

// ── Customer Agreements (5 endpoints) ────────────────────────────────────────

export function getAgreements() {
  return apiGet<CustomerAgreement[]>('/api/v1/agreements');
}

export function createAgreement(data: CreateCustomerAgreementPayload) {
  return apiPost<CustomerAgreement>('/api/v1/agreements', data);
}

export function activateAgreement(agreementNumber: string) {
  return apiPost<CustomerAgreement>(`/api/v1/agreements/${agreementNumber}/activate`);
}

export function terminateAgreement(agreementNumber: string, reason?: string) {
  const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return apiPost<CustomerAgreement>(`/api/v1/agreements/${agreementNumber}/terminate${qs}`);
}

export function getCustomerAgreements(customerId: number) {
  return apiGet<CustomerAgreement[]>(`/api/v1/agreements/customer/${customerId}`);
}

// ── TD Framework (6 endpoints) ───────────────────────────────────────────────

export function getTdFrameworks() {
  return apiGet<TdFrameworkAgreement[]>('/api/v1/td-frameworks');
}

export function getTdFramework(agreementNumber: string) {
  return apiGet<TdFrameworkAgreement>(`/api/v1/td-frameworks/${agreementNumber}`);
}

export function createTdFramework(data: CreateTdFrameworkPayload) {
  return apiPost<TdFrameworkAgreement>('/api/v1/td-frameworks', data);
}

export function approveTdFramework(agreementNumber: string, approvedBy: string) {
  return apiPost<TdFrameworkAgreement>(
    `/api/v1/td-frameworks/${agreementNumber}/approve?approvedBy=${encodeURIComponent(approvedBy)}`,
  );
}

export function getTdFrameworkRate(
  agreementNumber: string,
  params: { amount: number; tenorDays: number },
) {
  return apiGet<RateCheckResult>(
    `/api/v1/td-frameworks/${agreementNumber}/rate?amount=${params.amount}&tenorDays=${params.tenorDays}`,
  );
}

export function getCustomerTdFrameworks(customerId: number) {
  return apiGet<TdFrameworkAgreement[]>(`/api/v1/td-frameworks/customer/${customerId}`);
}

// ── TD Framework Summary (5 endpoints) ───────────────────────────────────────

export function createTdSummary(data: Partial<TdFrameworkSummary>) {
  return apiPost<TdFrameworkSummary>('/api/v1/td-framework-summary', data);
}

export function getMaturityLadder(agreementId: number) {
  return apiGet<Record<string, number>>(
    `/api/v1/td-framework-summary/${agreementId}/maturity-ladder`,
  );
}

export function getRolloverForecast(agreementId: number) {
  return apiGet<{ totalPrincipal: number; expectedRolloverPct: number; expectedRolloverAmount: number }>(
    `/api/v1/td-framework-summary/${agreementId}/rollover-forecast`,
  );
}

export function getLargeDeposits(threshold?: number) {
  const qs = threshold != null ? `?threshold=${threshold}` : '';
  return apiGet<TdFrameworkSummary[]>(
    `/api/v1/td-framework-summary/large-deposits${qs}`,
  );
}

export function getTdSummaryHistory(agreementId: number) {
  return apiGet<TdFrameworkSummary[]>(
    `/api/v1/td-framework-summary/${agreementId}/history`,
  );
}

// ── Commissions (7 endpoints) ────────────────────────────────────────────────

export function getCommissionAgreements() {
  return apiGet<CommissionAgreement[]>('/api/v1/commissions/agreements');
}

export function createCommissionAgreement(data: CreateCommissionAgreementPayload) {
  return apiPost<CommissionAgreement>('/api/v1/commissions/agreements', data);
}

export function activateCommissionAgreement(code: string) {
  return apiPost<CommissionAgreement>(
    `/api/v1/commissions/agreements/${code}/activate`,
  );
}

export function calculatePayout(
  code: string,
  params: { grossSales: number; qualifyingSales: number; period: string },
) {
  return apiPost<CommissionPayout>(
    `/api/v1/commissions/agreements/${code}/calculate-payout?grossSales=${params.grossSales}&qualifyingSales=${params.qualifyingSales}&period=${encodeURIComponent(params.period)}`,
  );
}

export function approvePayout(payoutCode: string) {
  return apiPost<CommissionPayout>(
    `/api/v1/commissions/payouts/${payoutCode}/approve`,
  );
}

export function getPartyCommissionAgreements(partyId: string) {
  return apiGet<CommissionAgreement[]>(
    `/api/v1/commissions/agreements/party/${partyId}`,
  );
}

export function getPartyPayouts(partyId: string) {
  return apiGet<CommissionPayout[]>(
    `/api/v1/commissions/payouts/party/${partyId}`,
  );
}

// ── Pricing — Discounts (6 endpoints) ────────────────────────────────────────

export function getDiscountSchemes() {
  return apiGet<DiscountScheme[]>('/api/v1/pricing/discounts');
}

export function getActiveDiscounts() {
  return apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/active');
}

export function createDiscountScheme(data: CreateDiscountSchemePayload) {
  return apiPost<DiscountScheme>('/api/v1/pricing/discounts', data);
}

export function evaluateDiscount(
  customerId: number,
  feeCode: string,
  amount: number,
) {
  return apiPost<{ schemeName: string; schemeCode: string; schemeType: string; discountBasis: string; discountValue: number }>(
    `/api/v1/pricing/discounts/evaluate?customerId=${customerId}&feeCode=${encodeURIComponent(feeCode)}&amount=${amount}`,
  );
}

export function getDiscountEvaluation() {
  return apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/evaluate');
}

export function getDiscountUtilization() {
  return apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/utilization');
}

// ── Pricing — Special Pricing (4 endpoints) ──────────────────────────────────

export function getSpecialPricingAgreements() {
  return apiGet<SpecialPricingAgreement[]>('/api/v1/pricing/special-pricing');
}

export function createSpecialPricing(data: CreateSpecialPricingPayload) {
  return apiPost<SpecialPricingAgreement>('/api/v1/pricing/special-pricing', data);
}

export function getCustomerSpecialPricing(customerId: number) {
  return apiGet<SpecialPricingAgreement[]>(
    `/api/v1/pricing/special-pricing/customer/${customerId}`,
  );
}

export function reviewSpecialPricing(id: number) {
  return apiPut<SpecialPricingAgreement>(
    `/api/v1/pricing/special-pricing/${id}/review`,
  );
}

// ── Templates (1 endpoint) ───────────────────────────────────────────────────

export function getAgreementTemplates() {
  return apiGet<AgreementTemplate[]>('/api/v1/agreement-templates');
}

// ── Legacy object API (for existing page/component imports) ──────────────────

export const agreementApi = {
  getByCustomer: (customerId: number) =>
    apiGet<Agreement[]>(`/api/v1/agreements/customer/${customerId}`),
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<Agreement[]>('/api/v1/agreements', filters),
  getById: (id: number) =>
    apiGet<Agreement>(`/api/v1/agreements/${id}`),
  create: (data: Partial<Agreement>) =>
    apiPost<Agreement>('/api/v1/agreements', data),
  sign: (id: number, signatureData: string, signatureType: 'CANVAS' | 'TYPED') =>
    apiPost<Agreement>(`/api/v1/agreements/${id}/sign`, { signatureData, signatureType }),
  terminate: (id: number, reason: string) =>
    apiPost<Agreement>(`/api/v1/agreements/${id}/terminate`, { reason }),
  amend: (id: number, data: Partial<Agreement>) =>
    apiPut<Agreement>(`/api/v1/agreements/${id}`, data),
  getTemplates: () =>
    apiGet<AgreementTemplate[]>('/api/v1/agreement-templates'),
};
