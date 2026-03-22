import { apiGet, apiPost, apiPostParams } from '@/lib/api';

export interface ChequeLeaf {
  leafNumber: number;
  status: 'AVAILABLE' | 'ISSUED' | 'PRESENTED' | 'CLEARED' | 'STOPPED' | 'RETURNED' | 'VOID';
  accountId?: string;
  issuedDate?: string;
  presentedDate?: string;
  clearedDate?: string;
  amount?: number;
  payee?: string;
}

export interface ChequeBook {
  id: string;
  bookNumber: string;
  accountId: string;
  accountNumber: string;
  accountTitle: string;
  leafFrom: number;
  leafTo: number;
  totalLeaves: number;
  usedLeaves: number;
  availableLeaves: number;
  issuedDate: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CANCELLED' | 'REQUESTED';
  collectionBranch: string;
  leaves?: ChequeLeaf[];
}

export interface ClearingCheque {
  id: string;
  chequeNumber: string;
  drawerAccount: string;
  drawerName: string;
  amount: number;
  presentingBank: string;
  receivedDate: string;
  status: 'PENDING' | 'CLEARED' | 'RETURNED' | 'ON_HOLD';
  frontImageUrl?: string;
  backImageUrl?: string;
}

export interface StopPaymentRequest {
  accountId: string;
  accountNumber: string;
  chequeFrom: number;
  chequeTo?: number;
  reason: 'LOST' | 'STOLEN' | 'FRAUD' | 'DISPUTE' | 'CUSTOMER_REQUEST';
  notes?: string;
}

export interface StopPayment {
  id: string;
  reference: string;
  accountNumber: string;
  chequeFrom: number;
  chequeTo?: number;
  reason: string;
  status: string;
  createdAt: string;
  fee: number;
}

export interface ReturnedCheque {
  id: string;
  chequeNumber: string;
  drawerAccount: string;
  drawerName: string;
  amount: number;
  presentingBank: string;
  returnedDate: string;
  reasonCode: string;
  reasonDescription: string;
}

export const RETURN_REASON_CODES: { code: string; label: string }[] = [
  { code: 'R01', label: 'R01: Insufficient Funds' },
  { code: 'R02', label: 'R02: Account Closed' },
  { code: 'R03', label: 'R03: No Account/Unable to Locate' },
  { code: 'R04', label: 'R04: Invalid Account Number' },
  { code: 'R05', label: 'R05: Unauthorized' },
  { code: 'R06', label: 'R06: Returned per ODFI Request' },
  { code: 'R07', label: 'R07: Authorization Revoked' },
  { code: 'R08', label: 'R08: Payment Stopped' },
  { code: 'R09', label: 'R09: Uncollected Funds' },
  { code: 'R10', label: 'R10: Customer Advises Unauthorized' },
  { code: 'SIGN', label: 'SIGN: Signature Mismatch' },
  { code: 'STALE', label: 'STALE: Stale Cheque' },
  { code: 'ALTD', label: 'ALTD: Alteration Detected' },
];

export const chequeApi = {
  getChequeBooks: (params?: Record<string, unknown>): Promise<ChequeBook[]> =>
    apiGet<ChequeBook[]>('/api/v1/cheques/books', params),

  getChequeBook: (id: string): Promise<ChequeBook> =>
    apiGet<ChequeBook>(`/api/v1/cheques/books/${id}`),

  requestChequeBook: (data: {
    accountId: string;
    accountNumber: string;
    leaves: number;
    collectionBranch: string;
  }): Promise<ChequeBook> =>
    apiPost<ChequeBook>('/api/v1/cheques/books/request', data),

  getClearingQueue: (params?: Record<string, unknown>): Promise<ClearingCheque[]> =>
    apiGet<ClearingCheque[]>('/api/v1/cheques/clearing', params),

  clearCheque: (id: string): Promise<void> =>
    apiPost<void>(`/api/v1/cheques/${id}/clear`),

  returnCheque: (id: string, data: { reasonCode: string; notes?: string }): Promise<void> =>
    apiPostParams<void>(`/api/v1/cheques/${id}/return`, {
      reasonCode: data.reasonCode,
      notes: data.notes,
    }),

  holdCheque: (id: string, reason: string): Promise<void> =>
    apiPostParams<void>(`/api/v1/cheques/${id}/hold`, { reason }),

  getStopPayments: (params?: Record<string, unknown>): Promise<StopPayment[]> =>
    apiGet<StopPayment[]>('/api/v1/cheques/stop-payments', params),

  createStopPayment: (data: StopPaymentRequest): Promise<StopPayment> =>
    apiPost<StopPayment>('/api/v1/cheques/stop-payments', data),

  getReturns: (params?: Record<string, unknown>): Promise<ReturnedCheque[]> =>
    apiGet<ReturnedCheque[]>('/api/v1/cheques/returns', params),
};
