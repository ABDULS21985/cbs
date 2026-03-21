import { apiGet, apiPost } from '@/lib/api';
import type { PaymentRail, PaymentRoutingRule } from '../types/paymentExt';

export const paymentsApi = {
  /** POST /v1/payments/orchestration/rails */
  createRail: (data: Partial<PaymentRail>) =>
    apiPost<PaymentRail>('/api/v1/payments/orchestration/rails', data),

  /** GET /v1/payments/orchestration/rails */
  getAllRails: (params?: Record<string, unknown>) =>
    apiGet<PaymentRail[]>('/api/v1/payments/orchestration/rails', params),

  /** GET /v1/payments/orchestration/rules */
  getAllRules: () =>
    apiGet<PaymentRoutingRule[]>('/api/v1/payments/orchestration/rules'),

  /** POST /v1/payments/orchestration/rules */
  createRule: (data: Partial<PaymentRoutingRule>) =>
    apiPost<PaymentRoutingRule>('/api/v1/payments/orchestration/rules', data),
};
