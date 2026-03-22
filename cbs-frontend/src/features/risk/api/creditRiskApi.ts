import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type {
  CreditRiskStats, RatingDistributionItem, NplTrendPoint,
  ConcentrationItem, SingleObligor, RatingMigrationRow,
  Scorecard, ScorecardDetail, CreditWatchItem
} from '../types/creditRisk';

export const creditRiskApi = {
  getStats: () =>
    api.get<ApiResponse<CreditRiskStats>>('/api/v1/credit-risk/stats'),
  getRatingDistribution: () =>
    api.get<ApiResponse<RatingDistributionItem[]>>('/api/v1/credit-risk/rating-distribution'),
  getNplTrend: () =>
    api.get<ApiResponse<NplTrendPoint[]>>('/api/v1/credit-risk/npl-trend'),
  getSectorConcentration: () =>
    api.get<ApiResponse<ConcentrationItem[]>>('/api/v1/credit-risk/concentration/sector'),
  getProductConcentration: () =>
    api.get<ApiResponse<ConcentrationItem[]>>('/api/v1/credit-risk/concentration/product'),
  getRatingConcentration: () =>
    api.get<ApiResponse<{ grade: string; exposure: number; provision: number; coveragePct: number }[]>>(
      '/api/v1/credit-risk/concentration/rating'),
  getSingleObligors: () =>
    api.get<ApiResponse<SingleObligor[]>>('/api/v1/credit-risk/single-obligors'),
  getRatingMigration: (period?: 'QUARTERLY' | 'ANNUAL') =>
    api.get<ApiResponse<RatingMigrationRow[]>>('/api/v1/credit-risk/rating-migration', { params: { period } }),
  getScorecards: () =>
    api.get<ApiResponse<Scorecard[]>>('/api/v1/credit-risk/scorecards'),
  getScorecardDetail: (id: number) =>
    api.get<ApiResponse<ScorecardDetail>>(`/api/v1/credit-risk/scorecards/${id}`),
  getWatchList: () =>
    api.get<ApiResponse<CreditWatchItem[]>>('/api/v1/credit-risk/watch-list'),
  generateCommitteePack: () =>
    api.get<ApiResponse<Record<string, unknown>>>('/api/v1/credit-risk/committee-pack'),
};
