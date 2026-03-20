// Auto-generated from backend entities

export interface WorkflowDefinition {
  id: number;
  workflowCode: string;
  workflowName: string;
  entityType: string;
  triggerEvent: string;
  stepsConfig: Record<string, unknown>[];
  autoApproveBelow: number;
  slaHours: number;
  isActive: boolean;
}

export interface WorkflowInstance {
  id: number;
  workflowCode: string;
  entityType: string;
  entityId: number;
  entityRef: string;
  currentStep: number;
  totalSteps: number;
  status: WorkflowStatus;
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string;
  amount: number;
  currencyCode: string;
  slaDeadline: string;
  isSlaBreached: boolean;
  createdAt: string;
  updatedAt?: string;
  version: number;
  stepActions: WorkflowStepAction[];
}

