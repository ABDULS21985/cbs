import { apiGet, apiPost } from '@/lib/api';
import type { TdFrameworkAgreement } from '../types/tdFramework';

export const tdFrameworksApi = {
  /** GET /v1/td-frameworks */
  getAll: () =>
    apiGet<TdFrameworkAgreement[]>('/api/v1/td-frameworks'),

  /** GET /v1/td-frameworks/{number} */
  getByNumber: (number: string) =>
    apiGet<TdFrameworkAgreement>(`/api/v1/td-frameworks/${number}`),

  /** POST /v1/td-frameworks */
  create: (data: Partial<TdFrameworkAgreement>) =>
    apiPost<TdFrameworkAgreement>('/api/v1/td-frameworks', data),

  /** POST /v1/td-frameworks/{number}/approve */
  approve: (number: string) =>
    apiPost<TdFrameworkAgreement>(`/api/v1/td-frameworks/${number}/approve`),

  /** GET /v1/td-frameworks/{number}/rate */
  getRate: (number: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/td-frameworks/${number}/rate`),

  /** GET /v1/td-frameworks/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<TdFrameworkAgreement[]>(`/api/v1/td-frameworks/customer/${customerId}`),

};
