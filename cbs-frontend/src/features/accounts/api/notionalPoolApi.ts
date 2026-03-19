import { apiGet, apiPost } from '@/lib/api';
import type { NotionalPoolMember } from '../types/notionalPool';

export const notionalPoolsApi = {
  /** POST /v1/notional-pools/{poolCode}/members */
  addMember: (poolCode: string, data: Partial<NotionalPoolMember>) =>
    apiPost<NotionalPoolMember>(`/api/v1/notional-pools/${poolCode}/members`, data),

  /** POST /v1/notional-pools/{poolCode}/calculate */
  calculate: (poolCode: string) =>
    apiPost<Record<string, unknown>>(`/api/v1/notional-pools/${poolCode}/calculate`),

  /** GET /v1/notional-pools/{poolCode}/members */
  members: (poolCode: string) =>
    apiGet<NotionalPoolMember[]>(`/api/v1/notional-pools/${poolCode}/members`),

};
