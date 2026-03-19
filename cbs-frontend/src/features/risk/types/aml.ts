export type AlertType =
  | 'UNUSUAL_ACTIVITY'
  | 'STRUCTURING'
  | 'RAPID_MOVEMENT'
  | 'HIGH_RISK_JURISDICTION'
  | 'ROUND_TRIPPING'
  | 'DORMANT_REACTIVATION'
  | 'PEP_TRANSACTION'
  | 'THRESHOLD_BREACH';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'DISMISSED'
  | 'FILED_STR'
  | 'CLOSED';

export interface AmlAlert {
  id: number;
  alertNumber: string;
  date: string;
  customerId: number;
  customerName: string;
  customerNumber: string;
  alertType: AlertType;
  riskScore: number;     // 0-100
  amount: number;
  currency: string;
  rule: string;
  priority: AlertPriority;
  assignedTo?: string;
  ageDays: number;
  slaDays: number;       // SLA in days
  status: AlertStatus;
}

export interface AmlStats {
  openAlerts: number;
  highPriority: number;
  underInvestigation: number;
  strFiledMtd: number;
  avgResolutionDays: number;
}

export interface StrReport {
  id: number;
  strNumber: string;
  customerId: number;
  customerName: string;
  filingDate: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'FILED_WITH_NFIU' | 'ACKNOWLEDGED';
  nfiuReference?: string;
  filingOfficer: string;
  description: string;
}

export interface AmlRule {
  id: number;
  ruleNumber: string;
  name: string;
  type: string;
  threshold: string;
  lookbackPeriod: string;
  riskWeight: number;
  active: boolean;
}

export interface CtrReport {
  id: number;
  reportDate: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  currency: string;
  transactionCount: number;
  status: string;
}

export interface AmlTransaction {
  id: number;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  description: string;
  counterparty?: string;
  flagged?: boolean;
  accountNumber?: string;
  channel?: string;
}

export interface AmlCustomerProfile {
  id: number;
  customerNumber: string;
  name: string;
  segment: string;
  pepFlag: boolean;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  kycStatus: 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'FAILED';
  accounts: { accountNumber: string; type: string; balance: number; currency: string }[];
}

export interface AmlRuleCondition {
  field: string;
  operator: string;
  value: string;
}
