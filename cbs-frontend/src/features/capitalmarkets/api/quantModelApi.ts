import { apiGet, apiPost } from '@/lib/api';
import type { ModelBacktest, QuantModel } from '../types/quantModel';

export const quantModelsApi = {
  /** POST /v1/quant-models/{code}/approve */
  approve: (code: string) =>
    apiPost<QuantModel>(`/api/v1/quant-models/${code}/approve`),

  /** POST /v1/quant-models/{code}/promote */
  promote: (code: string) =>
    apiPost<QuantModel>(`/api/v1/quant-models/${code}/promote`),

  /** POST /v1/quant-models/{code}/retire */
  retire: (code: string) =>
    apiPost<QuantModel>(`/api/v1/quant-models/${code}/retire`),

  /** POST /v1/quant-models/{code}/backtest */
  recordBacktest: (code: string, data: Partial<ModelBacktest>) =>
    apiPost<ModelBacktest>(`/api/v1/quant-models/${code}/backtest`, data),

  /** GET /v1/quant-models/type/{type} */
  getByType: (type: string) =>
    apiGet<QuantModel[]>(`/api/v1/quant-models/type/${type}`),

  /** GET /v1/quant-models/due-for-review */
  getDueForReview: (params?: Record<string, unknown>) =>
    apiGet<QuantModel[]>('/api/v1/quant-models/due-for-review', params),

  /** GET /v1/quant-models/{code}/backtests */
  getBacktests: (code: string) =>
    apiGet<ModelBacktest[]>(`/api/v1/quant-models/${code}/backtests`),

};
