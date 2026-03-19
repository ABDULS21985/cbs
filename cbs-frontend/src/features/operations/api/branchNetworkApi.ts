import { apiGet, apiPost } from '@/lib/api';
import type { BranchNetworkPlan } from '../types/branchNetwork';

export const branchNetworkApi = {
  /** POST /v1/branch-network/{code}/approve */
  create: (code: string, data: Partial<BranchNetworkPlan>) =>
    apiPost<BranchNetworkPlan>(`/api/v1/branch-network/${code}/approve`, data),

  /** POST /v1/branch-network/{code}/complete */
  complete: (code: string) =>
    apiPost<BranchNetworkPlan>(`/api/v1/branch-network/${code}/complete`),

  /** GET /v1/branch-network/region/{region} */
  complete2: (region: string) =>
    apiGet<BranchNetworkPlan>(`/api/v1/branch-network/region/${region}`),

};
