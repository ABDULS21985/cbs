// Auto-generated from backend entities

export interface ContactCenter {
  id: number;
  centerCode: string;
  centerName: string;
  centerType: string;
  timezone: string;
  operatingHours: Record<string, unknown>;
  totalAgents: number;
  activeAgents: number;
  queueCapacity: number;
  avgWaitTimeSec: number;
  avgHandleTimeSec: number;
  serviceLevelTarget: number;
  currentServiceLevel: number;
  isActive: boolean;
  createdAt: string;
}

export interface ContactInteraction {
  id: number;
  interactionId: string;
  centerId: number;
  customerId: number;
  agentId: string;
  channel: string;
  direction: string;
  contactReason: string;
  queueName: string;
  waitTimeSec: number;
  handleTimeSec: number;
  wrapUpTimeSec: number;
  transferCount: number;
  disposition: string;
  sentiment: string;
  firstContactResolution: boolean;
  caseId: number;
  notes: string;
  recordingRef: string;
  status: string;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

