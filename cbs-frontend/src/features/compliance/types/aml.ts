export type AmlAlertStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'SAR_FILED'
  | 'FALSE_POSITIVE'
  | 'CLOSED'
  | 'ARCHIVED';

export type AmlRuleCategory =
  | 'STRUCTURING'
  | 'VELOCITY'
  | 'LARGE_CASH'
  | 'ROUND_AMOUNT'
  | 'HIGH_RISK_COUNTRY'
  | 'PEP'
  | 'DORMANT_REACTIVATION'
  | 'UNUSUAL_PATTERN'
  | 'LAYERING'
  | 'RAPID_MOVEMENT'
  | 'CUSTOM';

export type AmlSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AmlAlert {
  id: number;
  alertRef: string;
  ruleId: number;
  ruleName: string;
  ruleCategory: AmlRuleCategory;
  customerId: number;
  customerName: string;
  accountId: number;
  alertType: string;
  severity: AmlSeverity;
  description: string;
  triggerAmount: number;
  triggerCount: number;
  triggerPeriod: string;
  triggerTransactions: string[];
  status: AmlAlertStatus;
  assignedTo: string | null;
  priority: AmlSeverity;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  sarReference: string | null;
  sarFiledDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AmlRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleCategory: AmlRuleCategory;
  description: string;
  thresholdAmount: number;
  thresholdCount: number;
  thresholdPeriodHours: number;
  currencyCode: string;
  ruleConfig: Record<string, unknown>;
  severity: AmlSeverity;
  applicableCustomerTypes: string[];
  applicableChannels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AmlDashboard {
  newAlerts: number;
  underReview: number;
  escalated: number;
  sarFiled: number;
}

export interface AmlStats {
  totalAlerts: number;
  byStatus: Record<AmlAlertStatus, number>;
  bySeverity: Record<string, number>;
}

export type CreateAmlRulePayload = Omit<AmlRule, 'id' | 'ruleCode' | 'isActive' | 'createdAt' | 'updatedAt'>;

export interface FileStrPayload {
  customerId: number;
  accountId?: number;
  transactionRef?: string;
  suspiciousActivity: string;
  amount?: number;
  reportingOfficer: string;
}
