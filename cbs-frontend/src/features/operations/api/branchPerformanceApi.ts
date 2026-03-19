import { apiGet } from '@/lib/api';
import type { BranchPerformance } from '../types/branchPerformance';

export const branchPerformanceApi = {
  /** GET /v1/branch-performance/ranking */
  ranking: (params?: Record<string, unknown>) =>
    apiGet<BranchPerformance[]>('/api/v1/branch-performance/ranking', params),

  /** GET /v1/branch-performance/underperformers */
  underperformers: (params?: Record<string, unknown>) =>
    apiGet<BranchPerformance[]>('/api/v1/branch-performance/underperformers', params),

  /** GET /v1/branch-performance/digital-migration */
  digitalMigration: (params?: Record<string, unknown>) =>
    apiGet<BranchPerformance[]>('/api/v1/branch-performance/digital-migration', params),

  /** GET /v1/branch-performance/branch/{branchId} */
  byBranch: (branchId: number) =>
    apiGet<BranchPerformance[]>(`/api/v1/branch-performance/branch/${branchId}`),

};
