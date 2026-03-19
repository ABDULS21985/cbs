import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface VirtualAccount {
  id: string;
  vaNumber: string;
  parentAccountId: string;
  parentAccountNumber: string;
  customerId: string;
  customerName: string;
  pattern: string;
  currency: string;
  balance: number;
  matchedMTD: number;
  unmatchedCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface MatchingRule {
  id: string;
  vaId: string;
  type: 'REFERENCE_PREFIX' | 'REGEX' | 'EXACT';
  value: string;
  priority: number;
}

export interface VATransaction {
  id: string;
  vaId: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'PARTIAL';
  matchedRef?: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VIRTUAL_ACCOUNTS: VirtualAccount[] = [
  {
    id: 'va-001',
    vaNumber: 'VA0010000001',
    parentAccountId: 'acc-100',
    parentAccountNumber: '0123456789',
    customerId: 'cust-01',
    customerName: 'Dangote Industries Ltd',
    pattern: '^INV-DNG-\\d+$',
    currency: 'NGN',
    balance: 45_800_000,
    matchedMTD: 120,
    unmatchedCount: 4,
    status: 'ACTIVE',
    createdAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 'va-002',
    vaNumber: 'VA0010000002',
    parentAccountId: 'acc-100',
    parentAccountNumber: '0123456789',
    customerId: 'cust-02',
    customerName: 'MTN Nigeria Plc',
    pattern: '^MTN-PAY-\\d+$',
    currency: 'NGN',
    balance: 12_300_000,
    matchedMTD: 85,
    unmatchedCount: 1,
    status: 'ACTIVE',
    createdAt: '2025-02-01T09:30:00Z',
  },
  {
    id: 'va-003',
    vaNumber: 'VA0010000003',
    parentAccountId: 'acc-101',
    parentAccountNumber: '0987654321',
    customerId: 'cust-03',
    customerName: 'Zenith Bank Plc',
    pattern: '^ZB-REF-\\d+$',
    currency: 'USD',
    balance: 900_000,
    matchedMTD: 32,
    unmatchedCount: 0,
    status: 'ACTIVE',
    createdAt: '2025-02-10T11:00:00Z',
  },
  {
    id: 'va-004',
    vaNumber: 'VA0010000004',
    parentAccountId: 'acc-101',
    parentAccountNumber: '0987654321',
    customerId: 'cust-04',
    customerName: 'Access Bank Plc',
    pattern: '^AC-TXN-\\d+$',
    currency: 'NGN',
    balance: 0,
    matchedMTD: 0,
    unmatchedCount: 0,
    status: 'INACTIVE',
    createdAt: '2025-01-20T14:00:00Z',
  },
];

const MOCK_RULES: MatchingRule[] = [
  { id: 'rule-001', vaId: 'va-001', type: 'REFERENCE_PREFIX', value: 'INV-DNG-', priority: 1 },
  { id: 'rule-002', vaId: 'va-001', type: 'REGEX', value: '^INV-DNG-\\d+$', priority: 2 },
  { id: 'rule-003', vaId: 'va-002', type: 'REFERENCE_PREFIX', value: 'MTN-PAY-', priority: 1 },
  { id: 'rule-004', vaId: 'va-003', type: 'EXACT', value: 'ZB-REF-2025', priority: 1 },
];

const MOCK_TRANSACTIONS: VATransaction[] = [
  {
    id: 'vtx-001', vaId: 'va-001', date: '2026-03-15T10:22:00Z', reference: 'INV-DNG-1001',
    description: 'Payment for Invoice 1001', amount: 2_500_000, type: 'CREDIT',
    matchStatus: 'MATCHED', matchedRef: 'INV-DNG-1001',
  },
  {
    id: 'vtx-002', vaId: 'va-001', date: '2026-03-14T14:05:00Z', reference: 'INV-DNG-1002',
    description: 'Payment for Invoice 1002', amount: 1_800_000, type: 'CREDIT',
    matchStatus: 'MATCHED', matchedRef: 'INV-DNG-1002',
  },
  {
    id: 'vtx-003', vaId: 'va-001', date: '2026-03-13T09:00:00Z', reference: 'XFER-0099',
    description: 'Unknown credit', amount: 500_000, type: 'CREDIT',
    matchStatus: 'UNMATCHED',
  },
  {
    id: 'vtx-004', vaId: 'va-001', date: '2026-03-12T16:30:00Z', reference: 'INV-DNG-0999',
    description: 'Partial payment', amount: 750_000, type: 'CREDIT',
    matchStatus: 'PARTIAL', matchedRef: 'INV-DNG-0999',
  },
  {
    id: 'vtx-005', vaId: 'va-001', date: '2026-03-11T11:00:00Z', reference: 'MISC-REF-7',
    description: 'Miscellaneous inflow', amount: 220_000, type: 'CREDIT',
    matchStatus: 'UNMATCHED',
  },
  {
    id: 'vtx-006', vaId: 'va-001', date: '2026-03-10T08:45:00Z', reference: 'SWEEP-OUT-1',
    description: 'Sweep to parent account', amount: 4_000_000, type: 'DEBIT',
    matchStatus: 'MATCHED',
  },
];

// ── API functions ─────────────────────────────────────────────────────────────

export async function getVirtualAccounts(): Promise<VirtualAccount[]> {
  try {
    return await apiGet<VirtualAccount[]>('/virtual-accounts');
  } catch {
    return MOCK_VIRTUAL_ACCOUNTS;
  }
}

export async function getVirtualAccountById(id: string): Promise<VirtualAccount> {
  try {
    return await apiGet<VirtualAccount>(`/virtual-accounts/${id}`);
  } catch {
    const account = MOCK_VIRTUAL_ACCOUNTS.find((a) => a.id === id);
    if (!account) throw new Error('Virtual account not found');
    return account;
  }
}

export async function createVirtualAccount(data: Partial<VirtualAccount>): Promise<VirtualAccount> {
  try {
    return await apiPost<VirtualAccount>('/virtual-accounts', data);
  } catch {
    const newAccount: VirtualAccount = {
      id: `va-${Date.now()}`,
      vaNumber: `VA001${String(Date.now()).slice(-7)}`,
      parentAccountId: data.parentAccountId || '',
      parentAccountNumber: data.parentAccountNumber || '',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      pattern: data.pattern || '',
      currency: data.currency || 'NGN',
      balance: 0,
      matchedMTD: 0,
      unmatchedCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    MOCK_VIRTUAL_ACCOUNTS.push(newAccount);
    return newAccount;
  }
}

export async function getVATransactions(id: string): Promise<VATransaction[]> {
  try {
    return await apiGet<VATransaction[]>(`/virtual-accounts/${id}/transactions`);
  } catch {
    return MOCK_TRANSACTIONS.filter((t) => t.vaId === id);
  }
}

export async function getMatchingRules(vaId: string): Promise<MatchingRule[]> {
  try {
    return await apiGet<MatchingRule[]>(`/virtual-accounts/${vaId}/rules`);
  } catch {
    return MOCK_RULES.filter((r) => r.vaId === vaId);
  }
}

export async function updateMatchingRules(vaId: string, rules: MatchingRule[]): Promise<MatchingRule[]> {
  try {
    return await apiPatch<MatchingRule[]>(`/virtual-accounts/${vaId}/rules`, rules);
  } catch {
    return rules;
  }
}
