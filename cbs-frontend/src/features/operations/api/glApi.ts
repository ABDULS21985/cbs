import { apiGet, apiPost, apiUpload } from '@/lib/api';

/* ─── Frontend display types ─── */

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
  id: number;
  glCode: string;
  branchCode: string;
  currencyCode: string;
  balanceDate: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  transactionCount: number;
}

/**
 * Maps to com.cbs.gl.entity.JournalLine (Jackson-serialized).
 */
export interface JournalLine {
  id: number;
  lineNumber: number;
  glCode: string;
  debitAmount: number;
  creditAmount: number;
  currencyCode: string;
  localDebit: number;
  localCredit: number;
  fxRate: number;
  narration?: string | null;
  costCentre?: string | null;
  branchCode?: string | null;
  accountId?: number | null;
  customerId?: number | null;
}

/**
 * Maps to com.cbs.gl.entity.JournalEntry (Jackson-serialized).
 */
export interface JournalEntry {
  id: number;
  journalNumber: string;
  journalType: string;
  description: string;
  sourceModule?: string | null;
  sourceRef?: string | null;
  valueDate: string;
  postingDate: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  approvedBy?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  reversalJournalId?: number | null;
  createdAt: string;
  lines: JournalLine[];
}

export interface TrialBalanceRow {
  id: number;
  glCode: string;
  branchCode: string;
  currencyCode: string;
  balanceDate: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  transactionCount: number;
}

/**
 * Maps to com.cbs.gl.entity.SubledgerReconRun (Jackson-serialized).
 */
export interface SubLedgerRow {
  id: number;
  reconDate: string;
  subledgerType: string;
  glCode: string;
  branchCode: string;
  currencyCode: string;
  glBalance: number;
  subledgerBalance: number;
  difference: number;
  balanced: boolean;
  exceptionCount: number;
  status: string;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

/* ─── Request types ─── */

export interface CreateGlAccountRequest {
  code: string;
  name: string;
  type: 'HEADER' | 'DETAIL';
  parentCode?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Maps to com.cbs.gl.dto.PostJournalRequest (backend DTO).
 */
export interface CreateJournalRequest {
  journalType: string;
  description: string;
  sourceModule?: string;
  sourceRef?: string;
  valueDate: string;
  lines: CreateJournalLineRequest[];
}

export interface CreateJournalLineRequest {
  glCode: string;
  debitAmount: number;
  creditAmount: number;
  currencyCode?: string;
  fxRate?: number;
  narration?: string;
  costCentre?: string;
  branchCode?: string;
  accountId?: number;
  customerId?: number;
}

/* ─── Backend GL account shape (for mapping) ─── */

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

/* ─── Search params ─── */

export interface JournalSearchParams {
  from?: string;
  to?: string;
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

/* ─── API ─── */

export const glApi = {
  /**
   * GET /v1/gl/accounts?size=2000
   * Returns flat list of BackendGlAccount, mapped and tree-built.
   */
  getChartOfAccounts: async (): Promise<GlAccount[]> => {
    const accounts = await apiGet<BackendGlAccount[]>('/api/v1/gl/accounts', { size: 2000 });
    return buildTree(accounts.map(mapGlAccount));
  },

  /**
   * POST /v1/gl/accounts
   * Sends ChartOfAccounts entity shape.
   */
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

  /**
   * POST /v1/gl/accounts/import (multipart)
   */
  importChartOfAccounts: async (file: File): Promise<GlAccount[]> => {
    const imported = await apiUpload<BackendGlAccount[]>('/api/v1/gl/accounts/import', file);
    return buildTree(imported.map(mapGlAccount));
  },

  /**
   * GET /v1/gl/balances — returns today's balances.
   * The backend /v1/gl/balances endpoint takes no params.
   */
  getGlBalances: async (): Promise<GlBalance[]> => {
    return apiGet<GlBalance[]>('/api/v1/gl/balances');
  },

  /**
   * GET /v1/gl/journals?from=...&to=...&page=...&size=...
   * Backend expects `from` and `to` as LocalDate params.
   */
  getJournalEntries: async (params: JournalSearchParams): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>('/api/v1/gl/journals', params as Record<string, unknown>);
  },

  /**
   * GET /v1/gl/journals/{id}
   */
  getJournalEntry: async (id: number | string): Promise<JournalEntry> => {
    return apiGet<JournalEntry>(`/api/v1/gl/journals/${id}`);
  },

  /**
   * POST /v1/gl/journals
   * Backend expects PostJournalRequest with journalType, description, sourceModule, sourceRef, valueDate, lines.
   */
  createJournalEntry: async (data: CreateJournalRequest): Promise<JournalEntry> => {
    return apiPost<JournalEntry>('/api/v1/gl/journals', data);
  },

  /**
   * POST /v1/gl/journals/{id}/reverse
   */
  reverseJournal: async (id: number | string): Promise<JournalEntry> => {
    return apiPost<JournalEntry>(`/api/v1/gl/journals/${id}/reverse`);
  },

  /**
   * GET /v1/gl/trial-balance/{date}
   * Backend expects a path param LocalDate, returns List<GlBalance>.
   */
  getTrialBalance: async (date: string): Promise<TrialBalanceRow[]> => {
    return apiGet<TrialBalanceRow[]>(`/api/v1/gl/trial-balance/${date}`);
  },

  /**
   * GET /v1/gl/reconciliation/{date}
   * Returns List<SubledgerReconRun> for a specific date.
   */
  getSubLedgerReconciliation: async (date: string): Promise<SubLedgerRow[]> => {
    return apiGet<SubLedgerRow[]>(`/api/v1/gl/reconciliation/${date}`);
  },

  /**
   * POST /v1/gl/reconciliation
   * Runs a sub-ledger reconciliation (requires params).
   */
  runReconciliation: async (params: {
    subledgerType: string;
    glCode: string;
    reconDate: string;
    branchCode?: string;
    currencyCode?: string;
  }): Promise<SubLedgerRow> => {
    return apiPost<SubLedgerRow>(
      `/api/v1/gl/reconciliation?subledgerType=${params.subledgerType}&glCode=${params.glCode}&reconDate=${params.reconDate}${params.branchCode ? `&branchCode=${params.branchCode}` : ''}${params.currencyCode ? `&currencyCode=${params.currencyCode}` : ''}`,
    );
  },

  /**
   * GET /v1/gl/accounts/{glCode}/entries?dateFrom=...&dateTo=...
   * Returns journal entries containing lines for a specific GL code.
   */
  getDrillDown: async (glCode: string, dateFrom: string, dateTo: string): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>(`/api/v1/gl/accounts/${glCode}/entries`, { dateFrom, dateTo });
  },
};
