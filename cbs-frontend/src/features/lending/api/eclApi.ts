import api, { apiGet, apiPost } from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { EclModelParameter, EclCalculation } from '../types/eclExt';
import type {
  EclSummary,
  StageDistributionItem,
  StageMigration,
  ProvisionMovementRow,
  PdTermStructure,
  LgdByCollateral,
  EadByProduct,
  GlReconciliation,
  MacroScenario,
  EclLoan,
} from '../types/ecl';

export const eclApi = {
  getSummary: () =>
    api.get<ApiResponse<EclSummary>>('/api/v1/ecl/summary'),

  getStageDistribution: () =>
    api.get<ApiResponse<StageDistributionItem[]>>('/api/v1/ecl/stage-distribution'),

  getStageMigration: () =>
    api.get<ApiResponse<StageMigration[]>>('/api/v1/ecl/stage-migration'),

  getProvisionMovement: () =>
    api.get<ApiResponse<ProvisionMovementRow[]>>('/api/v1/ecl/provision-movement'),

  getPdTermStructure: () =>
    api.get<ApiResponse<PdTermStructure[]>>('/api/v1/ecl/pd-term-structure'),

  getLgdByCollateral: () =>
    api.get<ApiResponse<LgdByCollateral[]>>('/api/v1/ecl/lgd-by-collateral'),

  getEadByProduct: () =>
    api.get<ApiResponse<EadByProduct[]>>('/api/v1/ecl/ead-by-product'),

  getGlReconciliation: () =>
    api.get<ApiResponse<GlReconciliation>>('/api/v1/ecl/gl-reconciliation'),

  getMacroScenarios: () =>
    api.get<ApiResponse<MacroScenario[]>>('/api/v1/ecl/macro-scenarios'),

  getLoansByStage: (stage: 1 | 2 | 3) =>
    api.get<ApiResponse<{ items: EclLoan[] }>>('/api/v1/ecl/loans', { params: { stage } }),

  runCalculation: () =>
    api.post<ApiResponse<{ jobId: string }>>('/api/v1/ecl/run'),

  listParameters: () =>
    apiGet<EclModelParameter[]>('/api/v1/ecl/parameters'),

  saveParameter: (data: Partial<EclModelParameter>) =>
    apiPost<EclModelParameter>('/api/v1/ecl/parameters', data),

  calculate: (params: Record<string, unknown>) =>
    apiPost<EclCalculation>('/api/v1/ecl/calculate', params),

  getCalculations: (date: string, params?: Record<string, unknown>) =>
    apiGet<EclCalculation[]>(`/api/v1/ecl/calculations/${date}`, params),
};
