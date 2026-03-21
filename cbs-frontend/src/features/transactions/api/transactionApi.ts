import { apiGet, apiPost } from '@/lib/api';
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
  channel?: 'ALL' | 'BRANCH' | 'MOBILE' | 'WEB' | 'ATM' | 'POS' | 'USSD' | 'AGENT';
  status?: 'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED';
  page?: number;
  pageSize?: number;
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

export interface Transaction {
  id: string;
  reference: string;
  type: string;
  channel: string;
  status: string;
  dateTime: string;
  valueDate: string;
  postingDate: string;
  accountNumber?: string;
  currencyCode?: string;
  runningBalance?: number;
  fromAccount?: string;
  fromAccountName?: string;
  toAccount?: string;
  toAccountName?: string;
  debitAmount?: number;
  creditAmount?: number;
  fee?: number;
  narration: string;
  description: string;
  glEntries?: GLEntry[];
}

export interface TransactionSearchResult {
  transactions: Transaction[];
  summary: TransactionSummary;
}

export const transactionApi = {
  searchTransactions: async (params: TransactionSearchParams): Promise<TransactionSearchResult> => {
    const cleanParams: Record<string, unknown> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'ALL') cleanParams[k] = v;
    });
    const result = await api.get('/api/v1/transactions', { params: cleanParams });
    return result.data.data;
  },

  getTransaction: async (id: string): Promise<Transaction> => {
    return apiGet<Transaction>(`/api/v1/transactions/${id}`);
  },

  reverseTransaction: async (id: string, reason: string): Promise<{ message: string }> => {
    return apiPost<{ message: string }>(`/api/v1/transactions/${id}/reverse`, { reason });
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
};
