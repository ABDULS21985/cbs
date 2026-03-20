import { apiGet, apiPost, apiUpload } from '@/lib/api';

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

interface BackendGlAccount {
  id: number;
  glCode: string;
  glName: string;
  glCategory: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE' | 'CONTINGENT';
  parentGlCode?: string | null;
  levelNumber: number;
  isHeader: boolean;
  isPostable: boolean;
  currencyCode?: string | null;
  normalBalance?: 'DEBIT' | 'CREDIT' | null;
  isActive: boolean;
}

const NORMAL_BALANCE_BY_CATEGORY: Record<CreateGlAccountRequest['category'], 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
  EXPENSE: 'DEBIT',
};

function mapGlAccount(account: BackendGlAccount): GlAccount {
  return {
    id: String(account.id),
    code: account.glCode,
    name: account.glName,
    type: account.isHeader ? 'HEADER' : 'DETAIL',
    category: account.glCategory === 'CONTINGENT' ? 'ASSET' : account.glCategory,
    currency: account.currencyCode ?? 'NGN',
    status: account.isActive ? 'ACTIVE' : 'INACTIVE',
    level: account.levelNumber,
    parentCode: account.parentGlCode ?? undefined,
  };
}

function buildTree(accounts: GlAccount[]): GlAccount[] {
  const byCode = new Map<string, GlAccount>();
  const roots: GlAccount[] = [];

  for (const account of accounts) {
    byCode.set(account.code, { ...account, children: [] });
  }

  for (const account of byCode.values()) {
    if (account.parentCode && byCode.has(account.parentCode)) {
      byCode.get(account.parentCode)!.children!.push(account);
    } else {
      roots.push(account);
    }
  }

  const sortNodes = (nodes: GlAccount[]) => {
    nodes.sort((left, right) => left.code.localeCompare(right.code));
    nodes.forEach((node) => {
      if (node.children?.length) {
        sortNodes(node.children);
      } else {
        delete node.children;
      }
    });
  };

  sortNodes(roots);
  return roots;
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
    const accounts = await apiGet<BackendGlAccount[]>('/api/v1/gl/accounts', { size: 2000 });
    return buildTree(accounts.map(mapGlAccount));
  },

  createGlAccount: async (data: CreateGlAccountRequest): Promise<GlAccount> => {
    const created = await apiPost<BackendGlAccount>('/api/v1/gl/accounts', {
      glCode: data.code,
      glName: data.name,
      glCategory: data.category,
      parentGlCode: data.parentCode || null,
      isHeader: data.type === 'HEADER',
      isPostable: data.type !== 'HEADER',
      currencyCode: data.currency,
      isActive: data.status === 'ACTIVE',
      normalBalance: NORMAL_BALANCE_BY_CATEGORY[data.category],
    });
    return mapGlAccount(created);
  },

  importChartOfAccounts: async (file: File): Promise<GlAccount[]> => {
    const imported = await apiUpload<BackendGlAccount[]>('/api/v1/gl/accounts/import', file);
    return buildTree(imported.map(mapGlAccount));
  },

  getGlBalances: async (date: string): Promise<GlBalance[]> => {
    return apiGet<GlBalance[]>('/api/v1/gl/balances', { date });
  },

  getJournalEntries: async (params: JournalSearchParams): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>('/api/v1/gl/journals', params as Record<string, unknown>);
  },

  getJournalEntry: async (id: string): Promise<JournalEntry> => {
    return apiGet<JournalEntry>(`/api/v1/gl/journals/${id}`);
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
    return apiGet<JournalEntry[]>(`/api/v1/gl/accounts/${glCode}/entries`, { dateFrom, dateTo });
  },
};
