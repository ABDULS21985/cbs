// Auto-generated from backend entities

export interface OpRiskKri {
  id: number;
  kriCode: string;
  kriName: string;
  kriCategory: string;
  measurementUnit: string;
  thresholdAmber: number;
  thresholdRed: number;
  frequency: string;
  owner: string;
  isActive: boolean;
  createdAt: string;
  version: number;
}

export interface OpRiskKriReading {
  id: number;
  kri: OpRiskKri;
  readingDate: string;
  value: number;
  ragStatus: string;
  commentary: string;
  createdAt: string;
}

export interface OpRiskLossEvent {
  id: number;
  eventRef: string;
  eventCategory: string;
  eventType: string;
  description: string;
  grossLoss: number;
  recoveryAmount: number;
  netLoss: number;
  currencyCode: string;
  businessLine: string;
  department: string;
  branchCode: string;
  eventDate: string;
  discoveryDate: string;
  status: string;
  rootCause: string;
  remediationPlan: string;
  assignedTo: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

