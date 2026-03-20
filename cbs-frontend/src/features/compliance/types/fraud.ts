export type FraudAlertStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'CONFIRMED_FRAUD';

export type FraudRuleCategory =
  | 'AMOUNT_ANOMALY'
  | 'VELOCITY'
  | 'GEO_ANOMALY'
  | 'DEVICE_ANOMALY'
  | 'ACCOUNT_TAKEOVER'
  | 'CARD_FRAUD';

export type FraudActionTaken = 'BLOCK_TRANSACTION' | 'STEP_UP_AUTH' | 'REVIEW';

export interface FraudAlert {
  id: number;
  alertRef: string;
  customerId: number;
  accountId: number;
  transactionRef: string;
  riskScore: number;
  maxScore: number;
  triggeredRules: Array<{ ruleCode: string; ruleName: string; weight: number }>;
  channel: string;
  deviceId: string | null;
  ipAddress: string | null;
  geoLocation: string | null;
  description: string;
  actionTaken: FraudActionTaken;
  status: FraudAlertStatus;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleCategory: FraudRuleCategory;
  description: string;
  ruleConfig: Record<string, unknown>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreWeight: number;
  applicableChannels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FraudStats {
  totalAlerts: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
}

export interface FraudTrend {
  recentAlerts: FraudAlert[];
  averageScore: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

export interface ModelPerformance {
  detectionRate: number;
  falsePositiveRate: number;
  averageResponseTimeMs: number;
  totalProcessed: number;
}

export interface ScoreTransactionPayload {
  customerId: number;
  accountId?: number;
  transactionRef: string;
  amount: number;
  channel: string;
  deviceId?: string;
  ipAddress?: string;
  geoLocation?: string;
  transactionContext?: Record<string, unknown>;
}

export type CreateFraudRulePayload = Omit<FraudRule, 'id' | 'ruleCode' | 'isActive' | 'createdAt' | 'updatedAt'>;
