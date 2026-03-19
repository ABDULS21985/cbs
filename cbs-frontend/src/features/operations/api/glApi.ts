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

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ---- Mock COA Tree ----
const MOCK_COA: GlAccount[] = [
  {
    id: 'h-1', code: '1000', name: 'ASSETS', type: 'HEADER', category: 'ASSET',
    currency: 'NGN', status: 'ACTIVE', level: 0,
    children: [
      {
        id: 'h-1-1', code: '1100', name: 'Cash & Cash Equivalents', type: 'HEADER', category: 'ASSET',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '1000',
        children: [
          { id: 'd-1-1-1', code: '1101', name: 'Cash in Vault', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1100' },
          { id: 'd-1-1-2', code: '1102', name: 'Cash at CBN', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1100' },
          { id: 'd-1-1-3', code: '1103', name: 'Petty Cash', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1100' },
        ],
      },
      {
        id: 'h-1-2', code: '1200', name: 'Loans & Advances', type: 'HEADER', category: 'ASSET',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '1000',
        children: [
          { id: 'd-1-2-1', code: '1201', name: 'Personal Loans', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1200' },
          { id: 'd-1-2-2', code: '1202', name: 'SME Loans', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1200' },
          { id: 'd-1-2-3', code: '1203', name: 'Mortgage Loans', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1200' },
          { id: 'd-1-2-4', code: '1204', name: 'Provision for Loan Losses', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1200' },
        ],
      },
      {
        id: 'h-1-3', code: '1300', name: 'Fixed Assets', type: 'HEADER', category: 'ASSET',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '1000',
        children: [
          { id: 'd-1-3-1', code: '1301', name: 'Computer Equipment', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1300' },
          { id: 'd-1-3-2', code: '1302', name: 'Furniture & Fittings', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1300' },
          { id: 'd-1-3-3', code: '1303', name: 'Motor Vehicles', type: 'DETAIL', category: 'ASSET', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '1300' },
        ],
      },
    ],
  },
  {
    id: 'h-2', code: '2000', name: 'LIABILITIES', type: 'HEADER', category: 'LIABILITY',
    currency: 'NGN', status: 'ACTIVE', level: 0,
    children: [
      {
        id: 'h-2-1', code: '2100', name: 'Customer Deposits', type: 'HEADER', category: 'LIABILITY',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '2000',
        children: [
          { id: 'd-2-1-1', code: '2101', name: 'Savings Accounts', type: 'DETAIL', category: 'LIABILITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '2100' },
          { id: 'd-2-1-2', code: '2102', name: 'Current Accounts', type: 'DETAIL', category: 'LIABILITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '2100' },
          { id: 'd-2-1-3', code: '2103', name: 'Fixed Deposits', type: 'DETAIL', category: 'LIABILITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '2100' },
        ],
      },
      {
        id: 'h-2-2', code: '2200', name: 'Borrowings', type: 'HEADER', category: 'LIABILITY',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '2000',
        children: [
          { id: 'd-2-2-1', code: '2201', name: 'CBN Lending Facility', type: 'DETAIL', category: 'LIABILITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '2200' },
          { id: 'd-2-2-2', code: '2202', name: 'Interbank Borrowings', type: 'DETAIL', category: 'LIABILITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '2200' },
        ],
      },
    ],
  },
  {
    id: 'h-3', code: '3000', name: 'EQUITY', type: 'HEADER', category: 'EQUITY',
    currency: 'NGN', status: 'ACTIVE', level: 0,
    children: [
      {
        id: 'h-3-1', code: '3100', name: 'Share Capital & Reserves', type: 'HEADER', category: 'EQUITY',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '3000',
        children: [
          { id: 'd-3-1-1', code: '3101', name: 'Paid-up Share Capital', type: 'DETAIL', category: 'EQUITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '3100' },
          { id: 'd-3-1-2', code: '3102', name: 'Statutory Reserve', type: 'DETAIL', category: 'EQUITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '3100' },
          { id: 'd-3-1-3', code: '3103', name: 'Retained Earnings', type: 'DETAIL', category: 'EQUITY', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '3100' },
        ],
      },
    ],
  },
  {
    id: 'h-4', code: '4000', name: 'INCOME', type: 'HEADER', category: 'INCOME',
    currency: 'NGN', status: 'ACTIVE', level: 0,
    children: [
      {
        id: 'h-4-1', code: '4100', name: 'Interest Income', type: 'HEADER', category: 'INCOME',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '4000',
        children: [
          { id: 'd-4-1-1', code: '4101', name: 'Interest on Loans', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4100' },
          { id: 'd-4-1-2', code: '4102', name: 'Interest on Investments', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4100' },
          { id: 'd-4-1-3', code: '4103', name: 'Interest on CBN Placements', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4100' },
        ],
      },
      {
        id: 'h-4-2', code: '4200', name: 'Fee & Commission Income', type: 'HEADER', category: 'INCOME',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '4000',
        children: [
          { id: 'd-4-2-1', code: '4201', name: 'Account Maintenance Fees', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4200' },
          { id: 'd-4-2-2', code: '4202', name: 'Transfer Charges', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4200' },
          { id: 'd-4-2-3', code: '4203', name: 'Card Fees', type: 'DETAIL', category: 'INCOME', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '4200' },
        ],
      },
    ],
  },
  {
    id: 'h-5', code: '5000', name: 'EXPENSES', type: 'HEADER', category: 'EXPENSE',
    currency: 'NGN', status: 'ACTIVE', level: 0,
    children: [
      {
        id: 'h-5-1', code: '5100', name: 'Interest Expense', type: 'HEADER', category: 'EXPENSE',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '5000',
        children: [
          { id: 'd-5-1-1', code: '5101', name: 'Interest on Deposits', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5100' },
          { id: 'd-5-1-2', code: '5102', name: 'Interest on Borrowings', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5100' },
        ],
      },
      {
        id: 'h-5-2', code: '5200', name: 'Operating Expenses', type: 'HEADER', category: 'EXPENSE',
        currency: 'NGN', status: 'ACTIVE', level: 1, parentCode: '5000',
        children: [
          { id: 'd-5-2-1', code: '5201', name: 'Staff Salaries', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5200' },
          { id: 'd-5-2-2', code: '5202', name: 'Premises & Equipment', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5200' },
          { id: 'd-5-2-3', code: '5203', name: 'IT & Technology', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5200' },
          { id: 'd-5-2-4', code: '5204', name: 'Marketing & Promotions', type: 'DETAIL', category: 'EXPENSE', currency: 'NGN', status: 'ACTIVE', level: 2, parentCode: '5200' },
        ],
      },
    ],
  },
];

const MOCK_BALANCES: GlBalance[] = [
  { glCode: '1000', name: 'ASSETS', currency: 'NGN', debitBalance: 185_420_000_000, creditBalance: 0, netBalance: 185_420_000_000, isHeader: true, level: 0 },
  { glCode: '1100', name: 'Cash & Cash Equivalents', currency: 'NGN', debitBalance: 12_500_000_000, creditBalance: 0, netBalance: 12_500_000_000, isHeader: true, level: 1 },
  { glCode: '1101', name: 'Cash in Vault', currency: 'NGN', debitBalance: 8_200_000_000, creditBalance: 0, netBalance: 8_200_000_000, isHeader: false, level: 2 },
  { glCode: '1102', name: 'Cash at CBN', currency: 'NGN', debitBalance: 4_100_000_000, creditBalance: 0, netBalance: 4_100_000_000, isHeader: false, level: 2 },
  { glCode: '1103', name: 'Petty Cash', currency: 'NGN', debitBalance: 200_000_000, creditBalance: 0, netBalance: 200_000_000, isHeader: false, level: 2 },
  { glCode: '1200', name: 'Loans & Advances', currency: 'NGN', debitBalance: 152_000_000_000, creditBalance: 0, netBalance: 152_000_000_000, isHeader: true, level: 1 },
  { glCode: '1201', name: 'Personal Loans', currency: 'NGN', debitBalance: 45_000_000_000, creditBalance: 0, netBalance: 45_000_000_000, isHeader: false, level: 2 },
  { glCode: '1202', name: 'SME Loans', currency: 'NGN', debitBalance: 68_000_000_000, creditBalance: 0, netBalance: 68_000_000_000, isHeader: false, level: 2 },
  { glCode: '1203', name: 'Mortgage Loans', currency: 'NGN', debitBalance: 42_500_000_000, creditBalance: 0, netBalance: 42_500_000_000, isHeader: false, level: 2 },
  { glCode: '1204', name: 'Provision for Loan Losses', currency: 'NGN', debitBalance: 0, creditBalance: 3_500_000_000, netBalance: -3_500_000_000, isHeader: false, level: 2 },
  { glCode: '2000', name: 'LIABILITIES', currency: 'NGN', debitBalance: 0, creditBalance: 155_000_000_000, netBalance: -155_000_000_000, isHeader: true, level: 0 },
  { glCode: '2100', name: 'Customer Deposits', currency: 'NGN', debitBalance: 0, creditBalance: 140_000_000_000, netBalance: -140_000_000_000, isHeader: true, level: 1 },
  { glCode: '2101', name: 'Savings Accounts', currency: 'NGN', debitBalance: 0, creditBalance: 55_000_000_000, netBalance: -55_000_000_000, isHeader: false, level: 2 },
  { glCode: '2102', name: 'Current Accounts', currency: 'NGN', debitBalance: 0, creditBalance: 60_000_000_000, netBalance: -60_000_000_000, isHeader: false, level: 2 },
  { glCode: '2103', name: 'Fixed Deposits', currency: 'NGN', debitBalance: 0, creditBalance: 25_000_000_000, netBalance: -25_000_000_000, isHeader: false, level: 2 },
  { glCode: '3000', name: 'EQUITY', currency: 'NGN', debitBalance: 0, creditBalance: 30_420_000_000, netBalance: -30_420_000_000, isHeader: true, level: 0 },
  { glCode: '3101', name: 'Paid-up Share Capital', currency: 'NGN', debitBalance: 0, creditBalance: 15_000_000_000, netBalance: -15_000_000_000, isHeader: false, level: 2 },
  { glCode: '3102', name: 'Statutory Reserve', currency: 'NGN', debitBalance: 0, creditBalance: 8_000_000_000, netBalance: -8_000_000_000, isHeader: false, level: 2 },
  { glCode: '3103', name: 'Retained Earnings', currency: 'NGN', debitBalance: 0, creditBalance: 7_420_000_000, netBalance: -7_420_000_000, isHeader: false, level: 2 },
  { glCode: '4000', name: 'INCOME', currency: 'NGN', debitBalance: 0, creditBalance: 0, netBalance: 0, isHeader: true, level: 0 },
  { glCode: '4101', name: 'Interest on Loans', currency: 'NGN', debitBalance: 0, creditBalance: 0, netBalance: 0, isHeader: false, level: 2 },
  { glCode: '5000', name: 'EXPENSES', currency: 'NGN', debitBalance: 0, creditBalance: 0, netBalance: 0, isHeader: true, level: 0 },
  { glCode: '5201', name: 'Staff Salaries', currency: 'NGN', debitBalance: 0, creditBalance: 0, netBalance: 0, isHeader: false, level: 2 },
];

const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je-001', journalNumber: 'JNL-2026-00001', date: '2026-03-19', description: 'Loan disbursement — Personal Loan PL20260319001',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-19T08:00:00', totalDebit: 5_000_000, totalCredit: 5_000_000,
    lines: [
      { glCode: '1201', glName: 'Personal Loans', description: 'Loan principal disbursed', debit: 5_000_000, credit: 0 },
      { glCode: '2101', glName: 'Savings Accounts', description: 'Credit to borrower account', debit: 0, credit: 5_000_000 },
    ],
  },
  {
    id: 'je-002', journalNumber: 'JNL-2026-00002', date: '2026-03-19', description: 'Interest income accrual — March 2026',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-19T08:05:00', totalDebit: 12_450_000, totalCredit: 12_450_000,
    lines: [
      { glCode: '1201', glName: 'Personal Loans', description: 'Interest receivable', debit: 12_450_000, credit: 0 },
      { glCode: '4101', glName: 'Interest on Loans', description: 'Interest income accrual', debit: 0, credit: 12_450_000 },
    ],
  },
  {
    id: 'je-003', journalNumber: 'JNL-2026-00003', date: '2026-03-18', description: 'Salary payment — March 2026',
    source: 'MANUAL', status: 'POSTED', postedBy: 'Adaeze Okonkwo', postedAt: '2026-03-18T16:30:00', totalDebit: 42_800_000, totalCredit: 42_800_000,
    lines: [
      { glCode: '5201', glName: 'Staff Salaries', description: 'March 2026 payroll', debit: 42_800_000, credit: 0 },
      { glCode: '1101', glName: 'Cash in Vault', description: 'Salary payments', debit: 0, credit: 42_800_000 },
    ],
  },
  {
    id: 'je-004', journalNumber: 'JNL-2026-00004', date: '2026-03-18', description: 'Fixed deposit rollover — FD20260318055',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-18T10:00:00', totalDebit: 10_000_000, totalCredit: 10_000_000,
    lines: [
      { glCode: '2102', glName: 'Current Accounts', description: 'FD maturity credit', debit: 0, credit: 10_000_000 },
      { glCode: '2103', glName: 'Fixed Deposits', description: 'FD rollover debit', debit: 10_000_000, credit: 0 },
    ],
  },
  {
    id: 'je-005', journalNumber: 'JNL-2026-00005', date: '2026-03-17', description: 'Fee income posting — Transfer charges',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-17T23:55:00', totalDebit: 3_150_000, totalCredit: 3_150_000,
    lines: [
      { glCode: '1101', glName: 'Cash in Vault', description: 'Fee collections', debit: 3_150_000, credit: 0 },
      { glCode: '4202', glName: 'Transfer Charges', description: 'Transfer fee income', debit: 0, credit: 3_150_000 },
    ],
  },
  {
    id: 'je-006', journalNumber: 'JNL-2026-00006', date: '2026-03-17', description: 'IT infrastructure depreciation',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-17T12:00:00', totalDebit: 1_800_000, totalCredit: 1_800_000,
    lines: [
      { glCode: '5203', glName: 'IT & Technology', description: 'Monthly depreciation charge', debit: 1_800_000, credit: 0 },
      { glCode: '1301', glName: 'Computer Equipment', description: 'Accumulated depreciation', debit: 0, credit: 1_800_000 },
    ],
  },
  {
    id: 'je-007', journalNumber: 'JNL-2026-00007', date: '2026-03-16', description: 'Interbank placement — Zenith Bank',
    source: 'MANUAL', status: 'POSTED', postedBy: 'Emeka Okafor', postedAt: '2026-03-16T14:20:00', totalDebit: 500_000_000, totalCredit: 500_000_000,
    lines: [
      { glCode: '1102', glName: 'Cash at CBN', description: 'Interbank placement', debit: 0, credit: 500_000_000 },
      { glCode: '1102', glName: 'Cash at CBN', description: 'Placement receipt', debit: 500_000_000, credit: 0 },
    ],
  },
  {
    id: 'je-008', journalNumber: 'JNL-2026-00008', date: '2026-03-16', description: 'Loan provision charge',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-16T08:00:00', totalDebit: 8_500_000, totalCredit: 8_500_000,
    lines: [
      { glCode: '5101', glName: 'Interest on Deposits', description: 'Provision expense', debit: 8_500_000, credit: 0 },
      { glCode: '1204', glName: 'Provision for Loan Losses', description: 'Provision credit', debit: 0, credit: 8_500_000 },
    ],
  },
  {
    id: 'je-009', journalNumber: 'JNL-2026-00009', date: '2026-03-15', description: 'Marketing event expense',
    source: 'MANUAL', status: 'PENDING', postedBy: 'Chidi Eze', postedAt: '2026-03-15T11:00:00', totalDebit: 2_500_000, totalCredit: 2_500_000,
    lines: [
      { glCode: '5204', glName: 'Marketing & Promotions', description: 'Annual banking forum sponsorship', debit: 2_500_000, credit: 0 },
      { glCode: '2102', glName: 'Current Accounts', description: 'Payment from corporate account', debit: 0, credit: 2_500_000 },
    ],
  },
  {
    id: 'je-010', journalNumber: 'JNL-2026-00010', date: '2026-03-15', description: 'Card fee settlement',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-15T23:50:00', totalDebit: 1_250_000, totalCredit: 1_250_000,
    lines: [
      { glCode: '1101', glName: 'Cash in Vault', description: 'Card fee collections', debit: 1_250_000, credit: 0 },
      { glCode: '4203', glName: 'Card Fees', description: 'Card fee income', debit: 0, credit: 1_250_000 },
    ],
  },
  {
    id: 'je-011', journalNumber: 'JNL-2026-00011', date: '2026-03-14', description: 'Mortgage loan disbursement',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-14T09:30:00', totalDebit: 25_000_000, totalCredit: 25_000_000,
    lines: [
      { glCode: '1203', glName: 'Mortgage Loans', description: 'Mortgage principal', debit: 25_000_000, credit: 0 },
      { glCode: '2101', glName: 'Savings Accounts', description: 'Disbursement to borrower', debit: 0, credit: 25_000_000 },
    ],
  },
  {
    id: 'je-012', journalNumber: 'JNL-2026-00012', date: '2026-03-13', description: 'CBN CRR remittance',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-13T08:00:00', totalDebit: 20_000_000_000, totalCredit: 20_000_000_000,
    lines: [
      { glCode: '1102', glName: 'Cash at CBN', description: 'CRR remittance', debit: 20_000_000_000, credit: 0 },
      { glCode: '2201', glName: 'CBN Lending Facility', description: 'CRR balance', debit: 0, credit: 20_000_000_000 },
    ],
  },
  {
    id: 'je-013', journalNumber: 'JNL-2026-00013', date: '2026-03-12', description: 'Premises rental expense',
    source: 'MANUAL', status: 'POSTED', postedBy: 'Ngozi Adeleke', postedAt: '2026-03-12T14:00:00', totalDebit: 6_000_000, totalCredit: 6_000_000,
    lines: [
      { glCode: '5202', glName: 'Premises & Equipment', description: 'Q1 office rent', debit: 6_000_000, credit: 0 },
      { glCode: '1101', glName: 'Cash in Vault', description: 'Rent payment', debit: 0, credit: 6_000_000 },
    ],
  },
  {
    id: 'je-014', journalNumber: 'JNL-2026-00014', date: '2026-03-11', description: 'SME loan interest accrual',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-11T23:55:00', totalDebit: 32_000_000, totalCredit: 32_000_000,
    lines: [
      { glCode: '1202', glName: 'SME Loans', description: 'Accrued interest receivable', debit: 32_000_000, credit: 0 },
      { glCode: '4101', glName: 'Interest on Loans', description: 'SME interest income', debit: 0, credit: 32_000_000 },
    ],
  },
  {
    id: 'je-015', journalNumber: 'JNL-2026-00015', date: '2026-03-10', description: 'Deposit interest expense',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-10T23:55:00', totalDebit: 18_000_000, totalCredit: 18_000_000,
    lines: [
      { glCode: '5101', glName: 'Interest on Deposits', description: 'Interest paid on savings', debit: 18_000_000, credit: 0 },
      { glCode: '2101', glName: 'Savings Accounts', description: 'Interest credited', debit: 0, credit: 18_000_000 },
    ],
  },
  {
    id: 'je-016', journalNumber: 'JNL-2026-00016', date: '2026-03-09', description: 'Reversal — Duplicate fee posting',
    source: 'MANUAL', status: 'REVERSED', postedBy: 'Fatima Bello', postedAt: '2026-03-09T10:00:00', totalDebit: 250_000, totalCredit: 250_000,
    lines: [
      { glCode: '4202', glName: 'Transfer Charges', description: 'Reversal of duplicate charge', debit: 250_000, credit: 0 },
      { glCode: '1101', glName: 'Cash in Vault', description: 'Refund of duplicate fee', debit: 0, credit: 250_000 },
    ],
  },
  {
    id: 'je-017', journalNumber: 'JNL-2026-00017', date: '2026-03-08', description: 'Account maintenance fee posting',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-08T23:50:00', totalDebit: 4_800_000, totalCredit: 4_800_000,
    lines: [
      { glCode: '1101', glName: 'Cash in Vault', description: 'Monthly fees collected', debit: 4_800_000, credit: 0 },
      { glCode: '4201', glName: 'Account Maintenance Fees', description: 'Monthly fee income', debit: 0, credit: 4_800_000 },
    ],
  },
  {
    id: 'je-018', journalNumber: 'JNL-2026-00018', date: '2026-03-07', description: 'Computer equipment purchase',
    source: 'MANUAL', status: 'POSTED', postedBy: 'Ibrahim Sule', postedAt: '2026-03-07T15:00:00', totalDebit: 8_500_000, totalCredit: 8_500_000,
    lines: [
      { glCode: '1301', glName: 'Computer Equipment', description: 'New servers procurement', debit: 8_500_000, credit: 0 },
      { glCode: '1101', glName: 'Cash in Vault', description: 'Payment for equipment', debit: 0, credit: 8_500_000 },
    ],
  },
  {
    id: 'je-019', journalNumber: 'JNL-2026-00019', date: '2026-03-06', description: 'Interbank borrowing drawdown',
    source: 'SYSTEM', status: 'POSTED', postedBy: 'System', postedAt: '2026-03-06T10:30:00', totalDebit: 15_000_000_000, totalCredit: 15_000_000_000,
    lines: [
      { glCode: '1102', glName: 'Cash at CBN', description: 'Borrowing receipt', debit: 15_000_000_000, credit: 0 },
      { glCode: '2202', glName: 'Interbank Borrowings', description: 'Borrowing liability', debit: 0, credit: 15_000_000_000 },
    ],
  },
  {
    id: 'je-020', journalNumber: 'JNL-2026-00020', date: '2026-03-05', description: 'Statutory reserve transfer',
    source: 'MANUAL', status: 'POSTED', postedBy: 'Adaeze Okonkwo', postedAt: '2026-03-05T16:00:00', totalDebit: 500_000_000, totalCredit: 500_000_000,
    lines: [
      { glCode: '3103', glName: 'Retained Earnings', description: 'Statutory reserve transfer', debit: 500_000_000, credit: 0 },
      { glCode: '3102', glName: 'Statutory Reserve', description: 'Statutory reserve credit', debit: 0, credit: 500_000_000 },
    ],
  },
];

const MOCK_TRIAL_BALANCE: TrialBalanceRow[] = [
  { glCode: '1000', name: 'ASSETS', isHeader: true, level: 0, openingDr: 180_000_000_000, openingCr: 0, periodDr: 5_420_000_000, periodCr: 0, closingDr: 185_420_000_000, closingCr: 0 },
  { glCode: '1100', name: 'Cash & Cash Equivalents', isHeader: true, level: 1, openingDr: 11_000_000_000, openingCr: 0, periodDr: 1_500_000_000, periodCr: 0, closingDr: 12_500_000_000, closingCr: 0 },
  { glCode: '1101', name: 'Cash in Vault', isHeader: false, level: 2, openingDr: 7_500_000_000, openingCr: 0, periodDr: 700_000_000, periodCr: 0, closingDr: 8_200_000_000, closingCr: 0 },
  { glCode: '1102', name: 'Cash at CBN', isHeader: false, level: 2, openingDr: 3_300_000_000, openingCr: 0, periodDr: 800_000_000, periodCr: 0, closingDr: 4_100_000_000, closingCr: 0 },
  { glCode: '1103', name: 'Petty Cash', isHeader: false, level: 2, openingDr: 200_000_000, openingCr: 0, periodDr: 0, periodCr: 0, closingDr: 200_000_000, closingCr: 0 },
  { glCode: '1200', name: 'Loans & Advances', isHeader: true, level: 1, openingDr: 145_000_000_000, openingCr: 0, periodDr: 7_000_000_000, periodCr: 0, closingDr: 152_000_000_000, closingCr: 0 },
  { glCode: '1201', name: 'Personal Loans', isHeader: false, level: 2, openingDr: 42_000_000_000, openingCr: 0, periodDr: 3_000_000_000, periodCr: 0, closingDr: 45_000_000_000, closingCr: 0 },
  { glCode: '1202', name: 'SME Loans', isHeader: false, level: 2, openingDr: 65_000_000_000, openingCr: 0, periodDr: 3_000_000_000, periodCr: 0, closingDr: 68_000_000_000, closingCr: 0 },
  { glCode: '1203', name: 'Mortgage Loans', isHeader: false, level: 2, openingDr: 41_500_000_000, openingCr: 0, periodDr: 1_000_000_000, periodCr: 0, closingDr: 42_500_000_000, closingCr: 0 },
  { glCode: '1204', name: 'Provision for Loan Losses', isHeader: false, level: 2, openingDr: 0, openingCr: 3_000_000_000, periodDr: 0, periodCr: 500_000_000, closingDr: 0, closingCr: 3_500_000_000 },
  { glCode: '2000', name: 'LIABILITIES', isHeader: true, level: 0, openingDr: 0, openingCr: 150_000_000_000, periodDr: 0, periodCr: 5_000_000_000, closingDr: 0, closingCr: 155_000_000_000 },
  { glCode: '2100', name: 'Customer Deposits', isHeader: true, level: 1, openingDr: 0, openingCr: 135_000_000_000, periodDr: 0, periodCr: 5_000_000_000, closingDr: 0, closingCr: 140_000_000_000 },
  { glCode: '2101', name: 'Savings Accounts', isHeader: false, level: 2, openingDr: 0, openingCr: 52_000_000_000, periodDr: 0, periodCr: 3_000_000_000, closingDr: 0, closingCr: 55_000_000_000 },
  { glCode: '2102', name: 'Current Accounts', isHeader: false, level: 2, openingDr: 0, openingCr: 58_000_000_000, periodDr: 0, periodCr: 2_000_000_000, closingDr: 0, closingCr: 60_000_000_000 },
  { glCode: '2103', name: 'Fixed Deposits', isHeader: false, level: 2, openingDr: 0, openingCr: 25_000_000_000, periodDr: 0, periodCr: 0, closingDr: 0, closingCr: 25_000_000_000 },
  { glCode: '3000', name: 'EQUITY', isHeader: true, level: 0, openingDr: 0, openingCr: 30_000_000_000, periodDr: 0, periodCr: 420_000_000, closingDr: 0, closingCr: 30_420_000_000 },
  { glCode: '3101', name: 'Paid-up Share Capital', isHeader: false, level: 2, openingDr: 0, openingCr: 15_000_000_000, periodDr: 0, periodCr: 0, closingDr: 0, closingCr: 15_000_000_000 },
  { glCode: '3102', name: 'Statutory Reserve', isHeader: false, level: 2, openingDr: 0, openingCr: 7_500_000_000, periodDr: 0, periodCr: 500_000_000, closingDr: 0, closingCr: 8_000_000_000 },
  { glCode: '3103', name: 'Retained Earnings', isHeader: false, level: 2, openingDr: 7_920_000_000, openingCr: 0, periodDr: 500_000_000, periodCr: 0, closingDr: 0, closingCr: 7_420_000_000 },
  { glCode: '4000', name: 'INCOME', isHeader: true, level: 0, openingDr: 0, openingCr: 0, periodDr: 0, periodCr: 18_450_000, closingDr: 0, closingCr: 18_450_000 },
  { glCode: '4101', name: 'Interest on Loans', isHeader: false, level: 2, openingDr: 0, openingCr: 0, periodDr: 0, periodCr: 12_450_000, closingDr: 0, closingCr: 12_450_000 },
  { glCode: '5000', name: 'EXPENSES', isHeader: true, level: 0, openingDr: 0, openingCr: 0, periodDr: 18_450_000, periodCr: 0, closingDr: 18_450_000, closingCr: 0 },
  { glCode: '5101', name: 'Interest on Deposits', isHeader: false, level: 2, openingDr: 0, openingCr: 0, periodDr: 18_000_000, periodCr: 0, closingDr: 18_000_000, closingCr: 0 },
  { glCode: '5201', name: 'Staff Salaries', isHeader: false, level: 2, openingDr: 0, openingCr: 0, periodDr: 450_000, periodCr: 0, closingDr: 450_000, closingCr: 0 },
];

const MOCK_RECONCILIATION: SubLedgerRow[] = [
  { module: 'Savings & Current Accounts', subLedgerTotal: 115_000_000_000, glBalance: 115_000_000_000, difference: 0, status: 'MATCHED' },
  { module: 'Fixed Deposits', subLedgerTotal: 25_000_000_000, glBalance: 25_000_000_000, difference: 0, status: 'MATCHED' },
  { module: 'Personal & SME Loans', subLedgerTotal: 113_050_000_000, glBalance: 113_000_000_000, difference: 50_000_000, status: 'BREAK' },
  { module: 'Mortgage Loans', subLedgerTotal: 42_500_000_000, glBalance: 42_500_000_000, difference: 0, status: 'MATCHED' },
  { module: 'Payments & Transfers', subLedgerTotal: 8_150_000_000, glBalance: 8_150_000_000, difference: 0, status: 'MATCHED' },
  { module: 'Treasury Investments', subLedgerTotal: 4_100_000_000, glBalance: 4_105_000_000, difference: -5_000_000, status: 'BREAK' },
];

function filterJournals(entries: JournalEntry[], params: JournalSearchParams): JournalEntry[] {
  return entries.filter((e) => {
    if (params.glCode && !e.lines.some((l) => l.glCode.includes(params.glCode!))) return false;
    if (params.dateFrom && e.date < params.dateFrom) return false;
    if (params.dateTo && e.date > params.dateTo) return false;
    if (params.journalNumber && !e.journalNumber.toLowerCase().includes(params.journalNumber.toLowerCase())) return false;
    if (params.source && params.source !== 'ALL' && e.source !== params.source) return false;
    if (params.status && params.status !== 'ALL' && e.status !== params.status) return false;
    if (params.minAmount !== undefined && e.totalDebit < params.minAmount) return false;
    if (params.maxAmount !== undefined && e.totalDebit > params.maxAmount) return false;
    return true;
  });
}

export const glApi = {
  getChartOfAccounts: async (): Promise<GlAccount[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_COA;
    }
    return apiGet<GlAccount[]>('/v1/gl/accounts');
  },

  createGlAccount: async (data: CreateGlAccountRequest): Promise<GlAccount> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return { ...data, id: `d-new-${Date.now()}`, level: 2 };
    }
    return apiPost<GlAccount>('/v1/gl/accounts', data);
  },

  getGlBalances: async (date: string): Promise<GlBalance[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_BALANCES;
    }
    return apiGet<GlBalance[]>('/v1/gl/balances', { date });
  },

  getJournalEntries: async (params: JournalSearchParams): Promise<JournalEntry[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 450));
      return filterJournals(MOCK_JOURNAL_ENTRIES, params);
    }
    return apiGet<JournalEntry[]>('/v1/gl/journals', params as Record<string, unknown>);
  },

  getJournalEntry: async (id: string): Promise<JournalEntry> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === id);
      if (!entry) throw new Error('Journal entry not found');
      return entry;
    }
    return apiGet<JournalEntry>(`/v1/gl/journals/${id}`);
  },

  createJournalEntry: async (data: CreateJournalRequest): Promise<JournalEntry> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
      return {
        id: `je-new-${Date.now()}`,
        journalNumber: `JNL-2026-${String(MOCK_JOURNAL_ENTRIES.length + 1).padStart(5, '0')}`,
        date: data.date,
        description: data.description,
        source: 'MANUAL',
        status: 'PENDING',
        postedBy: 'Current User',
        postedAt: new Date().toISOString(),
        totalDebit,
        totalCredit,
        lines: data.lines.map((l) => ({ ...l, glName: l.glCode })),
      };
    }
    return apiPost<JournalEntry>('/v1/gl/journals', data);
  },

  getTrialBalance: async (params: { year: number; month: number }): Promise<TrialBalanceRow[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_TRIAL_BALANCE;
    }
    return apiGet<TrialBalanceRow[]>('/v1/gl/trial-balance', params as Record<string, unknown>);
  },

  getSubLedgerReconciliation: async (date: string): Promise<SubLedgerRow[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_RECONCILIATION;
    }
    return apiGet<SubLedgerRow[]>('/v1/gl/reconciliation', { date });
  },

  getDrillDown: async (glCode: string, dateFrom: string, dateTo: string): Promise<JournalEntry[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_JOURNAL_ENTRIES.filter((e) =>
        e.lines.some((l) => l.glCode === glCode) &&
        e.date >= dateFrom &&
        e.date <= dateTo
      );
    }
    return apiGet<JournalEntry[]>(`/v1/gl/accounts/${glCode}/entries`, { dateFrom, dateTo });
  },
};
