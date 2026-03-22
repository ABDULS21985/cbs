import { apiGet, apiPost } from '@/lib/api';
import type { OpenItem } from '../types/openItem';

export interface AssignOpenItemRequest {
  assignedTo: string;
  assignedTeam?: string;
}

export interface ResolveOpenItemRequest {
  action: string;
  notes?: string;
}

export const openItemsApi = {
  /** POST /v1/open-items — create a new open item */
  create: (data: Partial<OpenItem>) =>
    apiPost<OpenItem>('/api/v1/open-items', data),

  /** GET /v1/open-items/open — get all open items */
  getOpen: () =>
    apiGet<OpenItem[]>('/api/v1/open-items/open'),

  /** POST /v1/open-items/{code}/assign — assign to user/team */
  assign: (code: string, data: AssignOpenItemRequest) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/assign`, undefined, {
      params: { assignedTo: data.assignedTo, assignedTeam: data.assignedTeam },
    }),

  /** POST /v1/open-items/{code}/resolve — resolve with action and optional notes */
  resolve: (code: string, data: ResolveOpenItemRequest) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/resolve`, undefined, {
      params: { action: data.action, notes: data.notes },
    }),

  /** POST /v1/open-items/{code}/escalate — escalate item */
  escalate: (code: string) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/escalate`),

  /** GET /v1/open-items/assignee/{assignedTo} — get items by assignee */
  getByAssignee: (assignedTo: string) =>
    apiGet<OpenItem[]>(`/api/v1/open-items/assignee/${assignedTo}`),

  /** POST /v1/open-items/update-aging — batch update aging days */
  updateAging: () =>
    apiPost<number>('/api/v1/open-items/update-aging'),

};
