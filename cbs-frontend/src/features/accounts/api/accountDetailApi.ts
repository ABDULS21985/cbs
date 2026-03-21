import { apiGet, apiPost } from '@/lib/api';

export interface Account {
  id: string;
  accountNumber: string;
  accountTitle: string;
  productType: string;
  productName: string;
  currency: string;
  status: string;
  availableBalance: number;
  ledgerBalance: number;
  holdAmount: number;
  branchCode: string;
  openedDate: string;
  relationshipManager: string;
  customerId: string;
  customerName: string;
  signatories?: { name: string; role: string }[];
  interestRate: number;
  accruedInterest: number;
  statementFrequency: string;
  lastInterestCalcDate?: string;
  lastInterestPostDate?: string;
}

export interface Transaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  channel: string;
  currency: string;
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

interface BackendSignatory {
  customerDisplayName?: string | null;
  signatoryType?: string | null;
}

interface BackendAccount {
  id: number;
  accountNumber: string;
  accountName?: string | null;
  productName?: string | null;
  productCategory?: string | null;
  currency?: string | null;
  branchCode?: string | null;
  relationshipManager?: string | null;
  customerId?: number | null;
  customerDisplayName?: string | null;
  status?: string | null;
  availableBalance?: number | null;
  ledgerBalance?: number | null;
  lienAmount?: number | null;
  openedDate?: string | null;
  signatories?: BackendSignatory[] | null;
  applicableInterestRate?: number | null;
  accruedInterest?: number | null;
  statementFrequency?: string | null;
  lastInterestCalcDate?: string | null;
  lastInterestPostDate?: string | null;
}

interface BackendTransaction {
  id: number;
  transactionRef: string;
  transactionType?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  runningBalance?: number | null;
  narration?: string | null;
  valueDate?: string | null;
  postingDate?: string | null;
  channel?: string | null;
  status?: string | null;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mapProductType(productCategory?: string | null, currency?: string | null): string {
  if (!productCategory) {
    return currency && currency !== 'NGN' ? 'DOMICILIARY' : 'SAVINGS';
  }

  if (productCategory === 'NOSTRO' || productCategory === 'VOSTRO' || (currency && currency !== 'NGN')) {
    return 'DOMICILIARY';
  }

  return productCategory;
}

function mapAccount(account: BackendAccount): Account {
  return {
    id: String(account.id),
    accountNumber: account.accountNumber,
    accountTitle: account.accountName ?? account.accountNumber,
    productType: mapProductType(account.productCategory, account.currency),
    productName: account.productName ?? 'Account product',
    currency: account.currency ?? 'NGN',
    status: account.status ?? 'ACTIVE',
    availableBalance: toNumber(account.availableBalance),
    ledgerBalance: toNumber(account.ledgerBalance),
    holdAmount: toNumber(account.lienAmount),
    branchCode: account.branchCode ?? 'N/A',
    openedDate: account.openedDate ?? '',
    relationshipManager: account.relationshipManager ?? 'Unassigned',
    customerId: account.customerId ? String(account.customerId) : 'N/A',
    customerName: account.customerDisplayName ?? 'Unknown customer',
    signatories: (account.signatories ?? []).map((signatory) => ({
      name: signatory.customerDisplayName ?? 'Unknown signatory',
      role: signatory.signatoryType ?? 'AUTHORISED',
    })),
    interestRate: toNumber(account.applicableInterestRate),
    accruedInterest: toNumber(account.accruedInterest),
    statementFrequency: account.statementFrequency ?? 'MONTHLY',
    lastInterestCalcDate: account.lastInterestCalcDate ?? undefined,
    lastInterestPostDate: account.lastInterestPostDate ?? undefined,
  };
}

function isDebitTransaction(transactionType?: string | null): boolean {
  return ['DEBIT', 'FEE_DEBIT', 'TRANSFER_OUT', 'LIEN_PLACEMENT'].includes(transactionType ?? '');
}

function mapTransaction(transaction: BackendTransaction): Transaction {
  const amount = toNumber(transaction.amount);
  const debit = isDebitTransaction(transaction.transactionType) ? amount : undefined;
  const credit = !isDebitTransaction(transaction.transactionType) ? amount : undefined;

  return {
    id: String(transaction.id),
    date: transaction.postingDate ?? transaction.valueDate ?? '',
    reference: transaction.transactionRef,
    description: transaction.narration ?? transaction.transactionType ?? 'Account transaction',
    channel: transaction.channel ?? 'SYSTEM',
    currency: transaction.currencyCode ?? 'NGN',
    debitAmount: debit,
    creditAmount: credit,
    runningBalance: toNumber(transaction.runningBalance),
    status: transaction.status ?? 'POSTED',
    narration: transaction.narration ?? '',
    valueDate: transaction.valueDate ?? transaction.postingDate ?? '',
  };
}

function matchesFilters(transaction: Transaction, params: TransactionQueryParams): boolean {
  const amount = transaction.debitAmount ?? transaction.creditAmount ?? 0;
  const search = params.search?.trim().toLowerCase();

  if (params.type === 'DEBIT' && !transaction.debitAmount) {
    return false;
  }

  if (params.type === 'CREDIT' && !transaction.creditAmount) {
    return false;
  }

  if (params.minAmount !== undefined && amount < params.minAmount) {
    return false;
  }

  if (params.maxAmount !== undefined && amount > params.maxAmount) {
    return false;
  }

  if (search) {
    const haystack = [
      transaction.reference,
      transaction.description,
      transaction.narration,
      transaction.channel,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  return true;
}

export const accountDetailApi = {
  getAccount: async (id: string): Promise<Account> => {
    const account = await apiGet<BackendAccount>(`/api/v1/accounts/${id}`);
    return mapAccount(account);
  },

  getTransactions: async (accountId: string, params: TransactionQueryParams): Promise<Transaction[]> => {
    const transactions = await apiGet<BackendTransaction[]>(`/api/v1/accounts/${accountId}/transactions`, {
      from: params.dateFrom,
      to: params.dateTo,
      page: params.page ?? 0,
      size: params.size ?? 100,
    });

    return transactions.map(mapTransaction).filter((transaction) => matchesFilters(transaction, params));
  },

  getInterestHistory: async (accountId: string): Promise<InterestHistory[]> => {
    return apiGet<InterestHistory[]>(`/api/v1/accounts/${accountId}/interest-history`);
  },

  getHolds: async (accountId: string): Promise<Hold[]> => {
    return apiGet<Hold[]>(`/api/v1/accounts/${accountId}/holds`);
  },

  releaseHold: async (accountId: string, holdId: string, reason: string): Promise<void> => {
    await apiPost<void>(`/api/v1/accounts/${accountId}/holds/${holdId}/release`, { reason });
  },

  getLinkedProducts: async (accountId: string): Promise<LinkedProducts> => {
    return apiGet<LinkedProducts>(`/api/v1/accounts/${accountId}/linked-products`);
  },

  // ── Transaction Posting ─────────────────────────────────────────────────
  postDebit: (data: { accountNumber: string; amount: number; narration: string; channel?: string; externalRef?: string }) =>
    apiPost<Record<string, unknown>>('/api/v1/accounts/transactions/debit', {
      accountNumber: data.accountNumber, transactionType: 'DEBIT', amount: data.amount,
      narration: data.narration, channel: data.channel || 'BRANCH', externalRef: data.externalRef,
    }),

  postCredit: (data: { accountNumber: string; amount: number; narration: string; channel?: string; externalRef?: string }) =>
    apiPost<Record<string, unknown>>('/api/v1/accounts/transactions/credit', {
      accountNumber: data.accountNumber, transactionType: 'CREDIT', amount: data.amount,
      narration: data.narration, channel: data.channel || 'BRANCH', externalRef: data.externalRef,
    }),

  postTransfer: (data: { fromAccountNumber: string; toAccountNumber: string; amount: number; narration: string }) =>
    apiPost<Record<string, unknown>>('/api/v1/accounts/transactions/transfer', {
      accountNumber: data.fromAccountNumber, contraAccountNumber: data.toAccountNumber,
      transactionType: 'TRANSFER_OUT', amount: data.amount, narration: data.narration, channel: 'BRANCH',
    }),

  // ── Interest Operations ─────────────────────────────────────────────────
  accrueInterest: (accountId: string) =>
    apiPost<Record<string, unknown>>(`/api/v1/accounts/${accountId}/interest/accrue`),

  postInterest: (accountId: string) =>
    apiPost<Record<string, unknown>>(`/api/v1/accounts/${accountId}/interest/post`),

  batchAccrueInterest: (productCode?: string) =>
    apiPost<Record<string, unknown>>('/api/v1/accounts/interest/batch-accrue', undefined),

  // ── Products ────────────────────────────────────────────────────────────
  getProducts: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/accounts/products'),

  getProduct: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/accounts/products/${code}`),

  getProductsByCategory: (category: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/accounts/products/category/${category}`),

  // ── Dashboard ───────────────────────────────────────────────────────────
  getSummary: () =>
    apiGet<Record<string, unknown>>('/api/v1/accounts/summary'),

  // ── Transaction Search (cross-account) ──────────────────────────────────
  searchTransactions: (params: Record<string, unknown>) =>
    apiGet<Record<string, unknown>[]>('/api/v1/transactions', params),

  reverseTransaction: (transactionId: number) =>
    apiPost<Record<string, unknown>>(`/api/v1/transactions/${transactionId}/reverse`),
};
