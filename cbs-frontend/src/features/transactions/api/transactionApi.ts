import { apiPost } from '@/lib/api';
import api from '@/lib/api';

export interface TransactionSearchParams {
  search?: string;
  accountNumber?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  type?: 'ALL' | 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'PAYMENT' | 'FEE' | 'INTEREST' | 'REVERSAL';
  channel?: 'ALL' | 'BRANCH' | 'MOBILE' | 'WEB' | 'ATM' | 'POS' | 'USSD' | 'AGENT' | 'PORTAL' | 'SYSTEM' | 'API';
  status?: 'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED';
  flaggedOnly?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface TransactionSummary {
  totalResults: number;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
}

export interface GLEntry {
  type: 'DR' | 'CR';
  account: string;
  amount: number;
  description: string;
}

export interface TransactionAmlFlag {
  alertRef: string;
  caseRef: string;
  description: string;
  score: number;
  flaggedAt: string;
}

export interface TransactionAuditTrailEvent {
  id?: number;
  eventType: string;
  actor?: string | null;
  channel?: string | null;
  timestamp: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionDisputeSummary {
  id: number;
  disputeRef: string;
  reasonCode: string;
  status: string;
  filedAt: string;
  lastUpdatedAt: string;
}

export interface ReversalRequest {
  reasonCategory: string;
  subReason?: string;
  notes?: string;
  requestedSettlement?: 'IMMEDIATE' | 'NEXT_BUSINESS_DAY';
}

export interface ReversalPreview {
  transactionId: number;
  transactionRef: string;
  originalAmount: number;
  originalAccountNumber: string;
  originalDirection: string;
  reversalDirection: string;
  customerAccountNumber: string;
  counterpartyAccountNumber?: string;
  glDebitAccount: string;
  glCreditAccount: string;
  settlementTiming: string;
  dualAuthorizationRequired: boolean;
}

export interface ReversalResult {
  requestRef: string;
  status: string;
  reversalRef?: string;
  approvalRequired: boolean;
  approvalRequestCode?: string;
  adviceDownloadUrl?: string;
  message: string;
}

export interface StatementRequest {
  accountNumber: string;
  fromDate: string;
  toDate: string;
  format?: string;
  emailToHolder?: boolean;
  emailAddress?: string;
}

export interface StatementDelivery {
  status: string;
  accountNumber: string;
  emailAddress: string;
  generatedAt: string;
  message: string;
}

export interface ReversalListItem {
  id: number;
  requestRef: string;
  transactionId: number;
  transactionRef: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currencyCode: string;
  reasonCategory: string;
  subReason?: string;
  notes?: string;
  requestedSettlement: string;
  status: 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED' | string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  reversalRef?: string;
  approvalRequestCode?: string;
  adviceDownloadUrl?: string;
}

export interface ReversalCounts {
  pendingApproval: number;
  completed: number;
  rejected: number;
}

export interface Transaction {
  id: string;
  transactionRef?: string;
  reference: string;
  transactionType?: string;
  type: string;
  channel: string;
  status: string;
  dateTime: string;
  valueDate: string;
  postingDate: string;
  accountNumber?: string;
  currencyCode?: string;
  amount?: number;
  runningBalance?: number;
  contraAccountNumber?: string;
  externalRef?: string;
  fromAccount?: string;
  fromAccountName?: string;
  toAccount?: string;
  toAccountName?: string;
  debitAmount?: number;
  creditAmount?: number;
  fee?: number;
  narration: string;
  description: string;
  isReversed?: boolean;
  createdAt?: string;
  createdBy?: string;
  glEntries?: GLEntry[];
  amlFlagged?: boolean;
  amlFlag?: TransactionAmlFlag | null;
  auditTrail?: TransactionAuditTrailEvent[];
  latestDispute?: TransactionDisputeSummary | null;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface TransactionSearchResult {
  transactions: Transaction[];
  summary: TransactionSummary;
  page?: PageMeta;
}

interface RequestOptions {
  signal?: AbortSignal;
}

export const transactionApi = {
  searchTransactions: async (
    params: TransactionSearchParams,
    options?: RequestOptions,
  ): Promise<TransactionSearchResult> => {
    const cleanParams: Record<string, unknown> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === 'boolean') {
        if (v) cleanParams[k] = v;
        return;
      }
      if (v !== undefined && v !== '' && v !== 'ALL') cleanParams[k] = v;
    });
    const result = await api.get('/api/v1/transactions', {
      params: cleanParams,
      signal: options?.signal,
    });
    return result.data.data;
  },

  getTransaction: async (id: string, options?: RequestOptions): Promise<Transaction> => {
    const { data } = await api.get(`/api/v1/transactions/${id}`, { signal: options?.signal });
    return data.data;
  },

  previewReversal: async (id: string, body: ReversalRequest): Promise<ReversalPreview> => {
    return apiPost<ReversalPreview>(`/api/v1/transactions/${id}/reversal/preview`, body);
  },

  reverseTransaction: async (id: string, body: ReversalRequest): Promise<ReversalResult> => {
    return apiPost<ReversalResult>(`/api/v1/transactions/${id}/reverse`, body);
  },

  approveReversal: async (id: number): Promise<ReversalResult> => {
    return apiPost<ReversalResult>(`/api/v1/transactions/reversals/${id}/approve`, {});
  },

  rejectReversal: async (id: number, reason?: string): Promise<ReversalResult> => {
    return apiPost<ReversalResult>(`/api/v1/transactions/reversals/${id}/reject`, { reason });
  },

  downloadReceipt: async (id: string): Promise<void> => {
    const response = await api.get(`/api/v1/transactions/${id}/receipt`, { responseType: 'blob' });
    const contentType = String(response.headers['content-type'] ?? 'application/octet-stream');
    const contentDisposition = String(response.headers['content-disposition'] ?? '');
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const fallbackName = contentType.includes('text/html') ? `receipt-${id}.html` : `receipt-${id}.pdf`;
    const filename = filenameMatch?.[1] ?? fallbackName;

    const blob = new Blob([response.data], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  downloadReversalAdvice: async (url: string): Promise<void> => {
    const response = await api.get(url, { responseType: 'blob' });
    const contentDisposition = String(response.headers['content-disposition'] ?? '');
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] ?? 'reversal-advice.html';
    const blob = new Blob([response.data], { type: String(response.headers['content-type'] ?? 'text/html') });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  downloadStatement: async (request: StatementRequest): Promise<void> => {
    const response = await api.post('/api/v1/transactions/statement', request, { responseType: 'blob' });
    const contentDisposition = String(response.headers['content-disposition'] ?? '');
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] ?? `statement-${request.accountNumber}.html`;
    const blob = new Blob([response.data], { type: String(response.headers['content-type'] ?? 'text/html') });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  emailStatement: async (request: StatementRequest): Promise<StatementDelivery> => {
    return apiPost<StatementDelivery>('/api/v1/transactions/statement/email', request);
  },

  listReversals: async (params?: { status?: string; mine?: boolean; page?: number; size?: number }): Promise<{ content: ReversalListItem[]; totalElements?: number }> => {
    const { data } = await api.get('/api/v1/transactions/reversals', { params });
    return {
      content: data.data as ReversalListItem[],
      totalElements: data.page?.totalElements as number | undefined,
    };
  },

  getReversal: async (id: number): Promise<ReversalListItem> => {
    const { data } = await api.get(`/api/v1/transactions/reversals/${id}`);
    return data.data as ReversalListItem;
  },

  getReversalCounts: async (): Promise<ReversalCounts> => {
    const { data } = await api.get('/api/v1/transactions/reversals/counts');
    return data.data as ReversalCounts;
  },
};
