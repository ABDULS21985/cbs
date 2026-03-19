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

// ── API functions ─────────────────────────────────────────────────────────────

export function getCashPools(): Promise<CashPool[]> {
  return apiGet<CashPool[]>('/api/v1/cash-pools').catch(() => []);
}

export function getCashPoolById(id: string): Promise<CashPool> {
  return apiGet<CashPool>(`/api/v1/cash-pools/${id}`);
}

export function createCashPool(data: Partial<CashPool>): Promise<CashPool> {
  return apiPost<CashPool>('/api/v1/cash-pools', data);
}

export function getSweepHistory(poolId: string): Promise<SweepTransaction[]> {
  return apiGet<SweepTransaction[]>(`/api/v1/cash-pools/${poolId}/sweeps`).catch(() => []);
}

export function updateParticipant(
  poolId: string,
  participantId: string,
  data: Partial<CashPoolParticipant>,
): Promise<CashPoolParticipant> {
  return apiPatch<CashPoolParticipant>(`/api/v1/cash-pools/${poolId}/participants/${participantId}`, data);
}
