// Aligned with TransactionLimit and TransactionLimitUsage entities

export type LimitType =
  | 'DAILY_DEBIT'
  | 'DAILY_CREDIT'
  | 'SINGLE_TRANSACTION'
  | 'DAILY_TRANSFER'
  | 'MONTHLY_TRANSFER'
  | 'DAILY_WITHDRAWAL'
  | 'DAILY_POS'
  | 'DAILY_ONLINE'
  | 'DAILY_INTERNATIONAL';

export type LimitScope = 'GLOBAL' | 'PRODUCT' | 'ACCOUNT' | 'CUSTOMER';

export interface TransactionLimit {
  id: number;
  limitType: LimitType;
  scope: LimitScope;
  scopeRefId: number | null;
  productCode: string | null;
  maxAmount: number;
  maxCount: number | null;
  currencyCode: string;
  appliesToChannels: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface TransactionLimitUsage {
  id: number;
  accountId: number;
  limitType: LimitType;
  usageDate: string;
  totalAmount: number;
  totalCount: number;
  currencyCode: string;
  lastUpdated: string;
}

export interface CreateLimitRequest {
  limitType: LimitType;
  scope: LimitScope;
  scopeRefId?: number;
  productCode?: string;
  maxAmount: number;
  maxCount?: number;
  currencyCode: string;
  appliesToChannels?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}
