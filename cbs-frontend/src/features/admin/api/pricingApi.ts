import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { DiscountScheme, SpecialPricingAgreement } from '../types/pricing';

export const pricingApi = {
  /** POST /v1/pricing/discounts */
  createDiscount: (data: Partial<DiscountScheme>) =>
    apiPost<DiscountScheme>('/api/v1/pricing/discounts', data),

  /** GET /v1/pricing/discounts/active */
  getActiveDiscounts: (params?: Record<string, unknown>) =>
    apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/active', params),

  /** POST /v1/pricing/discounts/evaluate */
  evaluateDiscount: () =>
    apiPost<DiscountScheme>('/api/v1/pricing/discounts/evaluate'),

  /** POST /v1/pricing/special-pricing */
  createSpecialPricing: (data: Partial<SpecialPricingAgreement>) =>
    apiPost<SpecialPricingAgreement>('/api/v1/pricing/special-pricing', data),

  /** GET /v1/pricing/special-pricing/customer/{customerId} */
  getCustomerSpecialPricing: (customerId: number) =>
    apiGet<SpecialPricingAgreement[]>(`/api/v1/pricing/special-pricing/customer/${customerId}`),

  /** PUT /v1/pricing/special-pricing/{id}/review */
  reviewSpecialPricing: (id: number) =>
    apiPut<SpecialPricingAgreement>(`/api/v1/pricing/special-pricing/${id}/review`),

  /** GET /v1/pricing/discounts/utilization */
  getDiscountUtilization: (params?: Record<string, unknown>) =>
    apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/utilization', params),

};
