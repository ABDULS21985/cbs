import { apiGet } from '@/lib/api';
import type { FinancialPosition } from '../types/financialPosition';

export const financialPositionsApi = {
  /** GET /v1/financial-positions/type/{type}/{date} */
  getByType: (type: string, date: string) =>
    apiGet<FinancialPosition[]>(`/api/v1/financial-positions/type/${type}/${date}`),

  /** GET /v1/financial-positions/breaches */
  getBreaches: (params?: Record<string, unknown>) =>
    apiGet<FinancialPosition[]>('/api/v1/financial-positions/breaches', params),

};
