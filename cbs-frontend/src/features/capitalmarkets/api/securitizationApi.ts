import { apiGet, apiPost } from '@/lib/api';
import type { SecuritizationVehicle } from '../types/securitization';

export const securitizationApi = {
  /** POST /v1/securitization/{code}/issue */
  create: (code: string, data: Partial<SecuritizationVehicle>) =>
    apiPost<SecuritizationVehicle>(`/api/v1/securitization/${code}/issue`, data),

  /** GET /v1/securitization/type/{type} */
  byType: (type: string) =>
    apiGet<SecuritizationVehicle[]>(`/api/v1/securitization/type/${type}`),

  /** GET /v1/securitization/active */
  byType2: (params?: Record<string, unknown>) =>
    apiGet<SecuritizationVehicle[]>('/api/v1/securitization/active', params),

};
