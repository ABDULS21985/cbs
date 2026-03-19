import { apiGet } from '@/lib/api';
import type { BusinessContribution } from '../types/businessContribution';

export const businessContributionApi = {
  /** GET /v1/business-contribution/business-unit/{bu} */
  byBusinessUnit: (bu: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/business-unit/${bu}`),

  /** GET /v1/business-contribution/product/{family} */
  byProduct: (family: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/product/${family}`),

  /** GET /v1/business-contribution/region/{region} */
  byRegion: (region: string) =>
    apiGet<BusinessContribution[]>(`/api/v1/business-contribution/region/${region}`),

  /** GET /v1/business-contribution/top */
  topContributors: (params?: Record<string, unknown>) =>
    apiGet<BusinessContribution[]>('/api/v1/business-contribution/top', params),

  /** GET /v1/business-contribution/underperformers */
  underperformers: (params?: Record<string, unknown>) =>
    apiGet<BusinessContribution[]>('/api/v1/business-contribution/underperformers', params),

};
