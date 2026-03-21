import { apiGet } from '@/lib/api';
import type { ChartOfAccounts, GlBalance } from '../types/gl';

export const glExtApi = {
  /** GET /v1/gl/accounts/postable — no params */
  getPostableAccounts: () =>
    apiGet<ChartOfAccounts[]>('/api/v1/gl/accounts/postable'),

  /** GET /v1/gl/balances/{glCode}?from=...&to=... — both from/to are required */
  getGlHistory: (glCode: string, from: string, to: string) =>
    apiGet<GlBalance[]>(`/api/v1/gl/balances/${glCode}`, { from, to }),

  /** GET /v1/gl/accounts/category/{category} */
  getByCategory: (category: string) =>
    apiGet<ChartOfAccounts[]>(`/api/v1/gl/accounts/category/${category}`),
};
