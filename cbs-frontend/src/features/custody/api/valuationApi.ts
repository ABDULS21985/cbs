import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
import type { InstrumentValuation, ValuationModel, ValuationRun } from '../types/valuation';

export const valuationsApi = {
  // POST /v1/valuations/models (body: ValuationModel entity)
  defineModel: (data: Partial<ValuationModel>) =>
    apiPost<ValuationModel>('/api/v1/valuations/models', data),

  // GET /v1/valuations/models
  getAllModels: () =>
    apiGet<ValuationModel[]>('/api/v1/valuations/models'),

  // GET /v1/valuations/models/{code}
  getModel: (code: string) =>
    apiGet<ValuationModel>(`/api/v1/valuations/models/${code}`),

  // GET /v1/valuations/runs
  getRuns: () =>
    apiGet<ValuationRun[]>('/api/v1/valuations/runs'),

  // POST /v1/valuations/runs?modelId=...&date=...&runType=...
  // Backend: @RequestParam Long modelId, @RequestParam LocalDate date, @RequestParam String runType
  runValuation: (modelId: number, date: string, runType: string) => {
    const params = new URLSearchParams({
      modelId: String(modelId),
      date,
      runType,
    });
    return api.post<{ data: ValuationRun }>(
      `/api/v1/valuations/runs?${params}`,
    ).then((r) => r.data.data);
  },

  // POST /v1/valuations/runs/{ref}/instruments (body: InstrumentValuation entity)
  recordInstrument: (ref: string, data: Partial<InstrumentValuation>) =>
    apiPost<InstrumentValuation>(`/api/v1/valuations/runs/${ref}/instruments`, data),

  // POST /v1/valuations/runs/{ref}/complete
  completeRun: (ref: string) =>
    apiPost<ValuationRun>(`/api/v1/valuations/runs/${ref}/complete`),

  // GET /v1/valuations/runs/{ref}/summary
  getSummary: (ref: string) =>
    apiGet<ValuationRun>(`/api/v1/valuations/runs/${ref}/summary`),

  // GET /v1/valuations/runs/{ref}/exceptions
  getExceptions: (ref: string) =>
    apiGet<InstrumentValuation[]>(`/api/v1/valuations/runs/${ref}/exceptions`),
};
