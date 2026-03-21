import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { DiscountScheme, SpecialPricingAgreement } from '../types/pricing';

export const pricingApi = {
  /** GET /v1/pricing/discounts — list all */
  getAllDiscounts: () =>
    apiGet<DiscountScheme[]>('/api/v1/pricing/discounts'),

  /** GET /v1/pricing/special-pricing — list all */
  getAllSpecialPricing: () =>
    apiGet<SpecialPricingAgreement[]>('/api/v1/pricing/special-pricing'),

  /** POST /v1/pricing/discounts */
  createDiscount: (data: Partial<DiscountScheme>) =>
    apiPost<DiscountScheme>('/api/v1/pricing/discounts', data),

  /** GET /v1/pricing/discounts/active */
  getActiveDiscounts: (params?: Record<string, unknown>) =>
    apiGet<DiscountScheme[]>('/api/v1/pricing/discounts/active', params),

  /** GET /v1/pricing/discounts/evaluate */
  evaluateDiscount: () =>
    apiGet<DiscountScheme>('/api/v1/pricing/discounts/evaluate'),

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
