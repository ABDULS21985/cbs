import { apiGet, apiPost, apiPostParams } from '@/lib/api';

export type SettlementType = 'DVP' | 'FOP' | 'RVP';
export type SettlementInstructionStatus = 'PENDING' | 'MATCHED' | 'SUBMITTED' | 'SETTLED' | 'FAILED';
export type BatchStatus = 'PREPARING' | 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SettlementInstruction {
  id: number;
  ref: string;
  type: SettlementType;
  instrumentCode: string;
  instrumentName: string;
  quantity: number;
  amount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  depository: string;
  settlementDate: string;
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'ALLEGED';
  status: SettlementInstructionStatus;
  failureReason?: string;
  matchedWith?: string;
  submittedAt?: string;
  settledAt?: string;
  createdAt: string;
}

export interface SettlementBatch {
  id: number;
  batchRef: string;
  depository: string;
  batchDate: string;
  instructionCount: number;
  netAmount: number;
  currency: string;
  status: BatchStatus;
  settledCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface FailedSettlement {
  id: number;
  instructionRef: string;
  instrumentCode: string;
  instrumentName: string;
  counterpartyCode: string;
  counterpartyName: string;
  failReason: string;
  failDate: string;
  agingDays: number;
  settlementAmount: number;
  currency: string;
  penaltyAccrued: number;
  status: 'FAILED' | 'RESUBMITTED' | 'CANCELLED' | 'ESCALATED';
}

export interface SettlementDashboardData {
  totalToday: number;
  settled: number;
  pending: number;
  failed: number;
  settledPercent: number;
  totalValueSettled: number;
  totalValuePending: number;
  settlementRateByDay: { date: string; rate: number; count: number }[];
  failedTrend: { date: string; count: number }[];
  byDepository: { depository: string; count: number; value: number }[];
  topFailingCounterparties: { counterparty: string; failCount: number; totalAmount: number }[];
  stpRate: number;
}

type RawSettlementInstruction = {
  id: number;
  instructionRef: string;
  instructionType?: string;
  instrumentCode?: string;
  instrumentName?: string;
  quantity?: number | string | null;
  settlementAmount?: number | string | null;
  currency?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  depositoryCode?: string;
  intendedSettlementDate?: string | null;
  actualSettlementDate?: string | null;
  matchStatus?: 'MATCHED' | 'UNMATCHED' | 'ALLEGED' | string | null;
  status?: string | null;
  failReason?: string | null;
  failedSince?: string | null;
  penaltyAmount?: number | string | null;
  priorityFlag?: boolean | null;
  matchedAt?: string | null;
  createdAt?: string | null;
};

type RawSettlementBatch = {
  id: number;
  batchRef: string;
  depositoryCode?: string | null;
  settlementDate?: string | null;
  totalInstructions?: number | null;
  settledCount?: number | null;
  failedCount?: number | null;
  pendingCount?: number | null;
  netAmount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
};

type RawSettlementDashboardCounts = {
  totalPending?: number | null;
  totalSettled?: number | null;
  totalFailed?: number | null;
};

const pendingStatuses = new Set(['CREATED', 'MATCHED', 'SETTLING']);
const failedStatuses = new Set(['FAILED', 'CANCELLED']);

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value?: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, delta: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + delta);
  return next;
}

function normalizeInstructionStatus(status?: string | null): SettlementInstructionStatus {
  switch (status) {
    case 'MATCHED':
      return 'MATCHED';
    case 'SETTLING':
      return 'SUBMITTED';
    case 'SETTLED':
      return 'SETTLED';
    case 'FAILED':
    case 'CANCELLED':
      return 'FAILED';
    case 'CREATED':
    default:
      return 'PENDING';
  }
}

function normalizeFailedStatus(raw: RawSettlementInstruction): FailedSettlement['status'] {
  if (raw.priorityFlag) return 'ESCALATED';
  if (raw.status === 'CANCELLED') return 'CANCELLED';
  if (raw.status === 'CREATED' || raw.status === 'MATCHED' || raw.status === 'SETTLING') return 'RESUBMITTED';
  return 'FAILED';
}

function mapInstruction(raw: RawSettlementInstruction): SettlementInstruction {
  return {
    id: raw.id,
    ref: raw.instructionRef,
    type: (raw.instructionType as SettlementType) ?? 'DVP',
    instrumentCode: raw.instrumentCode ?? '—',
    instrumentName: raw.instrumentName ?? '',
    quantity: toNumber(raw.quantity),
    amount: toNumber(raw.settlementAmount),
    currency: raw.currency ?? 'NGN',
    counterpartyCode: raw.counterpartyCode ?? '',
    counterpartyName: raw.counterpartyName ?? raw.counterpartyCode ?? 'Unknown counterparty',
    depository: raw.depositoryCode ?? '',
    settlementDate: raw.intendedSettlementDate ?? '',
    matchStatus: (raw.matchStatus as SettlementInstruction['matchStatus']) ?? 'UNMATCHED',
    status: normalizeInstructionStatus(raw.status),
    failureReason: raw.failReason ?? undefined,
    matchedWith: undefined,
    submittedAt: raw.matchedAt ?? undefined,
    settledAt: raw.actualSettlementDate ?? undefined,
    createdAt: raw.createdAt ?? '',
  };
}

function mapBatch(raw: RawSettlementBatch): SettlementBatch {
  return {
    id: raw.id,
    batchRef: raw.batchRef,
    depository: raw.depositoryCode ?? '—',
    batchDate: raw.settlementDate ?? '',
    instructionCount: toNumber(raw.totalInstructions),
    netAmount: toNumber(raw.netAmount),
    currency: raw.currency ?? 'NGN',
    status: (raw.status as BatchStatus) ?? 'PREPARING',
    settledCount: toNumber(raw.settledCount),
    failedCount: toNumber(raw.failedCount),
    createdAt: raw.createdAt ?? '',
    completedAt: raw.completedAt ?? undefined,
  };
}

function mapFailed(raw: RawSettlementInstruction): FailedSettlement {
  const failedDate = raw.failedSince ?? raw.actualSettlementDate ?? raw.createdAt ?? '';
  const failedDay = failedDate ? new Date(failedDate) : null;
  const today = new Date();
  const agingDays = failedDay
    ? Math.max(0, Math.floor((today.getTime() - failedDay.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    id: raw.id,
    instructionRef: raw.instructionRef,
    instrumentCode: raw.instrumentCode ?? '—',
    instrumentName: raw.instrumentName ?? '',
    counterpartyCode: raw.counterpartyCode ?? '',
    counterpartyName: raw.counterpartyName ?? raw.counterpartyCode ?? 'Unknown counterparty',
    failReason: raw.failReason ?? 'Settlement failed',
    failDate: failedDate,
    agingDays,
    settlementAmount: toNumber(raw.settlementAmount),
    currency: raw.currency ?? 'NGN',
    penaltyAccrued: toNumber(raw.penaltyAmount),
    status: normalizeFailedStatus(raw),
  };
}

function buildDashboard(
  instructions: RawSettlementInstruction[],
  failed: RawSettlementInstruction[],
  counts?: RawSettlementDashboardCounts,
): SettlementDashboardData {
  const today = formatLocalIsoDate(new Date());
  const todayInstructions = instructions.filter((item) => toIsoDate(item.intendedSettlementDate) === today);
  const settledToday = todayInstructions.filter((item) => item.status === 'SETTLED');
  const pendingToday = todayInstructions.filter((item) => pendingStatuses.has(item.status ?? ''));
  const failedToday = todayInstructions.filter((item) => failedStatuses.has(item.status ?? ''));
  const totalToday = todayInstructions.length;

  const settlementRateByDay = Array.from({ length: 30 }, (_, index) => {
    const date = formatLocalIsoDate(addDays(new Date(), index - 29));
    const items = instructions.filter((item) => toIsoDate(item.intendedSettlementDate) === date);
    const settled = items.filter((item) => item.status === 'SETTLED').length;
    return {
      date,
      count: items.length,
      rate: items.length > 0 ? (settled / items.length) * 100 : 0,
    };
  });

  const failedTrend = Array.from({ length: 30 }, (_, index) => {
    const date = formatLocalIsoDate(addDays(new Date(), index - 29));
    return {
      date,
      count: failed.filter((item) => toIsoDate(item.failedSince ?? item.actualSettlementDate ?? item.createdAt) === date).length,
    };
  });

  const byDepository = Object.values(
    instructions.reduce<Record<string, { depository: string; count: number; value: number }>>((acc, item) => {
      const key = item.depositoryCode ?? 'Unknown';
      const current = acc[key] ?? { depository: key, count: 0, value: 0 };
      current.count += 1;
      current.value += toNumber(item.settlementAmount);
      acc[key] = current;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const topFailingCounterparties = Object.values(
    failed.reduce<Record<string, { counterparty: string; failCount: number; totalAmount: number }>>((acc, item) => {
      const key = item.counterpartyName ?? item.counterpartyCode ?? 'Unknown counterparty';
      const current = acc[key] ?? { counterparty: key, failCount: 0, totalAmount: 0 };
      current.failCount += 1;
      current.totalAmount += toNumber(item.settlementAmount);
      acc[key] = current;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.failCount - a.failCount || b.totalAmount - a.totalAmount)
    .slice(0, 5);

  const settled = settledToday.length || toNumber(counts?.totalSettled);
  const pending = pendingToday.length || toNumber(counts?.totalPending);
  const failedCount = failedToday.length || toNumber(counts?.totalFailed);
  const settledPercent = totalToday > 0 ? (settledToday.length / totalToday) * 100 : 0;

  return {
    totalToday,
    settled,
    pending,
    failed: failedCount,
    settledPercent,
    totalValueSettled: settledToday.reduce((sum, item) => sum + toNumber(item.settlementAmount), 0),
    totalValuePending: pendingToday.reduce((sum, item) => sum + toNumber(item.settlementAmount), 0),
    settlementRateByDay,
    failedTrend,
    byDepository,
    topFailingCounterparties,
    stpRate: instructions.length > 0
      ? (instructions.filter((item) => item.matchStatus === 'MATCHED').length / instructions.length) * 100
      : 0,
  };
}

export const settlementApi = {
  // Instructions
  getInstructions: (params?: { status?: string; dateFrom?: string; dateTo?: string }) =>
    apiGet<RawSettlementInstruction[]>('/api/v1/settlements/instructions', params).then((items) => items.map(mapInstruction)),

  createInstruction: (payload: {
    type: SettlementType;
    instrumentCode: string;
    quantity: number;
    amount: number;
    currency: string;
    counterpartyCode: string;
    depository: string;
    settlementDate: string;
  }) => apiPost<RawSettlementInstruction>('/api/v1/settlements/instructions', {
    instructionType: payload.type,
    instrumentCode: payload.instrumentCode,
    quantity: payload.quantity,
    settlementAmount: payload.amount,
    currency: payload.currency,
    counterpartyCode: payload.counterpartyCode,
    depositoryCode: payload.depository,
    intendedSettlementDate: payload.settlementDate,
  }).then(mapInstruction),

  getInstruction: (ref: string) =>
    apiGet<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}`).then(mapInstruction),

  matchInstructions: (refA: string, refB: string) =>
    apiPostParams<{ matched: boolean }>('/api/v1/settlements/instructions/match', { refA, refB }),

  submitInstruction: (ref: string) =>
    apiPost<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}/submit`).then(mapInstruction),

  recordResult: (ref: string, settled: boolean) =>
    apiPostParams<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}/result`, { settled }).then(mapInstruction),

  // Batches
  getBatches: (params?: { status?: string }) =>
    apiGet<RawSettlementBatch[]>('/api/v1/settlements/batches', params).then((items) => items.map(mapBatch)),

  createBatch: (payload: { instructionRefs: string[]; depository: string }) =>
    apiPost<RawSettlementBatch>('/api/v1/settlements/batches', {
      depositoryCode: payload.depository,
      totalInstructions: payload.instructionRefs.length,
    }).then(mapBatch),

  // Failed
  getFailedSettlements: () =>
    apiGet<RawSettlementInstruction[]>('/api/v1/settlements/failed').then((items) => items.map(mapFailed)),

  // Failed settlement actions
  resubmitSettlement: (ref: string) =>
    apiPost<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}/resubmit`).then(mapInstruction),

  cancelSettlement: (ref: string, reason?: string) =>
    apiPostParams<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}/cancel`, { reason: reason ?? '' }).then(mapInstruction),

  escalateSettlement: (ref: string) =>
    apiPost<RawSettlementInstruction>(`/api/v1/settlements/instructions/${ref}/escalate`).then(mapInstruction),

  // Dashboard
  getDashboard: async () => {
    const [counts, instructions, failed] = await Promise.all([
      apiGet<RawSettlementDashboardCounts>('/api/v1/settlements/dashboard').catch(() => ({})),
      apiGet<RawSettlementInstruction[]>('/api/v1/settlements/instructions'),
      apiGet<RawSettlementInstruction[]>('/api/v1/settlements/failed').catch(() => []),
    ]);
    return buildDashboard(instructions, failed, counts);
  },
};
