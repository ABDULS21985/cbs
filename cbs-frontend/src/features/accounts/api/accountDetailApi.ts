import { apiGet, apiPost } from '@/lib/api';

export interface Account {
  id: string;
  accountNumber: string;
  accountTitle: string;
  productType: 'SAVINGS' | 'CURRENT' | 'DOMICILIARY';
  productName: string;
  currency: string;
  status: 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'CLOSED';
  availableBalance: number;
  ledgerBalance: number;
  holdAmount: number;
  branchName: string;
  openedDate: string;
  accountOfficer: string;
  customerId: string;
  customerName: string;
  signatories?: { name: string; role: string }[];
  interestRate: number;
  accrualMethod: string;
  nextPostingDate: string;
}

export interface Transaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  channel: string;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
  status: string;
  narration: string;
  valueDate: string;
}

export interface Hold {
  id: string;
  reference: string;
  amount: number;
  reason: string;
  placedBy: string;
  dateCreated: string;
  releaseDate?: string;
  status: string;
}

export interface LinkedProducts {
  debitCard?: { maskedPan: string; status: string; expiryDate: string };
  standingOrders: { id: string; beneficiary: string; amount: number; frequency: string; nextExecution: string }[];
  directDebits: { id: string; merchant: string; limit: number; authorized: boolean }[];
  overdraftFacility?: { limit: number; utilized: number; expiryDate: string };
}

export interface InterestHistory {
  id: string;
  postingDate: string;
  periodStart: string;
  periodEnd: string;
  rate: number;
  amount: number;
  days: number;
}

export interface TransactionQueryParams {
  dateFrom?: string;
  dateTo?: string;
  type?: 'ALL' | 'CREDIT' | 'DEBIT';
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  size?: number;
}

export const accountDetailApi = {
  getAccount: async (id: string): Promise<Account> => {
    return apiGet<Account>(`/v1/accounts/${id}`);
  },

  getTransactions: async (accountId: string, params: TransactionQueryParams): Promise<Transaction[]> => {
    return apiGet<Transaction[]>(`/v1/accounts/${accountId}/transactions`, params as Record<string, unknown>);
  },

  getInterestHistory: async (accountId: string): Promise<InterestHistory[]> => {
    return apiGet<InterestHistory[]>(`/v1/accounts/${accountId}/interest-history`);
  },

  getHolds: async (accountId: string): Promise<Hold[]> => {
    return apiGet<Hold[]>(`/v1/accounts/${accountId}/holds`);
  },

  releaseHold: async (accountId: string, holdId: string, reason: string): Promise<void> => {
    await apiPost<void>(`/v1/accounts/${accountId}/holds/${holdId}/release`, { reason });
  },

  getLinkedProducts: async (accountId: string): Promise<LinkedProducts> => {
    return apiGet<LinkedProducts>(`/v1/accounts/${accountId}/linked-products`);
  },
};
