// Auto-generated from backend entities

export type AmlAlertStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'DISMISSED'
  | 'FILED_STR'
  | 'CLOSED';

export type AmlRuleCategory =
  | 'STRUCTURING'
  | 'VELOCITY'
  | 'THRESHOLD'
  | 'BEHAVIORAL'
  | 'GEOGRAPHIC'
  | 'PEP'
  | 'OTHER';

export interface Customer {
  id: number;
  customerNumber?: string;
  name?: string;
  segment?: string;
  riskRating?: string;
}

export interface Account {
  id: number;
  accountNumber?: string;
  type?: string;
  currency?: string;
  balance?: number;
}

export interface AmlAlert {
  id: number;
  alertRef: string;
  rule: AmlRule;
  customer: Customer;
  account: Account;
  alertType: string;
  severity: string;
  description: string;
  triggerAmount: number;
  triggerCount: number;
  triggerPeriod: string;
  triggerTransactions: string[];
  status: AmlAlertStatus;
  assignedTo: string;
  priority: string;
  resolutionNotes: string;
  resolvedBy?: string;
  resolvedAt?: string;
  sarReference: string;
  sarFiledDate: string;
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
  severity: string;
  applicableCustomerTypes: string;
  applicableChannels: string;
  isActive: boolean;
}

