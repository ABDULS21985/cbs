import { apiGet } from '@/lib/api';
import type { ChartOfAccounts, GlBalance } from '../types/gl';

export const glApi = {
  /** GET /v1/gl/accounts/postable */
  getPostableAccounts: (params?: Record<string, unknown>) =>
    apiGet<ChartOfAccounts[]>('/api/v1/gl/accounts/postable', params),

  /** GET /v1/gl/balances/{glCode} */
  getGlHistory: (glCode: string) =>
    apiGet<GlBalance[]>(`/api/v1/gl/balances/${glCode}`),

};
