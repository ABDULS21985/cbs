import { apiGet, apiPost } from '@/lib/api';

export interface ValuationModel {
  id: number;
  modelCode: string;
  modelName: string;
  instrumentType: string;
  methodology: string;
  fairValueLevel: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface ValuationRun {
  id: number;
  runRef: string;
  valuationDate: string;
  modelId: number;
  runType: string;
  instrumentsValued: number;
  totalMarketValue: number;
  currency: string;
  unrealizedGainLoss: number;
  fairValueLevel1Total: number;
  fairValueLevel2Total: number;
  fairValueLevel3Total: number;
  ipvBreachCount: number;
  pricingExceptions: Record<string, unknown> | null;
  runStartedAt: string;
  runCompletedAt: string | null;
  status: string;
}

export interface InstrumentValuation {
  id: number;
  runId: number;
  instrumentCode: string;
  instrumentName: string;
  modelPrice: number;
  marketPrice: number;
  deviationPct: number;
  fairValueLevel: number;
  isException: boolean;
  exceptionReason: string | null;
}

export const valuationApi = {
  getModels: () =>
    apiGet<ValuationModel[]>('/api/v1/valuations/models'),

  getModel: (code: string) =>
    apiGet<ValuationModel>(`/api/v1/valuations/models/${code}`),

  defineModel: (data: Partial<ValuationModel>) =>
    apiPost<ValuationModel>('/api/v1/valuations/models', data),

  getRuns: () =>
    apiGet<ValuationRun[]>('/api/v1/valuations/runs'),

  runValuation: (modelId: number, date: string, runType: string) =>
    apiPost<ValuationRun>(`/api/v1/valuations/runs?modelId=${modelId}&date=${date}&runType=${encodeURIComponent(runType)}`),

  completeRun: (ref: string) =>
    apiPost<ValuationRun>(`/api/v1/valuations/runs/${ref}/complete`),

  getRunSummary: (ref: string) =>
    apiGet<ValuationRun>(`/api/v1/valuations/runs/${ref}/summary`),

  getExceptions: (ref: string) =>
    apiGet<InstrumentValuation[]>(`/api/v1/valuations/runs/${ref}/exceptions`),
};
