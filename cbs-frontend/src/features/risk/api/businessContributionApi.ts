import { apiGet, apiPost } from '@/lib/api';
import type { BusinessContribution } from '../types/businessContribution';

export const businessContributionApi = {
  /** POST /v1/business-contribution — Calculate business contribution */
  calculate: (data: Partial<BusinessContribution>) =>
    apiPost<BusinessContribution>('/api/v1/business-contribution', data),

  /** GET /v1/business-contribution/business-unit/{bu} */
  getByBusinessUnit: (bu: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/business-unit/${bu}`),

  /** GET /v1/business-contribution/product/{family} */
  getByProduct: (family: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/product/${family}`),

  /** GET /v1/business-contribution/region/{region} */
  getByRegion: (region: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/region/${region}`),

  /** GET /v1/business-contribution/top */
  getTopContributors: (params?: { periodDate?: string; periodType?: string; limit?: number }) =>
    apiGet<BusinessContribution[]>('/api/v1/business-contribution/top', params),

  /** GET /v1/business-contribution/underperformers */
  getUnderperformers: (params?: { periodDate?: string; periodType?: string; minRaroc?: number }) =>
    apiGet<BusinessContribution[]>('/api/v1/business-contribution/underperformers', params),
};
