import { apiGet, apiPost } from '@/lib/api';

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  type: 'HEADER' | 'DETAIL';
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  level: number;
  children?: GlAccount[];
  parentCode?: string;
}

export interface GlBalance {
  glCode: string;
  name: string;
  currency: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  isHeader: boolean;
  level: number;
}

export interface JournalLine {
  glCode: string;
  glName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  description: string;
  source: 'SYSTEM' | 'MANUAL';
  status: 'PENDING' | 'POSTED' | 'REVERSED';
  postedBy: string;
  postedAt: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}

export interface TrialBalanceRow {
  glCode: string;
  name: string;
  isHeader: boolean;
  level: number;
  openingDr: number;
  openingCr: number;
  periodDr: number;
  periodCr: number;
  closingDr: number;
  closingCr: number;
}

export interface SubLedgerRow {
  module: string;
  subLedgerTotal: number;
  glBalance: number;
  difference: number;
  status: 'MATCHED' | 'BREAK';
}

export interface CreateGlAccountRequest {
  code: string;
  name: string;
  type: 'HEADER' | 'DETAIL';
  parentCode?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateJournalRequest {
  date: string;
  description: string;
  lines: { glCode: string; description: string; debit: number; credit: number }[];
}

export interface JournalSearchParams {
  glCode?: string;
  dateFrom?: string;
  dateTo?: string;
  journalNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  source?: 'ALL' | 'SYSTEM' | 'MANUAL';
  status?: 'ALL' | 'PENDING' | 'POSTED' | 'REVERSED';
  page?: number;
  size?: number;
}

export interface JournalFilters {
  glCode: string;
  dateFrom: string;
  dateTo: string;
  journalNumber: string;
  minAmount: string;
  maxAmount: string;
  source: 'ALL' | 'SYSTEM' | 'MANUAL';
  status: 'ALL' | 'PENDING' | 'POSTED' | 'REVERSED';
}

export const glApi = {
  getChartOfAccounts: async (): Promise<GlAccount[]> => {
    return apiGet<GlAccount[]>('/api/v1/gl/accounts');
  },

  createGlAccount: async (data: CreateGlAccountRequest): Promise<GlAccount> => {
    return apiPost<GlAccount>('/api/v1/gl/accounts', data);
  },

  getGlBalances: async (date: string): Promise<GlBalance[]> => {
    return apiGet<GlBalance[]>('/api/v1/gl/balances', { date });
  },

  getJournalEntries: async (params: JournalSearchParams): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>('/api/v1/gl/journals', params as Record<string, unknown>);
  },

  getJournalEntry: async (id: string): Promise<JournalEntry> => {
    return apiGet<JournalEntry>(`/v1/gl/journals/${id}`);
  },

  createJournalEntry: async (data: CreateJournalRequest): Promise<JournalEntry> => {
    return apiPost<JournalEntry>('/api/v1/gl/journals', data);
  },

  getTrialBalance: async (params: { year: number; month: number }): Promise<TrialBalanceRow[]> => {
    return apiGet<TrialBalanceRow[]>('/api/v1/gl/trial-balance', params as Record<string, unknown>);
  },

  getSubLedgerReconciliation: async (date: string): Promise<SubLedgerRow[]> => {
    return apiGet<SubLedgerRow[]>('/api/v1/gl/reconciliation', { date });
  },

  getDrillDown: async (glCode: string, dateFrom: string, dateTo: string): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>(`/v1/gl/accounts/${glCode}/entries`, { dateFrom, dateTo });
  },
};
