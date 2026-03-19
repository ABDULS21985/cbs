import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

// ── Types aligned with backend entities ──────────────────────────────────────

/** Maps to CashPoolStructure entity */
export interface CashPool {
  id: number;
  poolCode: string;
  poolName: string;
  poolType: string; // ZERO_BALANCE | TARGET_BALANCE | THRESHOLD
  headerAccountId: number;
  customerId: number;
  currency: string;
  sweepFrequency: string; // REAL_TIME | EOD | DAILY | WEEKLY
  sweepTime: string | null;
  targetBalance: number | null;
  thresholdAmount: number | null;
  minSweepAmount: number;
  interestReallocation: boolean;
  intercompanyLoan: boolean;
  isCrossBorder: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Maps to CashPoolParticipant entity */
export interface CashPoolParticipant {
  id: number;
  poolId: number;
  accountId: number;
  participantName: string;
  participantRole: string; // PARTICIPANT | HEADER
  sweepDirection: string; // BIDIRECTIONAL | INWARD | OUTWARD
  targetBalance: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

/** Maps to CashPoolSweepLog entity */
export interface SweepTransaction {
  id: number;
  poolId: number;
  participantId: number;
  sweepDirection: string;
  amount: number;
  fromAccountId: number;
  toAccountId: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  sweepType: string;
  isIntercompanyLoan: boolean;
  valueDate: string;
  status: string; // COMPLETED | FAILED | PENDING
  createdAt: string;
}

// ── Derived view types for the UI layer ──────────────────────────────────────

/** Enriched pool view for the dashboard cards */
export interface CashPoolView {
  pool: CashPool;
  participants: CashPoolParticipant[];
  totalBalance: number;
  interestBenefit: number;
  headerAccount: {
    id: number;
    number: string;
    name: string;
    balance: number;
  };
}

// ── API functions ────────────────────────────────────────────────────────────

export function getCashPools(): Promise<CashPool[]> {
  return apiGet<CashPool[]>('/api/v1/cash-pools').catch(() => []);
}

export function getCashPoolByCode(poolCode: string): Promise<CashPool> {
  return apiGet<CashPool>(`/api/v1/cash-pools/${poolCode}`);
}

export function createCashPool(data: Partial<CashPool>): Promise<CashPool> {
  return apiPost<CashPool>('/api/v1/cash-pools', data);
}

export function getParticipants(poolCode: string): Promise<CashPoolParticipant[]> {
  return apiGet<CashPoolParticipant[]>(`/api/v1/cash-pools/${poolCode}/participants`).catch(() => []);
}

export function addParticipant(poolCode: string, data: Partial<CashPoolParticipant>): Promise<CashPoolParticipant> {
  return apiPost<CashPoolParticipant>(`/api/v1/cash-pools/${poolCode}/participants`, data);
}

export function updateParticipant(
  poolCode: string,
  participantId: number,
  data: Partial<CashPoolParticipant>,
): Promise<CashPoolParticipant> {
  return apiPatch<CashPoolParticipant>(`/api/v1/cash-pools/${poolCode}/participants/${participantId}`, data);
}

export function removeParticipant(poolCode: string, participantId: number): Promise<void> {
  return apiDelete<void>(`/api/v1/cash-pools/${poolCode}/participants/${participantId}`);
}

export function getSweepHistory(poolCode: string, date?: string): Promise<SweepTransaction[]> {
  const params = date ? { date } : undefined;
  return apiGet<SweepTransaction[]>(`/api/v1/cash-pools/${poolCode}/sweeps`, params).catch(() => []);
}

export function triggerSweep(poolCode: string): Promise<SweepTransaction[]> {
  return apiPost<SweepTransaction[]>(`/api/v1/cash-pools/${poolCode}/sweep`);
}
