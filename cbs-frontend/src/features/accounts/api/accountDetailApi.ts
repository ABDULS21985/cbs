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

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ---- Mock data ----

const MOCK_ACCOUNT: Account = {
  id: 'acc-001',
  accountNumber: '0012345678',
  accountTitle: 'Chukwuemeka Obi',
  productType: 'SAVINGS',
  productName: 'Target Savings Plus',
  currency: 'NGN',
  status: 'ACTIVE',
  availableBalance: 4_872_350.50,
  ledgerBalance: 5_372_350.50,
  holdAmount: 500_000.00,
  branchName: 'Victoria Island Branch',
  openedDate: '2021-03-15',
  accountOfficer: 'Fatima Bello',
  customerId: 'cust-001',
  customerName: 'Chukwuemeka Obi',
  signatories: [
    { name: 'Chukwuemeka Obi', role: 'Sole Signatory' },
  ],
  interestRate: 4.25,
  accrualMethod: 'Daily Balance',
  nextPostingDate: '2026-03-31',
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-001',
    date: '2026-03-19T10:23:00',
    reference: 'TXN2026031900012',
    description: 'Transfer from Adaeze Nwosu',
    channel: 'NIBSS',
    creditAmount: 250_000,
    runningBalance: 4_872_350.50,
    status: 'COMPLETED',
    narration: 'Payment for consultancy services Q1',
    valueDate: '2026-03-19',
  },
  {
    id: 'txn-002',
    date: '2026-03-18T14:55:00',
    reference: 'TXN2026031800087',
    description: 'POS Purchase — Shoprite Ikeja',
    channel: 'POS',
    debitAmount: 38_500,
    runningBalance: 4_622_350.50,
    status: 'COMPLETED',
    narration: 'Retail purchase at Shoprite Ikeja City Mall',
    valueDate: '2026-03-18',
  },
  {
    id: 'txn-003',
    date: '2026-03-17T09:10:00',
    reference: 'TXN2026031700043',
    description: 'ATM Withdrawal — VI ATM 01',
    channel: 'ATM',
    debitAmount: 60_000,
    runningBalance: 4_660_850.50,
    status: 'COMPLETED',
    narration: 'ATM Cash Withdrawal',
    valueDate: '2026-03-17',
  },
  {
    id: 'txn-004',
    date: '2026-03-15T16:30:00',
    reference: 'TXN2026031500201',
    description: 'Salary Credit — DigiCore Ltd',
    channel: 'NEFT',
    creditAmount: 850_000,
    runningBalance: 4_720_850.50,
    status: 'COMPLETED',
    narration: 'March 2026 Salary',
    valueDate: '2026-03-15',
  },
  {
    id: 'txn-005',
    date: '2026-03-14T11:00:00',
    reference: 'TXN2026031400099',
    description: 'Bill Payment — EKEDC',
    channel: 'INTERNET',
    debitAmount: 15_000,
    runningBalance: 3_870_850.50,
    status: 'COMPLETED',
    narration: 'Electricity bill payment — meter 0452187693',
    valueDate: '2026-03-14',
  },
  {
    id: 'txn-006',
    date: '2026-03-12T08:45:00',
    reference: 'TXN2026031200055',
    description: 'Transfer to Emeka Savings 2',
    channel: 'MOBILE',
    debitAmount: 100_000,
    runningBalance: 3_885_850.50,
    status: 'COMPLETED',
    narration: 'Personal transfer to own account',
    valueDate: '2026-03-12',
  },
  {
    id: 'txn-007',
    date: '2026-03-10T13:20:00',
    reference: 'TXN2026031000178',
    description: 'Inward Transfer — Mama Emeka',
    channel: 'NIBSS',
    creditAmount: 500_000,
    runningBalance: 3_985_850.50,
    status: 'COMPLETED',
    narration: 'Family support funds',
    valueDate: '2026-03-10',
  },
  {
    id: 'txn-008',
    date: '2026-03-08T17:05:00',
    reference: 'TXN2026030800333',
    description: 'Airtime Purchase — MTN',
    channel: 'USSD',
    debitAmount: 5_000,
    runningBalance: 3_485_850.50,
    status: 'COMPLETED',
    narration: 'MTN airtime top-up 08012345678',
    valueDate: '2026-03-08',
  },
];

const MOCK_INTEREST_HISTORY: InterestHistory[] = [
  { id: 'int-001', postingDate: '2026-02-28', periodStart: '2026-02-01', periodEnd: '2026-02-28', rate: 4.25, amount: 16_820.45, days: 28 },
  { id: 'int-002', postingDate: '2026-01-31', periodStart: '2026-01-01', periodEnd: '2026-01-31', rate: 4.25, amount: 18_104.20, days: 31 },
  { id: 'int-003', postingDate: '2025-12-31', periodStart: '2025-12-01', periodEnd: '2025-12-31', rate: 4.00, amount: 17_203.80, days: 31 },
  { id: 'int-004', postingDate: '2025-11-30', periodStart: '2025-11-01', periodEnd: '2025-11-30', rate: 4.00, amount: 15_980.60, days: 30 },
  { id: 'int-005', postingDate: '2025-10-31', periodStart: '2025-10-01', periodEnd: '2025-10-31', rate: 3.75, amount: 14_220.15, days: 31 },
];

const MOCK_HOLDS: Hold[] = [
  {
    id: 'hold-001',
    reference: 'HLD2026031500001',
    amount: 300_000,
    reason: 'Loan collateral — Personal Loan #LN20260201',
    placedBy: 'System (Loan Module)',
    dateCreated: '2026-03-15',
    status: 'ACTIVE',
  },
  {
    id: 'hold-002',
    reference: 'HLD2026031900042',
    amount: 200_000,
    reason: 'Court order — FCT High Court Case No. 2026/001234',
    placedBy: 'Compliance Officer — Ibrahim Sule',
    dateCreated: '2026-03-19',
    releaseDate: '2026-04-30',
    status: 'ACTIVE',
  },
];

const MOCK_LINKED_PRODUCTS: LinkedProducts = {
  debitCard: {
    maskedPan: '**** **** **** 4512',
    status: 'ACTIVE',
    expiryDate: '2028-09',
  },
  standingOrders: [
    { id: 'so-001', beneficiary: 'Lagos State LASRRA', amount: 5_000, frequency: 'Monthly', nextExecution: '2026-04-01' },
    { id: 'so-002', beneficiary: 'Zenith Bank Mortgage', amount: 120_000, frequency: 'Monthly', nextExecution: '2026-04-05' },
  ],
  directDebits: [
    { id: 'dd-001', merchant: 'DSTV Nigeria', limit: 35_000, authorized: true },
    { id: 'dd-002', merchant: 'Interswitch Quickteller', limit: 50_000, authorized: true },
  ],
  overdraftFacility: {
    limit: 1_000_000,
    utilized: 0,
    expiryDate: '2026-12-31',
  },
};

function applyTransactionFilters(txns: Transaction[], params: TransactionQueryParams): Transaction[] {
  return txns.filter((t) => {
    if (params.dateFrom && t.date < params.dateFrom) return false;
    if (params.dateTo && t.date > params.dateTo + 'T23:59:59') return false;
    if (params.type === 'CREDIT' && !t.creditAmount) return false;
    if (params.type === 'DEBIT' && !t.debitAmount) return false;
    const amount = t.debitAmount ?? t.creditAmount ?? 0;
    if (params.minAmount !== undefined && amount < params.minAmount) return false;
    if (params.maxAmount !== undefined && amount > params.maxAmount) return false;
    if (params.search) {
      const q = params.search.toLowerCase();
      if (!t.description.toLowerCase().includes(q) && !t.reference.toLowerCase().includes(q) && !t.narration.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const accountDetailApi = {
  getAccount: async (id: string): Promise<Account> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return { ...MOCK_ACCOUNT, id };
    }
    return apiGet<Account>(`/v1/accounts/${id}`);
  },

  getTransactions: async (accountId: string, params: TransactionQueryParams): Promise<Transaction[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return applyTransactionFilters(MOCK_TRANSACTIONS, params);
    }
    return apiGet<Transaction[]>(`/v1/accounts/${accountId}/transactions`, params as Record<string, unknown>);
  },

  getInterestHistory: async (accountId: string): Promise<InterestHistory[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_INTEREST_HISTORY;
    }
    return apiGet<InterestHistory[]>(`/v1/accounts/${accountId}/interest-history`);
  },

  getHolds: async (accountId: string): Promise<Hold[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 350));
      return MOCK_HOLDS;
    }
    return apiGet<Hold[]>(`/v1/accounts/${accountId}/holds`);
  },

  releaseHold: async (accountId: string, holdId: string, reason: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    await apiPost<void>(`/v1/accounts/${accountId}/holds/${holdId}/release`, { reason });
  },

  getLinkedProducts: async (accountId: string): Promise<LinkedProducts> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_LINKED_PRODUCTS;
    }
    return apiGet<LinkedProducts>(`/v1/accounts/${accountId}/linked-products`);
  },
};
