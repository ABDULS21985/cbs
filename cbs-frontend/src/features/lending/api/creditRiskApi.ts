import { apiGet } from '@/lib/api';

export const creditRiskApi = {
  getStats: () =>
    apiGet<Record<string, unknown>>('/api/v1/credit-risk/stats'),

  getRatingDistribution: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/rating-distribution'),

  getRatingMigration: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/rating-migration'),

  getSectorConcentration: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/concentration/sector'),

  getProductConcentration: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/concentration/product'),

  getRatingConcentration: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/concentration/rating'),

  getNplTrend: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/npl-trend'),

  getWatchList: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/credit-risk/watch-list', params),

  getSingleObligors: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/single-obligors'),

  getScorecards: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/credit-risk/scorecards'),

  getCommitteePack: () =>
    apiGet<Record<string, unknown>>('/api/v1/credit-risk/committee-pack'),
};
