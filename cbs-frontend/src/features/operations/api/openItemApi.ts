import { apiGet, apiPost } from '@/lib/api';
import type { OpenItem } from '../types/openItem';

export const openItemsApi = {
  /** POST /v1/open-items/{code}/assign */
  assign: (code: string) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/assign`),

  /** POST /v1/open-items/{code}/resolve */
  resolve: (code: string) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/resolve`),

  /** GET /v1/open-items/assignee/{assignedTo} */
  getByAssignee: (assignedTo: string) =>
    apiGet<OpenItem[]>(`/api/v1/open-items/assignee/${assignedTo}`),

  /** POST /v1/open-items/update-aging */
  updateAging: () =>
    apiPost<number>('/api/v1/open-items/update-aging'),

};
