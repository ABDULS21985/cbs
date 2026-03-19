import { apiGet, apiPost } from '@/lib/api';
import type { CentralCashPosition } from '../types/centralCash';

export const centralCashApi = {
  /** POST /v1/central-cash/calculate */
  calculate: () =>
    apiPost<CentralCashPosition>('/api/v1/central-cash/calculate'),

  /** GET /v1/central-cash/{currency} */
  calculate2: (currency: string) =>
    apiGet<CentralCashPosition>(`/api/v1/central-cash/${currency}`),

};
