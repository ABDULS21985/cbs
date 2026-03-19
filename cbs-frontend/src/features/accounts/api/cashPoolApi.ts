import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface CashPool {
  id: string;
  name: string;
  headerAccount: {
    id: string;
    number: string;
    name: string;
    balance: number;
  };
  participants: CashPoolParticipant[];
  totalBalance: number;
  interestBenefit: number;
  createdAt: string;
}

export interface CashPoolParticipant {
  id: string;
  poolId: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  sweepType: 'ZBA' | 'THRESHOLD' | 'TARGET_BALANCE';
  sweepThreshold?: number;
  targetBalance?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SweepTransaction {
  id: string;
  poolId: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  type: 'ZBA' | 'THRESHOLD' | 'TARGET';
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_POOLS: CashPool[] = [
  {
    id: 'pool-001',
    name: 'Dangote Group Master Pool',
    headerAccount: {
      id: 'hdr-001',
      number: '0000000001',
      name: 'Dangote Group Treasury',
      balance: 250_000_000,
    },
    participants: [
      {
        id: 'part-001', poolId: 'pool-001', accountId: 'acc-201',
        accountNumber: '0200000001', accountName: 'Dangote Cement Plc',
        balance: 85_000_000, sweepType: 'ZBA', status: 'ACTIVE',
      },
      {
        id: 'part-002', poolId: 'pool-001', accountId: 'acc-202',
        accountNumber: '0200000002', accountName: 'Dangote Sugar Refinery',
        balance: 42_500_000, sweepType: 'THRESHOLD', sweepThreshold: 5_000_000, status: 'ACTIVE',
      },
      {
        id: 'part-003', poolId: 'pool-001', accountId: 'acc-203',
        accountNumber: '0200000003', accountName: 'Dangote Industries Ltd',
        balance: 68_300_000, sweepType: 'TARGET_BALANCE', targetBalance: 10_000_000, status: 'ACTIVE',
      },
      {
        id: 'part-004', poolId: 'pool-001', accountId: 'acc-204',
        accountNumber: '0200000004', accountName: 'Dangote Flour Mills',
        balance: 0, sweepType: 'ZBA', status: 'INACTIVE',
      },
    ],
    totalBalance: 445_800_000,
    interestBenefit: 1_856_250,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'pool-002',
    name: 'NLNG Corporate Pool',
    headerAccount: {
      id: 'hdr-002',
      number: '0000000002',
      name: 'NLNG Treasury Account',
      balance: 520_000_000,
    },
    participants: [
      {
        id: 'part-005', poolId: 'pool-002', accountId: 'acc-301',
        accountNumber: '0300000001', accountName: 'NLNG Operations',
        balance: 130_000_000, sweepType: 'ZBA', status: 'ACTIVE',
      },
      {
        id: 'part-006', poolId: 'pool-002', accountId: 'acc-302',
        accountNumber: '0300000002', accountName: 'NLNG Logistics',
        balance: 55_000_000, sweepType: 'THRESHOLD', sweepThreshold: 10_000_000, status: 'ACTIVE',
      },
    ],
    totalBalance: 705_000_000,
    interestBenefit: 2_937_500,
    createdAt: '2025-03-01T00:00:00Z',
  },
];

const MOCK_SWEEPS: SweepTransaction[] = [
  {
    id: 'sw-001', poolId: 'pool-001', date: '2026-03-19T00:00:05Z',
    fromAccount: '0200000001', toAccount: '0000000001',
    amount: 85_000_000, type: 'ZBA', status: 'COMPLETED',
  },
  {
    id: 'sw-002', poolId: 'pool-001', date: '2026-03-19T00:00:05Z',
    fromAccount: '0200000002', toAccount: '0000000001',
    amount: 37_500_000, type: 'THRESHOLD', status: 'COMPLETED',
  },
  {
    id: 'sw-003', poolId: 'pool-001', date: '2026-03-18T00:00:05Z',
    fromAccount: '0200000003', toAccount: '0000000001',
    amount: 58_300_000, type: 'TARGET', status: 'COMPLETED',
  },
  {
    id: 'sw-004', poolId: 'pool-001', date: '2026-03-17T00:00:05Z',
    fromAccount: '0200000001', toAccount: '0000000001',
    amount: 72_000_000, type: 'ZBA', status: 'COMPLETED',
  },
  {
    id: 'sw-005', poolId: 'pool-001', date: '2026-03-16T00:00:05Z',
    fromAccount: '0200000002', toAccount: '0000000001',
    amount: 31_000_000, type: 'THRESHOLD', status: 'FAILED',
  },
  {
    id: 'sw-006', poolId: 'pool-002', date: '2026-03-19T00:00:10Z',
    fromAccount: '0300000001', toAccount: '0000000002',
    amount: 130_000_000, type: 'ZBA', status: 'PENDING',
  },
];

// ── API functions ─────────────────────────────────────────────────────────────

export async function getCashPools(): Promise<CashPool[]> {
  try {
    return await apiGet<CashPool[]>('/cash-pools');
  } catch {
    return MOCK_POOLS;
  }
}

export async function getCashPoolById(id: string): Promise<CashPool> {
  try {
    return await apiGet<CashPool>(`/cash-pools/${id}`);
  } catch {
    const pool = MOCK_POOLS.find((p) => p.id === id);
    if (!pool) throw new Error('Cash pool not found');
    return pool;
  }
}

export async function createCashPool(data: Partial<CashPool>): Promise<CashPool> {
  try {
    return await apiPost<CashPool>('/cash-pools', data);
  } catch {
    const newPool: CashPool = {
      id: `pool-${Date.now()}`,
      name: data.name || 'New Pool',
      headerAccount: data.headerAccount || { id: '', number: '', name: '', balance: 0 },
      participants: [],
      totalBalance: 0,
      interestBenefit: 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_POOLS.push(newPool);
    return newPool;
  }
}

export async function getSweepHistory(poolId: string): Promise<SweepTransaction[]> {
  try {
    return await apiGet<SweepTransaction[]>(`/cash-pools/${poolId}/sweeps`);
  } catch {
    return MOCK_SWEEPS.filter((s) => s.poolId === poolId);
  }
}

export async function updateParticipant(
  poolId: string,
  participantId: string,
  data: Partial<CashPoolParticipant>,
): Promise<CashPoolParticipant> {
  try {
    return await apiPatch<CashPoolParticipant>(`/cash-pools/${poolId}/participants/${participantId}`, data);
  } catch {
    const pool = MOCK_POOLS.find((p) => p.id === poolId);
    if (!pool) throw new Error('Pool not found');
    const idx = pool.participants.findIndex((p) => p.id === participantId);
    if (idx === -1) throw new Error('Participant not found');
    pool.participants[idx] = { ...pool.participants[idx], ...data };
    return pool.participants[idx];
  }
}
