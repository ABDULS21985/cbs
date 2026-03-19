import { apiGet, apiPost } from '@/lib/api';
import type { WorkbenchAlert, WorkbenchQuickAction, WorkbenchWidget } from '../types/workbenchConfig';

export const workbenchConfigApi = {
  /** POST /v1/workbench-config/widgets */
  createWidget: (data: Partial<WorkbenchWidget>) =>
    apiPost<WorkbenchWidget>('/api/v1/workbench-config/widgets', data),

  /** GET /v1/workbench-config/widgets */
  getActiveWidgets: (params?: Record<string, unknown>) =>
    apiGet<WorkbenchWidget[]>('/api/v1/workbench-config/widgets', params),

  /** POST /v1/workbench-config/quick-actions */
  createQuickAction: (data: Partial<WorkbenchQuickAction>) =>
    apiPost<WorkbenchQuickAction>('/api/v1/workbench-config/quick-actions', data),

  /** GET /v1/workbench-config/quick-actions */
  getActiveQuickActions: (params?: Record<string, unknown>) =>
    apiGet<WorkbenchQuickAction[]>('/api/v1/workbench-config/quick-actions', params),

  /** GET /v1/workbench-config/load/{workbenchType} */
  loadWorkbench: (workbenchType: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/workbench-config/load/${workbenchType}`),

  /** POST /v1/workbench-config/alerts */
  raiseAlert: () =>
    apiPost<WorkbenchAlert>('/api/v1/workbench-config/alerts'),

  /** POST /v1/workbench-config/alerts/{id}/acknowledge */
  acknowledgeAlert: (id: number) =>
    apiPost<WorkbenchAlert>(`/api/v1/workbench-config/alerts/${id}/acknowledge`),

  /** GET /v1/workbench-config/alerts/session/{sessionId} */
  getSessionAlerts: (sessionId: number) =>
    apiGet<WorkbenchAlert[]>(`/api/v1/workbench-config/alerts/session/${sessionId}`),

};
