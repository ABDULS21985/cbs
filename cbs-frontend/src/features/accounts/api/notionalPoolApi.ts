import { apiGet, apiPost } from '@/lib/api';
import type { NotionalPool, NotionalPoolMember, NotionalPoolCalcResult } from '../types/notionalPool';

export const notionalPoolsApi = {
  /** GET /v1/notional-pools */
  list: () =>
    apiGet<NotionalPool[]>('/api/v1/notional-pools'),

  /** GET /v1/notional-pools/{poolCode} */
  get: (poolCode: string) =>
    apiGet<NotionalPool>(`/api/v1/notional-pools/${poolCode}`),

  /** POST /v1/notional-pools */
  create: (data: Partial<NotionalPool>) =>
    apiPost<NotionalPool>('/api/v1/notional-pools', data),

  /** POST /v1/notional-pools/{poolCode}/members */
  addMember: (poolCode: string, data: Partial<NotionalPoolMember>) =>
    apiPost<NotionalPoolMember>(`/api/v1/notional-pools/${poolCode}/members`, data),

  /** POST /v1/notional-pools/{poolCode}/calculate */
  calculate: (poolCode: string) =>
    apiPost<NotionalPoolCalcResult>(`/api/v1/notional-pools/${poolCode}/calculate`),

  /** GET /v1/notional-pools/{poolCode}/members */
  members: (poolCode: string) =>
    apiGet<NotionalPoolMember[]>(`/api/v1/notional-pools/${poolCode}/members`),
};
