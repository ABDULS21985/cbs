import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type {
  CreditRiskStats, RatingDistributionItem, NplTrendPoint,
  ConcentrationItem, SingleObligor, RatingMigrationRow,
  Scorecard, ScorecardDetail, CreditWatchItem
} from '../types/creditRisk';

export const creditRiskApi = {
  getStats: () =>
    api.get<ApiResponse<CreditRiskStats>>('/v1/credit-risk/stats'),
  getRatingDistribution: () =>
    api.get<ApiResponse<RatingDistributionItem[]>>('/v1/credit-risk/rating-distribution'),
  getNplTrend: () =>
    api.get<ApiResponse<NplTrendPoint[]>>('/v1/credit-risk/npl-trend'),
  getSectorConcentration: () =>
    api.get<ApiResponse<ConcentrationItem[]>>('/v1/credit-risk/concentration/sector'),
  getProductConcentration: () =>
    api.get<ApiResponse<ConcentrationItem[]>>('/v1/credit-risk/concentration/product'),
  getRatingConcentration: () =>
    api.get<ApiResponse<{ grade: string; exposure: number; provision: number; coveragePct: number }[]>>(
      '/v1/credit-risk/concentration/rating'),
  getSingleObligors: () =>
    api.get<ApiResponse<SingleObligor[]>>('/v1/credit-risk/single-obligors'),
  getRatingMigration: (period?: 'QUARTERLY' | 'ANNUAL') =>
    api.get<ApiResponse<RatingMigrationRow[]>>('/v1/credit-risk/rating-migration', { params: { period } }),
  getScorecards: () =>
    api.get<ApiResponse<Scorecard[]>>('/v1/credit-risk/scorecards'),
  getScorecardDetail: (id: number) =>
    api.get<ApiResponse<ScorecardDetail>>(`/v1/credit-risk/scorecards/${id}`),
  getWatchList: () =>
    api.get<ApiResponse<CreditWatchItem[]>>('/v1/credit-risk/watch-list'),
  generateCommitteePack: () =>
    api.post<ApiResponse<{ jobId: string; downloadUrl: string }>>('/v1/credit-risk/committee-pack'),
};
