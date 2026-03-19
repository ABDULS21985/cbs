// Auto-generated from backend entities

export interface FraudAlert {
  id: number;
  alertRef: string;
  customerId: number;
  accountId: number;
  transactionRef: string;
  riskScore: number;
  maxScore: number;
  triggeredRules: string[];
  channel: string;
  deviceId: string;
  ipAddress: string;
  geoLocation: string;
  description: string;
  actionTaken: string;
  status: string;
  assignedTo: string;
  resolutionNotes: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface FraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleCategory: string;
  description: string;
  ruleConfig: Record<string, unknown>;
  severity: string;
  scoreWeight: number;
  applicableChannels: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

