export type FraudAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FraudAlertStatus = 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED' | 'ALLOWED';

export interface FraudAlert {
  id: number;
  alertNumber: string;
  severity: FraudAlertSeverity;
  type: string;
  customerId: number;
  customerName: string;
  maskedPan?: string;
  amount: number;
  merchantName?: string;
  location?: string;
  score: number;
  rules: string[];
  createdAt: string;
  status: FraudAlertStatus;
  currency: string;
}

export interface FraudStats {
  activeAlerts: number;
  confirmedFraudMtd: number;
  preventedMtd: number;
  lossMtd: number;
  detectionRate: number;
}

export interface FraudTrendPoint {
  date: string;
  alertCount: number;
  confirmedAmount: number;
  falsePositiveRate: number;
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
  rule: string;
  description: string;
  type: 'RULE' | 'ML_MODEL';
  alertsMtd: number;
  truePositiveRate: number;
  active: boolean;
}

export interface ModelPerformance {
  modelName: string;
  version: string;
  aucRoc: number;
  precision: number;
  recall: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  lastTrained: string;
}
