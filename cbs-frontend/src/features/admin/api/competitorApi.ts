import { apiGet, apiPut } from '@/lib/api';
import type { CompetitorProfile } from '../types/competitor';

export const competitorsApi = {
  /** PUT /v1/competitors/{code} */
  update: (code: string, data: Partial<CompetitorProfile>) =>
    apiPut<CompetitorProfile>(`/api/v1/competitors/${code}`, data),

  /** GET /v1/competitors/type/{type} */
  getByType: (type: string) =>
    apiGet<CompetitorProfile[]>(`/api/v1/competitors/type/${type}`),

  /** GET /v1/competitors/threats/{level} */
  getThreats: (level: string) =>
    apiGet<CompetitorProfile[]>(`/api/v1/competitors/threats/${level}`),

};
