// Auto-generated from backend entities

export interface ModelLifecycleEvent {
  id: number;
  eventCode: string;
  modelCode: string;
  modelName: string;
  eventType: string;
  eventDate: string;
  performedBy: string;
  description: string;
  findings: Record<string, unknown>;
  metricsSnapshot: Record<string, unknown>;
  approvalCommittee: string;
  riskTierChange: string;
  regulatoryNotification: boolean;
  documentationRef: string;
  status: string;
}

