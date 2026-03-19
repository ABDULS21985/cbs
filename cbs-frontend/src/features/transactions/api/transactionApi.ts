import { apiGet, apiPost, apiDownload } from '@/lib/api';
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

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(n: number, length = 2) {
  return String(n).padStart(length, '0');
}

function formatDateISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const NAMES = [
  'Adeola Johnson', 'Chidi Okafor', 'Fatima Al-Hassan', 'Emeka Nwosu', 'Ngozi Adeyemi',
  'Tunde Bakare', 'Aisha Suleiman', 'Kola Olawale', 'Ifeanyi Eze', 'Bimpe Adegoke',
  'Yusuf Garba', 'Chioma Obiora', 'Seun Adeleke', 'Musa Ibrahim', 'Blessing Nwobi',
  'Rotimi Alade', 'Sade Coker', 'Gbenga Olofin', 'Amaka Obi', 'Femi Akindele',
];

const ACCOUNT_PREFIXES = ['0123', '0456', '0789', '0234', '0567', '0890'];
const ACCOUNT_MIDS = ['4567', '7890', '1234', '5678', '9012', '3456'];
const ACCOUNT_SUFFIXES = ['89', '12', '45', '78', '01', '34', '67', '90'];

function randomAccount() {
  return `${randomFrom(ACCOUNT_PREFIXES)}${randomFrom(ACCOUNT_MIDS)}${randomFrom(ACCOUNT_SUFFIXES)}`;
}

const TYPES = ['CREDIT', 'DEBIT', 'TRANSFER', 'PAYMENT', 'FEE', 'INTEREST', 'REVERSAL'] as const;
const CHANNELS = ['BRANCH', 'MOBILE', 'WEB', 'ATM', 'POS', 'USSD', 'AGENT'] as const;
const STATUSES = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED', 'REVERSED'] as const;

const NARRATIONS = [
  'Monthly salary payment',
  'Utility bill payment - EKEDC',
  'Transfer to savings account',
  'POS purchase at ShopRite',
  'ATM cash withdrawal',
  'USSD airtime purchase',
  'Online shopping payment',
  'Rent payment Q1 2026',
  'School fees payment',
  'Business vendor payment',
  'Loan repayment installment',
  'Standing order execution',
  'Inter-bank transfer',
  'Commission settlement',
  'Service charge deduction',
  'Interest credit',
  'Reversal of duplicate entry',
  'Mobile top-up',
  'Insurance premium payment',
  'Dividend payment',
];

function generateMockTransaction(index: number): Transaction {
  const type = randomFrom([...TYPES]);
  const channel = randomFrom([...CHANNELS]);
  const status = randomFrom([...STATUSES]);
  const daysAgo = randomBetween(0, 90);
  const txDate = new Date(Date.now() - daysAgo * 86400000 - randomBetween(0, 86400000));
  const refNumber = String(index + 1).padStart(5, '0');
  const ref = `TXN-${txDate.getFullYear()}${pad(txDate.getMonth() + 1)}${pad(txDate.getDate())}${refNumber}`;
  const fromAccount = randomAccount();
  const toAccount = randomAccount();
  const fromName = randomFrom(NAMES);
  const toName = randomFrom(NAMES);
  const narration = randomFrom(NARRATIONS);
  const amount = randomAmount(500, 5000000);
  const fee = type !== 'INTEREST' && type !== 'FEE' ? randomAmount(0, 100) : undefined;

  let debitAmount: number | undefined;
  let creditAmount: number | undefined;

  if (type === 'CREDIT' || type === 'INTEREST') {
    creditAmount = amount;
  } else if (type === 'DEBIT' || type === 'FEE') {
    debitAmount = amount;
  } else if (type === 'TRANSFER') {
    debitAmount = amount;
    creditAmount = amount;
  } else if (type === 'PAYMENT') {
    debitAmount = amount;
  } else if (type === 'REVERSAL') {
    creditAmount = amount;
  }

  const glEntries: GLEntry[] = [
    {
      type: 'DR',
      account: fromAccount,
      amount: debitAmount ?? amount,
      description: `${type} - ${narration}`,
    },
    {
      type: 'CR',
      account: toAccount,
      amount: creditAmount ?? amount,
      description: `${type} - ${narration}`,
    },
  ];

  return {
    id: `txn-${String(index + 1).padStart(4, '0')}`,
    reference: ref,
    type,
    channel,
    status,
    dateTime: formatDateISO(txDate),
    valueDate: formatDateISO(txDate),
    postingDate: formatDateISO(new Date(txDate.getTime() + 3600000)),
    fromAccount,
    fromAccountName: fromName,
    toAccount,
    toAccountName: toName,
    debitAmount,
    creditAmount,
    fee,
    narration,
    description: narration,
    glEntries,
  };
}

const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 60 }, (_, i) => generateMockTransaction(i));

function filterMockTransactions(params: TransactionSearchParams): TransactionSearchResult {
  let filtered = [...MOCK_TRANSACTIONS];

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        t.narration.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.fromAccountName?.toLowerCase().includes(q) ||
        t.toAccountName?.toLowerCase().includes(q),
    );
  }

  if (params.accountNumber) {
    const acct = params.accountNumber.replace(/\s/g, '');
    filtered = filtered.filter(
      (t) =>
        t.fromAccount?.includes(acct) || t.toAccount?.includes(acct),
    );
  }

  if (params.type && params.type !== 'ALL') {
    filtered = filtered.filter((t) => t.type === params.type);
  }

  if (params.channel && params.channel !== 'ALL') {
    filtered = filtered.filter((t) => t.channel === params.channel);
  }

  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter((t) => t.status === params.status);
  }

  if (params.dateFrom) {
    const from = new Date(params.dateFrom);
    filtered = filtered.filter((t) => new Date(t.dateTime) >= from);
  }

  if (params.dateTo) {
    const to = new Date(params.dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter((t) => new Date(t.dateTime) <= to);
  }

  if (params.amountFrom !== undefined && params.amountFrom > 0) {
    filtered = filtered.filter(
      (t) => (t.debitAmount ?? t.creditAmount ?? 0) >= params.amountFrom!,
    );
  }

  if (params.amountTo !== undefined && params.amountTo > 0) {
    filtered = filtered.filter(
      (t) => (t.debitAmount ?? t.creditAmount ?? 0) <= params.amountTo!,
    );
  }

  filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const totalDebit = filtered.reduce((sum, t) => sum + (t.debitAmount ?? 0), 0);
  const totalCredit = filtered.reduce((sum, t) => sum + (t.creditAmount ?? 0), 0);

  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 20;
  const start = page * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    transactions: paginated,
    summary: {
      totalResults: filtered.length,
      totalDebit,
      totalCredit,
      netAmount: totalCredit - totalDebit,
    },
  };
}

export const transactionApi = {
  searchTransactions: async (params: TransactionSearchParams): Promise<TransactionSearchResult> => {
    if (IS_DEMO) {
      await delay(700);
      return filterMockTransactions(params);
    }
    const cleanParams: Record<string, unknown> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'ALL') cleanParams[k] = v;
    });
    const result = await api.get('/v1/transactions', { params: cleanParams });
    return result.data.data;
  },

  getTransaction: async (id: string): Promise<Transaction> => {
    if (IS_DEMO) {
      await delay(400);
      const txn = MOCK_TRANSACTIONS.find((t) => t.id === id);
      if (!txn) throw new Error('Transaction not found');
      return txn;
    }
    return apiGet<Transaction>(`/v1/transactions/${id}`);
  },

  reverseTransaction: async (id: string, reason: string): Promise<{ message: string }> => {
    if (IS_DEMO) {
      await delay(1000);
      const txn = MOCK_TRANSACTIONS.find((t) => t.id === id);
      if (txn) txn.status = 'REVERSED';
      return { message: 'Transaction reversed successfully' };
    }
    return apiPost<{ message: string }>(`/v1/transactions/${id}/reverse`, { reason });
  },

  downloadReceipt: async (id: string): Promise<void> => {
    if (IS_DEMO) {
      await delay(600);
      const txn = MOCK_TRANSACTIONS.find((t) => t.id === id);
      const filename = txn ? `receipt-${txn.reference}.pdf` : `receipt-${id}.pdf`;
      console.log(`[DEMO] Downloading receipt: ${filename}`);
      return;
    }
    return apiDownload(`/v1/transactions/${id}/receipt`, `receipt-${id}.pdf`);
  },
};
