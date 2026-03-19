import { apiGet, apiPost } from '@/lib/api';
import type { SecuritiesMovement, SecuritiesPosition } from '../types/securitiesPosition';

export const securitiesPositionsApi = {
  /** POST /v1/securities-positions/movements */
  recordMovement: (data: Partial<SecuritiesMovement>) =>
    apiPost<SecuritiesMovement>('/api/v1/securities-positions/movements', data),

  /** GET /v1/securities-positions/portfolio/{code} */
  getByPortfolio: (code: string) =>
    apiGet<SecuritiesPosition[]>(`/api/v1/securities-positions/portfolio/${code}`),

  /** GET /v1/securities-positions/{positionId}/movements */
  getMovements: (positionId: number) =>
    apiGet<SecuritiesMovement[]>(`/api/v1/securities-positions/${positionId}/movements`),

};
