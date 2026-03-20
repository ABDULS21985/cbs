export type FraudAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FraudAlertStatus = 'NEW' | 'INVESTIGATING' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE';

export interface FraudAlert {
  id: number;
  alertNumber: string;
  severity: FraudAlertSeverity;
  type: string;
  customerLabel: string;
  accountLabel?: string;
  location?: string;
  score: number;
  rules: string[];
  createdAt: string;
  status: FraudAlertStatus;
  channel?: string;
  assignedTo?: string | null;
  description: string;
  actionTaken?: string | null;
  transactionRef?: string | null;
}

export interface FraudStats {
  totalAlerts: number;
  newAlerts: number;
  investigatingAlerts: number;
  resolvedAlerts: number;
  resolutionRate: number;
}

export interface FraudTrendPoint {
  date: string;
  alertCount: number;
  investigatingCount: number;
  averageRiskScore: number;
}

export interface FraudTransaction {
  id: number;
  timestamp: string;
  amount: number;
  currency: string;
  channel: 'POS' | 'ATM' | 'ONLINE' | 'TRANSFER' | 'USSD';
  merchantName?: string;
  location?: string;
  suspicious: boolean;
}

export interface FraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description: string;
  category: string;
  severity: FraudAlertSeverity;
  scoreWeight: number;
  applicableChannels: string;
  active: boolean;
}

export interface ModelPerformance {
  totalAlerts: number;
  resolvedAlerts: number;
  falsePositives: number;
  detectionRate: number;
  falsePositiveRate: number;
}

export interface ScoreDistributionBucket {
  bucket: string;
  open: number;
  resolved: number;
}
