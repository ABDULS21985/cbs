import { apiGet, apiPost } from '@/lib/api';
import type { SecurityHolding } from '../types/fixedIncome';

export const fixedIncomeApi = {
  /** POST /v1/fixed-income/holdings */
  addHolding: (data: Partial<SecurityHolding>) =>
    apiPost<SecurityHolding>('/api/v1/fixed-income/holdings', data),

  /** GET /v1/fixed-income/holdings/{id} */
  getHolding: (id: number) =>
    apiGet<SecurityHolding>(`/api/v1/fixed-income/holdings/${id}`),

  /** GET /v1/fixed-income/portfolio/{code} */
  getPortfolio: (code: string) =>
    apiGet<SecurityHolding[]>(`/api/v1/fixed-income/portfolio/${code}`),

  /** GET /v1/fixed-income/portfolio/{code}/face-value */
  getFaceValue: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/fixed-income/portfolio/${code}/face-value`),

  /** POST /v1/fixed-income/batch/accrual */
  batchAccrual: () =>
    apiPost<Record<string, unknown>>('/api/v1/fixed-income/batch/accrual'),

  /** POST /v1/fixed-income/batch/mtm */
  batchMtm: (data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>('/api/v1/fixed-income/batch/mtm', data),

  /** POST /v1/fixed-income/batch/maturity */
  batchMaturity: () =>
    apiPost<Record<string, unknown>>('/api/v1/fixed-income/batch/maturity'),

  /** POST /v1/fixed-income/batch/coupons */
  batchCoupons: () =>
    apiPost<Record<string, unknown>>('/api/v1/fixed-income/batch/coupons'),

};
