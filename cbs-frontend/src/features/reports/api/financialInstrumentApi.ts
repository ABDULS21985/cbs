import { apiGet } from '@/lib/api';
import type { FinancialInstrument } from '../types/financialInstrument';

export const financialInstrumentsApi = {
  /** GET /v1/financial-instruments/{code} */
  getByCode: (code: string) =>
    apiGet<FinancialInstrument>(`/api/v1/financial-instruments/${code}`),

  /** GET /v1/financial-instruments/type/{type} */
  byType: (type: string) =>
    apiGet<FinancialInstrument[]>(`/api/v1/financial-instruments/type/${type}`),

  /** GET /v1/financial-instruments/asset-class/{assetClass} */
  byAssetClass: (assetClass: string) =>
    apiGet<FinancialInstrument[]>(`/api/v1/financial-instruments/asset-class/${assetClass}`),

};
