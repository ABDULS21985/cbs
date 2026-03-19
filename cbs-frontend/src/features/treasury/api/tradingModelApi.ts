import { apiPost } from '@/lib/api';
import type { TradingModel } from '../types/tradingModel';

export const tradingModelsApi = {
  /** POST /v1/trading-models/{id}/validate */
  submitForValidation: (id: number) =>
    apiPost<TradingModel>(`/api/v1/trading-models/${id}/validate`),

  /** POST /v1/trading-models/{id}/deploy */
  deployToProduction: (id: number) =>
    apiPost<TradingModel>(`/api/v1/trading-models/${id}/deploy`),

  /** POST /v1/trading-models/{id}/retire */
  retireModel: (id: number) =>
    apiPost<TradingModel>(`/api/v1/trading-models/${id}/retire`),

  /** POST /v1/trading-models/{id}/calibrate */
  calibrateModel: (id: number) =>
    apiPost<TradingModel>(`/api/v1/trading-models/${id}/calibrate`),

};
