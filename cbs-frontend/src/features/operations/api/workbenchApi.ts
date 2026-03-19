import { apiGet, apiPost } from '@/lib/api';
import type { StaffWorkbenchSession } from '../types/workbench';

export const workbenchApi = {
  /** POST /v1/workbench/sessions */
  start: () =>
    apiPost<StaffWorkbenchSession>('/api/v1/workbench/sessions'),

  /** POST /v1/workbench/sessions/{sessionId}/load-customer */
  loadCustomer: (sessionId: number) =>
    apiPost<StaffWorkbenchSession>(`/api/v1/workbench/sessions/${sessionId}/load-customer`),

  /** POST /v1/workbench/sessions/{sessionId}/logout */
  logout: (sessionId: number) =>
    apiPost<StaffWorkbenchSession>(`/api/v1/workbench/sessions/${sessionId}/logout`),

  /** GET /v1/workbench/sessions/staff/{staffUserId} */
  getActive: (staffUserId: number) =>
    apiGet<StaffWorkbenchSession[]>(`/api/v1/workbench/sessions/staff/${staffUserId}`),

};
