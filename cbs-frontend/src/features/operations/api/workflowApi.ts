import { apiGet, apiPost } from '@/lib/api';

export type TaskType =
  | 'LOAN_APPROVAL'
  | 'PAYMENT_RELEASE'
  | 'ACCOUNT_OPENING'
  | 'KYC_REVIEW'
  | 'LIMIT_CHANGE'
  | 'RATE_OVERRIDE'
  | 'FEE_WAIVER'
  | 'CARD_REQUEST'
  | 'WRITE_OFF'
  | 'RESTRUCTURE'
  | 'PARAMETER_CHANGE'
  | 'USER_CREATION';

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskDecision = 'APPROVE' | 'REJECT';

export interface WorkflowTask {
  id: string;
  taskType: TaskType;
  description: string;
  requestor: string;
  requestorRole?: string;
  assignee?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  dueAt?: string;
  completedAt?: string;
  entityId?: string;
  entityType?: string;
  amount?: number;
  currency?: string;
  comments?: string;
}

export interface WorkflowTaskPage {
  content: WorkflowTask[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface WorkflowTaskFilters {
  assignee?: string;
  status?: TaskStatus;
  type?: TaskType;
  page?: number;
  size?: number;
}

export interface CompleteTaskPayload {
  decision: TaskDecision;
  comments?: string;
}

export const workflowApi = {
  getTasks: (filters?: WorkflowTaskFilters) =>
    apiGet<WorkflowTaskPage>('/api/v1/workflow/tasks', filters as Record<string, unknown>).catch(
      () => ({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 } as WorkflowTaskPage)
    ),

  getTask: (id: string) =>
    apiGet<WorkflowTask>(`/api/v1/workflow/tasks/${id}`),

  completeTask: (id: string, payload: CompleteTaskPayload) =>
    apiPost<WorkflowTask>(`/api/v1/workflow/tasks/${id}/complete`, payload),
};
