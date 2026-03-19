import { apiGet, apiPost } from '@/lib/api';
import type { EclCalculation, EclModelParameter } from '../types/eclExt';

export const eclApi = {
  /** POST /v1/ecl/parameters */
  saveParam: (data: Partial<EclModelParameter>) =>
    apiPost<EclModelParameter>('/api/v1/ecl/parameters', data),

  /** GET /v1/ecl/calculations/{date} */
  getCalculations: (date: string) =>
    apiGet<EclCalculation[]>(`/api/v1/ecl/calculations/${date}`),

};
