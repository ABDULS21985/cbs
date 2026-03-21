import { apiGet, apiPost } from '@/lib/api';
import type { SecuritizationVehicle } from '../types/securitization';

export const securitizationApi = {
  /** POST /v1/securitization — create a new vehicle */
  create: (data: Partial<SecuritizationVehicle>) =>
    apiPost<SecuritizationVehicle>('/api/v1/securitization', data),

  /** POST /v1/securitization/{code}/issue — issue an existing vehicle */
  issue: (code: string) =>
    apiPost<SecuritizationVehicle>(`/api/v1/securitization/${code}/issue`),

  /** GET /v1/securitization/type/{type} */
  getByType: (type: string) =>
    apiGet<SecuritizationVehicle[]>(`/api/v1/securitization/type/${type}`),

  /** GET /v1/securitization/active */
  getActive: (params?: Record<string, unknown>) =>
    apiGet<SecuritizationVehicle[]>('/api/v1/securitization/active', params),
};
