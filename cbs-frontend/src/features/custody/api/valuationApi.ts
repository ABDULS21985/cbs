import { apiGet, apiPost } from '@/lib/api';
import type { InstrumentValuation, ValuationModel, ValuationRun } from '../types/valuation';

export const valuationsApi = {
  /** POST /v1/valuations/models */
  defineModel: (data: Partial<ValuationModel>) =>
    apiPost<ValuationModel>('/api/v1/valuations/models', data),

  /** GET /v1/valuations/models */
  getAllModels: (params?: Record<string, unknown>) =>
    apiGet<ValuationModel[]>('/api/v1/valuations/models', params),

  /** GET /v1/valuations/models/{code} */
  getModel: (code: string) =>
    apiGet<ValuationModel>(`/api/v1/valuations/models/${code}`),

  /** POST /v1/valuations/runs */
  runValuation: () =>
    apiPost<ValuationRun>('/api/v1/valuations/runs'),

  /** POST /v1/valuations/runs/{ref}/instruments */
  recordInstrument: (ref: string, data: Partial<InstrumentValuation>) =>
    apiPost<InstrumentValuation>(`/api/v1/valuations/runs/${ref}/instruments`, data),

  /** POST /v1/valuations/runs/{ref}/complete */
  completeRun: (ref: string) =>
    apiPost<ValuationRun>(`/api/v1/valuations/runs/${ref}/complete`),

  /** GET /v1/valuations/runs/{ref}/summary */
  getSummary: (ref: string) =>
    apiGet<ValuationRun>(`/api/v1/valuations/runs/${ref}/summary`),

  /** GET /v1/valuations/runs/{ref}/exceptions */
  getExceptions: (ref: string) =>
    apiGet<InstrumentValuation[]>(`/api/v1/valuations/runs/${ref}/exceptions`),

};
