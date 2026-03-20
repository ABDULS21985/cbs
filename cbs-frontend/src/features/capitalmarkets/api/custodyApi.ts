import { apiGet, apiPost } from '@/lib/api';

export type CustodyAccountType = 'SECURITIES' | 'DERIVATIVES' | 'MIXED';
export type CustodyAccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CustodyAccount {
  id: number;
  code: string;
  customerName: string;
  customerId: string;
  accountType: CustodyAccountType;
  baseCurrency: string;
  custodian: string;
  totalAssets: number;
  securitiesCount: number;
  status: CustodyAccountStatus;
  openedAt: string;
  holdings: CustodyHolding[];
  corporateActions: CorporateAction[];
  incomeReceived: IncomeRecord[];
  feeSchedule: FeeScheduleItem[];
}

export interface CustodyHolding {
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  quantity: number;
  marketValue: number;
  currency: string;
  lastPriced: string;
}

export interface CorporateAction {
  id: number;
  instrumentCode: string;
  actionType: string;
  exDate: string;
  recordDate: string;
  paymentDate: string;
  description: string;
  status: 'PENDING' | 'PROCESSED' | 'CANCELLED';
}

export interface IncomeRecord {
  id: number;
  instrumentCode: string;
  incomeType: 'DIVIDEND' | 'COUPON' | 'OTHER';
  amount: number;
  currency: string;
  paymentDate: string;
  status: 'PENDING' | 'RECEIVED';
}

export interface FeeScheduleItem {
  feeType: string;
  rate: number;
  frequency: string;
  lastCharged?: string;
}

export const cmCustodyApi = {
  getAccounts: () =>
    apiGet<CustodyAccount[]>('/api/v1/custody'),

  openAccount: (payload: {
    customerId: string;
    accountType: CustodyAccountType;
    baseCurrency: string;
    custodian: string;
  }) => apiPost<CustodyAccount>('/api/v1/custody', payload),

  getAccount: (code: string) =>
    apiGet<CustodyAccount>(`/api/v1/custody/${code}`),

  getCustomerAccounts: (customerId: string) =>
    apiGet<CustodyAccount[]>(`/api/v1/custody/customer/${customerId}`),
};
