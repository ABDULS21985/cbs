import { apiGet, apiPost } from '@/lib/api';

export interface ValuationModel {
  id: number; modelCode: string; modelName: string; instrumentType: string;
  methodology: string; fairValueLevel: number; description: string;
  status: string; createdAt: string;
}

export interface ValuationRun {
  id: number; runRef: string; valuationDate: string; modelId: number;
  runType: string; instrumentsValued: number; totalMarketValue: number;
  currency: string; unrealizedGainLoss: number; fairValueLevel1Total: number;
  fairValueLevel2Total: number; fairValueLevel3Total: number;
  ipvBreachCount: number; status: string;
}

export interface InstrumentValuation {
  id: number; runId: number; instrumentCode: string; instrumentName: string;
  modelPrice: number; marketPrice: number; deviationPct: number;
  fairValueLevel: number; isException: boolean; exceptionReason: string | null;
}

export interface ValuationRunSummary {
  runRef: string; totalValue: number; level1: number; level2: number; level3: number;
  instrumentCount: number; exceptionCount: number;
}

export const valuationApi = {
  defineModel: (data: Partial<ValuationModel>) =>
    apiPost<ValuationModel>('/api/v1/valuations/models', data),
  listModels: () =>
    apiGet<ValuationModel[]>('/api/v1/valuations/models'),
  getModel: (code: string) =>
    apiGet<ValuationModel>(`/api/v1/valuations/models/${code}`),
  listRuns: (params?: Record<string, unknown>) =>
    apiGet<ValuationRun[]>('/api/v1/valuations/runs', params),
  runValuation: (data: { valuationDate: string; modelId: number; runType: string }) =>
    apiPost<ValuationRun>(
      `/api/v1/valuations/runs?modelId=${data.modelId}&date=${encodeURIComponent(data.valuationDate)}&runType=${encodeURIComponent(data.runType)}`,
    ),
  recordInstrument: (runRef: string, data: Partial<InstrumentValuation>) =>
    apiPost<InstrumentValuation>(`/api/v1/valuations/runs/${runRef}/instruments`, data),
  completeRun: (runRef: string) =>
    apiPost<ValuationRun>(`/api/v1/valuations/runs/${runRef}/complete`),
  getRunSummary: (runRef: string) =>
    apiGet<ValuationRunSummary>(`/api/v1/valuations/runs/${runRef}/summary`),
  getRunExceptions: (runRef: string) =>
    apiGet<InstrumentValuation[]>(`/api/v1/valuations/runs/${runRef}/exceptions`),
};
