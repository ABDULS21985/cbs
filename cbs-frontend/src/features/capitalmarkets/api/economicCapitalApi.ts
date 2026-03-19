import { apiGet } from '@/lib/api';
import type { EconomicCapital } from '../types/economicCapital';

export const economicCapitalApi = {
  /** GET /v1/economic-capital/{date} */
  calc: (date: string) =>
    apiGet<EconomicCapital>(`/api/v1/economic-capital/${date}`),

  /** GET /v1/economic-capital/{date}/{bu} */
  byBu: (date: string, bu: string) =>
    apiGet<EconomicCapital[]>(`/api/v1/economic-capital/${date}/${bu}`),

};
