import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
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
    api.get<ApiResponse<EclSummary>>('/v1/ecl/summary'),

  getStageDistribution: () =>
    api.get<ApiResponse<StageDistributionItem[]>>('/v1/ecl/stage-distribution'),

  getStageMigration: () =>
    api.get<ApiResponse<StageMigration[]>>('/v1/ecl/stage-migration'),

  getProvisionMovement: () =>
    api.get<ApiResponse<ProvisionMovementRow[]>>('/v1/ecl/provision-movement'),

  getPdTermStructure: () =>
    api.get<ApiResponse<PdTermStructure[]>>('/v1/ecl/pd-term-structure'),

  getLgdByCollateral: () =>
    api.get<ApiResponse<LgdByCollateral[]>>('/v1/ecl/lgd-by-collateral'),

  getEadByProduct: () =>
    api.get<ApiResponse<EadByProduct[]>>('/v1/ecl/ead-by-product'),

  getGlReconciliation: () =>
    api.get<ApiResponse<GlReconciliation>>('/v1/ecl/gl-reconciliation'),

  getMacroScenarios: () =>
    api.get<ApiResponse<MacroScenario[]>>('/v1/ecl/macro-scenarios'),

  getLoansByStage: (stage: 1 | 2 | 3) =>
    api.get<ApiResponse<{ items: EclLoan[] }>>('/v1/ecl/loans', { params: { stage } }),

  runCalculation: () =>
    api.post<ApiResponse<{ jobId: string }>>('/v1/ecl/run'),
};
