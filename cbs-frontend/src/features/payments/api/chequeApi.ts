import { apiGet, apiPost } from '@/lib/api';

export interface ChequeLeaf {
  leafNumber: number;
  status: 'AVAILABLE' | 'ISSUED' | 'PRESENTED' | 'CLEARED' | 'STOPPED' | 'RETURNED' | 'VOID';
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

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function delay(ms = 400) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function generateLeaves(from: number, to: number): ChequeLeaf[] {
  const statuses: ChequeLeaf['status'][] = ['AVAILABLE', 'ISSUED', 'PRESENTED', 'CLEARED', 'STOPPED', 'RETURNED', 'VOID'];
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const leafNumber = from + i;
    const statusIndex = i < 3 ? 3 : i < 5 ? 2 : i < 7 ? 1 : 0;
    const status = statuses[statusIndex];
    return {
      leafNumber,
      status,
      issuedDate: status !== 'AVAILABLE' ? '2025-10-01' : undefined,
      presentedDate: ['PRESENTED', 'CLEARED', 'RETURNED'].includes(status) ? '2025-11-15' : undefined,
      clearedDate: status === 'CLEARED' ? '2025-11-16' : undefined,
      amount: status !== 'AVAILABLE' ? Math.floor(Math.random() * 900_000 + 100_000) : undefined,
      payee: status !== 'AVAILABLE' ? 'Vendor Nigeria Ltd' : undefined,
    };
  });
}

const MOCK_BOOKS: ChequeBook[] = [
  {
    id: 'cb-001', bookNumber: 'CHB-2025-001', accountId: 'acc-001', accountNumber: '0012345678',
    accountTitle: 'Chukwuemeka Obi', leafFrom: 100001, leafTo: 100050, totalLeaves: 50,
    usedLeaves: 12, availableLeaves: 38, issuedDate: '2025-08-01', status: 'ACTIVE',
    collectionBranch: 'Lagos Island Branch',
  },
  {
    id: 'cb-002', bookNumber: 'CHB-2025-002', accountId: 'acc-002', accountNumber: '0023456789',
    accountTitle: 'Adaeze Nwosu', leafFrom: 200001, leafTo: 200025, totalLeaves: 25,
    usedLeaves: 25, availableLeaves: 0, issuedDate: '2025-06-15', status: 'EXHAUSTED',
    collectionBranch: 'Abuja Central Branch',
  },
  {
    id: 'cb-003', bookNumber: 'CHB-2025-003', accountId: 'acc-003', accountNumber: '0034567890',
    accountTitle: 'Emeka Eze', leafFrom: 300001, leafTo: 300100, totalLeaves: 100,
    usedLeaves: 5, availableLeaves: 95, issuedDate: '2025-09-20', status: 'ACTIVE',
    collectionBranch: 'Port Harcourt Branch',
  },
  {
    id: 'cb-004', bookNumber: 'CHB-2025-004', accountId: 'acc-004', accountNumber: '0045678901',
    accountTitle: 'Fatima Bello', leafFrom: 400001, leafTo: 400050, totalLeaves: 50,
    usedLeaves: 0, availableLeaves: 50, issuedDate: '2025-12-01', status: 'REQUESTED',
    collectionBranch: 'Kano Branch',
  },
  {
    id: 'cb-005', bookNumber: 'CHB-2024-005', accountId: 'acc-005', accountNumber: '0056789012',
    accountTitle: 'Musa Ibrahim', leafFrom: 500001, leafTo: 500025, totalLeaves: 25,
    usedLeaves: 25, availableLeaves: 0, issuedDate: '2024-05-10', status: 'CANCELLED',
    collectionBranch: 'Ibadan Branch',
  },
];

const MOCK_CLEARING: ClearingCheque[] = [
  {
    id: 'cc-001', chequeNumber: '100015', drawerAccount: '0012345678', drawerName: 'Chukwuemeka Obi',
    amount: 750_000, presentingBank: 'First Bank Nigeria', receivedDate: '2026-03-18', status: 'PENDING',
  },
  {
    id: 'cc-002', chequeNumber: '200010', drawerAccount: '0023456789', drawerName: 'Adaeze Nwosu',
    amount: 1_200_000, presentingBank: 'GTBank', receivedDate: '2026-03-18', status: 'PENDING',
  },
  {
    id: 'cc-003', chequeNumber: '300004', drawerAccount: '0034567890', drawerName: 'Emeka Eze',
    amount: 350_000, presentingBank: 'Access Bank', receivedDate: '2026-03-17', status: 'ON_HOLD',
  },
  {
    id: 'cc-004', chequeNumber: '100022', drawerAccount: '0012345678', drawerName: 'Chukwuemeka Obi',
    amount: 2_500_000, presentingBank: 'Zenith Bank', receivedDate: '2026-03-17', status: 'PENDING',
  },
  {
    id: 'cc-005', chequeNumber: '400020', drawerAccount: '0078901234', drawerName: 'Tunde Adesanya',
    amount: 500_000, presentingBank: 'UBA', receivedDate: '2026-03-16', status: 'CLEARED',
  },
];

const MOCK_STOP_PAYMENTS: StopPayment[] = [
  {
    id: 'sp-001', reference: 'STP-2026-001', accountNumber: '0012345678',
    chequeFrom: 100030, chequeTo: 100035, reason: 'STOLEN', status: 'ACTIVE',
    createdAt: '2026-03-10T09:30:00Z', fee: 1000,
  },
  {
    id: 'sp-002', reference: 'STP-2026-002', accountNumber: '0023456789',
    chequeFrom: 200018, reason: 'LOST', status: 'ACTIVE',
    createdAt: '2026-03-12T14:00:00Z', fee: 1000,
  },
  {
    id: 'sp-003', reference: 'STP-2026-003', accountNumber: '0034567890',
    chequeFrom: 300007, reason: 'FRAUD', status: 'ACTIVE',
    createdAt: '2026-03-15T11:20:00Z', fee: 1000,
  },
];

const MOCK_RETURNS: ReturnedCheque[] = [
  {
    id: 'ret-001', chequeNumber: '100008', drawerAccount: '0012345678', drawerName: 'Chukwuemeka Obi',
    amount: 450_000, presentingBank: 'First Bank Nigeria', returnedDate: '2026-03-14',
    reasonCode: 'R01', reasonDescription: 'Insufficient Funds',
  },
  {
    id: 'ret-002', chequeNumber: '200005', drawerAccount: '0023456789', drawerName: 'Adaeze Nwosu',
    amount: 900_000, presentingBank: 'GTBank', returnedDate: '2026-03-10',
    reasonCode: 'SIGN', reasonDescription: 'Signature Mismatch',
  },
  {
    id: 'ret-003', chequeNumber: '300002', drawerAccount: '0034567890', drawerName: 'Emeka Eze',
    amount: 200_000, presentingBank: 'Access Bank', returnedDate: '2026-03-05',
    reasonCode: 'STALE', reasonDescription: 'Stale Cheque',
  },
];

export const chequeApi = {
  getChequeBooks: async (params?: Record<string, unknown>): Promise<ChequeBook[]> => {
    if (DEMO_MODE) {
      await delay();
      return MOCK_BOOKS;
    }
    return apiGet<ChequeBook[]>('/v1/cheques/books', params);
  },

  getChequeBook: async (id: string): Promise<ChequeBook> => {
    if (DEMO_MODE) {
      await delay(350);
      const book = MOCK_BOOKS.find((b) => b.id === id) || MOCK_BOOKS[0];
      return { ...book, leaves: generateLeaves(book.leafFrom, Math.min(book.leafFrom + 14, book.leafTo)) };
    }
    return apiGet<ChequeBook>(`/v1/cheques/books/${id}`);
  },

  requestChequeBook: async (data: {
    accountId: string;
    accountNumber: string;
    leaves: number;
    collectionBranch: string;
  }): Promise<ChequeBook> => {
    if (DEMO_MODE) {
      await delay(600);
      const from = 900001;
      const to = from + data.leaves - 1;
      return {
        id: `cb-${Date.now()}`,
        bookNumber: `CHB-${Date.now()}`,
        accountId: data.accountId,
        accountNumber: data.accountNumber,
        accountTitle: 'Account Holder',
        leafFrom: from,
        leafTo: to,
        totalLeaves: data.leaves,
        usedLeaves: 0,
        availableLeaves: data.leaves,
        issuedDate: new Date().toISOString().split('T')[0],
        status: 'REQUESTED',
        collectionBranch: data.collectionBranch,
      };
    }
    return apiPost<ChequeBook>('/v1/cheques/books', data);
  },

  getClearingQueue: async (params?: Record<string, unknown>): Promise<ClearingCheque[]> => {
    if (DEMO_MODE) {
      await delay(400);
      return MOCK_CLEARING;
    }
    return apiGet<ClearingCheque[]>('/v1/cheques/clearing', params);
  },

  clearCheque: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(600);
      return;
    }
    return apiPost<void>(`/v1/cheques/clearing/${id}/clear`);
  },

  returnCheque: async (id: string, data: { reasonCode: string; notes?: string }): Promise<void> => {
    if (DEMO_MODE) {
      await delay(600);
      return;
    }
    return apiPost<void>(`/v1/cheques/clearing/${id}/return`, data);
  },

  holdCheque: async (id: string, reason: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(500);
      return;
    }
    return apiPost<void>(`/v1/cheques/clearing/${id}/hold`, { reason });
  },

  getStopPayments: async (params?: Record<string, unknown>): Promise<StopPayment[]> => {
    if (DEMO_MODE) {
      await delay(400);
      return MOCK_STOP_PAYMENTS;
    }
    return apiGet<StopPayment[]>('/v1/cheques/stop-payments', params);
  },

  createStopPayment: async (data: StopPaymentRequest): Promise<StopPayment> => {
    if (DEMO_MODE) {
      await delay(700);
      return {
        id: `sp-${Date.now()}`,
        reference: `STP-${Date.now()}`,
        accountNumber: data.accountNumber,
        chequeFrom: data.chequeFrom,
        chequeTo: data.chequeTo,
        reason: data.reason,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        fee: 1000,
      };
    }
    return apiPost<StopPayment>('/v1/cheques/stop-payments', data);
  },

  getReturns: async (params?: Record<string, unknown>): Promise<ReturnedCheque[]> => {
    if (DEMO_MODE) {
      await delay(400);
      return MOCK_RETURNS;
    }
    return apiGet<ReturnedCheque[]>('/v1/cheques/returns', params);
  },
};
