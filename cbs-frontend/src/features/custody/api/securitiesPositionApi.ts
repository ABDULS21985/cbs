import { apiGet, apiPost } from '@/lib/api';
import type { SecuritiesMovement, SecuritiesPosition } from '../types/securitiesPosition';

export const securitiesPositionsApi = {
  // POST /v1/securities-positions (record a position, CBS_ADMIN)
  recordPosition: (data: Partial<SecuritiesPosition>) =>
    apiPost<SecuritiesPosition>('/api/v1/securities-positions', data),

  // GET /v1/securities-positions/movements — list all movements
  listMovements: () =>
    apiGet<SecuritiesMovement[]>('/api/v1/securities-positions/movements'),

  // POST /v1/securities-positions/movements (CBS_ADMIN)
  recordMovement: (data: Partial<SecuritiesMovement>) =>
    apiPost<SecuritiesMovement>('/api/v1/securities-positions/movements', data),

  // GET /v1/securities-positions/portfolio/{code}
  getByPortfolio: (code: string) =>
    apiGet<SecuritiesPosition[]>(`/api/v1/securities-positions/portfolio/${code}`),

  // GET /v1/securities-positions/{positionId}/movements
  // positionId is the string positionId (e.g. "SP-XXXXXXXX"), not a numeric ID
  getMovements: (positionId: string) =>
    apiGet<SecuritiesMovement[]>(`/api/v1/securities-positions/${positionId}/movements`),
};
