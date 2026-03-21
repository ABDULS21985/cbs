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
  // Backend: GET /v1/ecl/summary (no params)
  getSummary: () =>
    api.get<ApiResponse<EclSummary>>('/api/v1/ecl/summary'),

  // Backend: GET /v1/ecl/summary/{date} (@PathVariable LocalDate date)
  getSummaryByDate: (date: string) =>
    api.get<ApiResponse<EclSummary>>(`/api/v1/ecl/summary/${date}`),

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

  // Backend: GET /v1/ecl/loans?stage=1&page=0&size=20 (@RequestParam)
  getLoansByStage: (stage: 1 | 2 | 3, page = 0, size = 20) =>
    api.get<ApiResponse<{ items: EclLoan[] }>>('/api/v1/ecl/loans', { params: { stage, page, size } }),

  // Backend: GET /v1/ecl/run
  getRunStatus: () =>
    api.get<ApiResponse<Record<string, unknown>>>('/api/v1/ecl/run'),

  // Backend: POST /v1/ecl/run
  runCalculation: () =>
    api.post<ApiResponse<{ jobId: string }>>('/api/v1/ecl/run'),

  // Backend: GET /v1/ecl/parameters
  listParameters: () =>
    apiGet<EclModelParameter[]>('/api/v1/ecl/parameters'),

  // Backend: POST /v1/ecl/parameters with @RequestBody EclModelParameter
  saveParameter: (data: Partial<EclModelParameter>) =>
    apiPost<EclModelParameter>('/api/v1/ecl/parameters', data),

  // Backend: POST /v1/ecl/calculate — ALL params are @RequestParam, NOT body
  calculate: (params: {
    loanAccountId: number;
    customerId: number;
    segment: string;
    productCode?: string;
    outstandingBalance: number;
    offBalanceExposure?: number;
    daysPastDue: number;
    significantDeterioration?: boolean;
  }) => {
    const qp = new URLSearchParams();
    qp.set('loanAccountId', String(params.loanAccountId));
    qp.set('customerId', String(params.customerId));
    qp.set('segment', params.segment);
    if (params.productCode) qp.set('productCode', params.productCode);
    qp.set('outstandingBalance', String(params.outstandingBalance));
    if (params.offBalanceExposure != null) qp.set('offBalanceExposure', String(params.offBalanceExposure));
    qp.set('daysPastDue', String(params.daysPastDue));
    if (params.significantDeterioration != null) qp.set('significantDeterioration', String(params.significantDeterioration));
    return api.post<{ data: EclCalculation }>(
      `/api/v1/ecl/calculate?${qp}`,
    ).then((r) => r.data.data);
  },

  // Backend: GET /v1/ecl/calculations/{date}?page=0&size=50
  getCalculations: (date: string, params?: { page?: number; size?: number }) =>
    apiGet<EclCalculation[]>(`/api/v1/ecl/calculations/${date}`, params as Record<string, unknown>),

  // Backend: GET /v1/ecl (list with search, page, size)
  list: (params?: { search?: string; page?: number; size?: number }) =>
    apiGet<EclCalculation[]>('/api/v1/ecl', params as Record<string, unknown>),
};
