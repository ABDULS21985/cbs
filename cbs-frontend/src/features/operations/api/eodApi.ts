import { apiGet, apiPost, apiPut } from '@/lib/api';

export type EodStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type EodRunStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

export interface EodStep {
  id: string;
  name: string;
  label: string;
  shortLabel: string;
  status: EodStepStatus;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  errorDetail?: string;
  affectedCount?: number;
}

export interface EodRun {
  id: string;
  businessDate: string;
  status: EodRunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: string;
  stepsTotal: number;
  stepsCompleted: number;
  stepsFailed: number;
  steps: EodStep[];
}

export interface EodLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface EodHistoryRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  stepsOk: number;
  stepsFailed: number;
  status: EodRunStatus;
}

export interface EodDurationPoint {
  date: string;
  durationMs: number;
}

export interface EodScheduleConfig {
  autoTrigger: boolean;
  scheduledTime: string;
  blockIfUnclosedBranches: boolean;
  notificationEmails: string[];
  autoRetry: boolean;
  maxRetries: number;
}

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ---- Demo Data ----

const STEP_DEFINITIONS = [
  { id: 'PRE_CHECK', name: 'PRE_CHECK', label: 'Pre-Check Validation', shortLabel: 'Pre-Check' },
  { id: 'TXN_CUTOFF', name: 'TXN_CUTOFF', label: 'Transaction Cut-Off', shortLabel: 'Txn Cutoff' },
  { id: 'INTEREST_ACCRUAL', name: 'INTEREST_ACCRUAL', label: 'Interest Accrual', shortLabel: 'Interest' },
  { id: 'FEES_POSTING', name: 'FEES_POSTING', label: 'Fees Posting', shortLabel: 'Fees' },
  { id: 'FX_REVALUE', name: 'FX_REVALUE', label: 'FX Revaluation', shortLabel: 'FX Reval' },
  { id: 'GL_POSTING', name: 'GL_POSTING', label: 'GL Posting', shortLabel: 'GL Post' },
  { id: 'REPORTS_GEN', name: 'REPORTS_GEN', label: 'Reports Generation', shortLabel: 'Reports' },
  { id: 'DAY_CLOSE', name: 'DAY_CLOSE', label: 'Day Close', shortLabel: 'Day Close' },
];

let demoRunState: EodRun | null = null;
let demoLogs: EodLogEntry[] = [];
let demoStepIndex = 0;
let demoStepStartTime: number | null = null;

function buildInitialIdleRun(): EodRun {
  return {
    id: 'run-idle',
    businessDate: '2026-03-18',
    status: 'IDLE',
    startedAt: '',
    triggeredBy: '',
    stepsTotal: 8,
    stepsCompleted: 0,
    stepsFailed: 0,
    steps: STEP_DEFINITIONS.map((s) => ({ ...s, status: 'PENDING' as EodStepStatus })),
  };
}

function generateDemoLogs(stepName: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): EodLogEntry[] {
  const now = new Date().toISOString();
  const entries: Record<string, EodLogEntry[]> = {
    PRE_CHECK: [
      { timestamp: now, level: 'INFO', message: '[PRE_CHECK] Starting pre-check validation...' },
      { timestamp: now, level: 'INFO', message: '  Checking open transactions...' },
      { timestamp: now, level: 'INFO', message: '  Open transactions: 0' },
      { timestamp: now, level: 'INFO', message: '  Verifying branch sign-off statuses...' },
      { timestamp: now, level: 'INFO', message: '  All 24 branches signed off.' },
      { timestamp: now, level: 'INFO', message: '[PRE_CHECK] Completed in 1.2s. All checks passed.' },
    ],
    TXN_CUTOFF: [
      { timestamp: now, level: 'INFO', message: '[TXN_CUTOFF] Initiating transaction cut-off...' },
      { timestamp: now, level: 'INFO', message: '  Locking new transaction entries for 2026-03-18...' },
      { timestamp: now, level: 'INFO', message: '  Flushing pending queue: 1,482 transactions' },
      { timestamp: now, level: 'WARN', message: '  2 transactions flagged for manual review.' },
      { timestamp: now, level: 'INFO', message: '[TXN_CUTOFF] Completed. 1,480 transactions settled.' },
    ],
    INTEREST_ACCRUAL: [
      { timestamp: now, level: 'INFO', message: '[INTEREST_ACCRUAL] Computing daily interest accruals...' },
      { timestamp: now, level: 'INFO', message: '  Processing 94,302 active accounts...' },
      { timestamp: now, level: 'INFO', message: '  Savings accounts: 71,204 | Current: 23,098' },
      { timestamp: now, level: 'INFO', message: '  Total accrual amount: ₦48,302,178.55' },
      { timestamp: now, level: 'INFO', message: '[INTEREST_ACCRUAL] Completed. 94,302 accounts processed.' },
    ],
    FEES_POSTING: [
      { timestamp: now, level: 'INFO', message: '[FEES_POSTING] Posting account maintenance fees...' },
      { timestamp: now, level: 'INFO', message: '  SMS fee: 12,044 accounts' },
      { timestamp: now, level: 'INFO', message: '  Monthly maintenance: 3,201 accounts' },
      { timestamp: now, level: 'INFO', message: '  Total fees: ₦6,204,500.00' },
      { timestamp: now, level: 'INFO', message: '[FEES_POSTING] Completed.' },
    ],
    FX_REVALUE: [
      { timestamp: now, level: 'INFO', message: '[FX_REVALUE] Running FX revaluation...' },
      { timestamp: now, level: 'INFO', message: '  Fetching CBN rates for 2026-03-18...' },
      { timestamp: now, level: 'INFO', message: '  USD/NGN: 1,598.50 | EUR/NGN: 1,742.30 | GBP/NGN: 2,011.80' },
      { timestamp: now, level: 'INFO', message: '  Revaluing 1,204 FCY accounts...' },
      { timestamp: now, level: 'INFO', message: '[FX_REVALUE] Completed. Net revaluation: ₦2,104,880.00' },
    ],
    GL_POSTING: [
      { timestamp: now, level: 'INFO', message: '[GL_POSTING] Posting to General Ledger...' },
      { timestamp: now, level: 'INFO', message: '  Generating journal entries...' },
      { timestamp: now, level: 'INFO', message: '  Total debit entries: 48,302' },
      { timestamp: now, level: 'INFO', message: '  Total credit entries: 48,302' },
      { timestamp: now, level: 'INFO', message: '  Verifying trial balance...' },
      { timestamp: now, level: 'INFO', message: '  Trial balance check: PASSED' },
      { timestamp: now, level: 'INFO', message: '[GL_POSTING] Completed. GL balanced.' },
    ],
    REPORTS_GEN: [
      { timestamp: now, level: 'INFO', message: '[REPORTS_GEN] Generating end-of-day reports...' },
      { timestamp: now, level: 'INFO', message: '  Daily Balance Sheet...' },
      { timestamp: now, level: 'INFO', message: '  CBN Returns (BSS, BRP, CRR)...' },
      { timestamp: now, level: 'INFO', message: '  Regulatory reports dispatched to /reports/2026-03-18/' },
      { timestamp: now, level: 'INFO', message: '[REPORTS_GEN] 12 reports generated.' },
    ],
    DAY_CLOSE: [
      { timestamp: now, level: 'INFO', message: '[DAY_CLOSE] Closing business day 2026-03-18...' },
      { timestamp: now, level: 'INFO', message: '  Updating system date to 2026-03-19...' },
      { timestamp: now, level: 'INFO', message: '  Archiving EOD state...' },
      { timestamp: now, level: 'INFO', message: '  Business day closed successfully.' },
      { timestamp: now, level: 'INFO', message: '[DAY_CLOSE] EOD run completed in 14m 32s.' },
    ],
  };
  if (level === 'ERROR') {
    return [
      { timestamp: now, level: 'ERROR', message: `[${stepName}] FAILED: Unexpected error during processing.` },
      { timestamp: now, level: 'ERROR', message: '  java.lang.RuntimeException: Constraint violation on account ACC_0039281' },
      { timestamp: now, level: 'ERROR', message: '  at com.cbs.eod.processor.StepExecutor.execute(StepExecutor.java:142)' },
    ];
  }
  return entries[stepName] || [{ timestamp: now, level: 'INFO', message: `[${stepName}] Processing...` }];
}

function generateHistoryRows(): EodHistoryRow[] {
  const rows: EodHistoryRow[] = [];
  for (let i = 1; i <= 30; i++) {
    const date = new Date('2026-03-18');
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const durationMs = 780_000 + Math.floor(Math.random() * 480_000);
    const startHour = 22 + Math.floor(Math.random() * 2);
    const startMin = Math.floor(Math.random() * 30);
    const startTime = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
    const endDate = new Date(new Date(startTime).getTime() + durationMs);
    const failed = Math.random() < 0.05;
    rows.push({
      id: `run-hist-${i}`,
      date: dateStr,
      startTime,
      endTime: endDate.toISOString(),
      durationMs,
      stepsOk: failed ? 6 + Math.floor(Math.random() * 2) : 8,
      stepsFailed: failed ? 1 : 0,
      status: failed ? 'FAILED' : 'COMPLETED',
    });
  }
  return rows;
}

const DEMO_HISTORY = generateHistoryRows();

function generateDurationTrend(days = 30): EodDurationPoint[] {
  const points: EodDurationPoint[] = [];
  for (let i = days; i >= 1; i--) {
    const date = new Date('2026-03-18');
    date.setDate(date.getDate() - i);
    points.push({
      date: date.toISOString().split('T')[0],
      durationMs: 780_000 + Math.floor(Math.random() * 480_000),
    });
  }
  return points;
}

const DEMO_SCHEDULE: EodScheduleConfig = {
  autoTrigger: true,
  scheduledTime: '22:00',
  blockIfUnclosedBranches: true,
  notificationEmails: ['eod-ops@cbabank.ng', 'fincontrol@cbabank.ng'],
  autoRetry: true,
  maxRetries: 3,
};

// ---- Demo Run Simulation ----

function advanceDemoRun(): void {
  if (!demoRunState || demoRunState.status !== 'RUNNING') return;
  const now = Date.now();
  if (demoStepStartTime === null) demoStepStartTime = now;
  const elapsed = now - demoStepStartTime;

  if (demoStepIndex >= STEP_DEFINITIONS.length) {
    demoRunState.status = 'COMPLETED';
    demoRunState.completedAt = new Date().toISOString();
    demoRunState.durationMs = now - new Date(demoRunState.startedAt).getTime();
    return;
  }

  const stepDuration = 3000 + demoStepIndex * 500;

  if (elapsed < stepDuration) {
    demoRunState.steps[demoStepIndex].status = 'RUNNING';
    demoRunState.steps[demoStepIndex].startedAt = new Date(demoStepStartTime).toISOString();
  } else {
    const stepName = STEP_DEFINITIONS[demoStepIndex].name;
    const newLogs = generateDemoLogs(stepName);
    demoLogs.push(...newLogs);
    demoRunState.steps[demoStepIndex].status = 'COMPLETED';
    demoRunState.steps[demoStepIndex].completedAt = new Date().toISOString();
    demoRunState.steps[demoStepIndex].durationMs = elapsed;
    demoRunState.steps[demoStepIndex].affectedCount = Math.floor(Math.random() * 90000) + 1000;
    demoRunState.stepsCompleted = demoStepIndex + 1;
    demoStepIndex++;
    demoStepStartTime = now;
  }
}

export const eodApi = {
  getCurrentStatus: async (): Promise<EodRun> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      if (!demoRunState) {
        demoRunState = buildInitialIdleRun();
      }
      advanceDemoRun();
      return { ...demoRunState, steps: demoRunState.steps.map((s) => ({ ...s })) };
    }
    return apiGet<EodRun>('/v1/eod/status');
  },

  triggerEod: async (businessDate: string): Promise<EodRun> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      demoStepIndex = 0;
      demoStepStartTime = null;
      demoLogs = [];
      const runId = `run-${Date.now()}`;
      demoRunState = {
        id: runId,
        businessDate,
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
        triggeredBy: 'admin@cbabank.ng',
        stepsTotal: 8,
        stepsCompleted: 0,
        stepsFailed: 0,
        steps: STEP_DEFINITIONS.map((s) => ({ ...s, status: 'PENDING' as EodStepStatus })),
      };
      demoLogs.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `[SYSTEM] EOD run initiated for business date ${businessDate} by admin@cbabank.ng`,
      });
      return { ...demoRunState };
    }
    return apiPost<EodRun>('/v1/eod/trigger', { businessDate });
  },

  getStepProgress: async (runId: string): Promise<EodStep[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      if (!demoRunState || demoRunState.id !== runId) return [];
      advanceDemoRun();
      return demoRunState.steps.map((s) => ({ ...s }));
    }
    return apiGet<EodStep[]>(`/v1/eod/runs/${runId}/steps`);
  },

  getLogs: async (runId: string, cursor?: string): Promise<{ entries: EodLogEntry[]; nextCursor?: string }> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 100));
      const offset = cursor ? parseInt(cursor, 10) : 0;
      const slice = demoLogs.slice(offset, offset + 200);
      return {
        entries: slice,
        nextCursor: offset + 200 < demoLogs.length ? String(offset + 200) : undefined,
      };
    }
    return apiGet<{ entries: EodLogEntry[]; nextCursor?: string }>(`/v1/eod/runs/${runId}/logs`, cursor ? { cursor } : undefined);
  },

  retryStep: async (runId: string, stepId: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      if (!demoRunState) return;
      const step = demoRunState.steps.find((s) => s.id === stepId);
      if (step) {
        step.status = 'RUNNING';
        step.errorMessage = undefined;
        step.errorDetail = undefined;
        demoRunState.status = 'RUNNING';
        demoRunState.stepsFailed = Math.max(0, demoRunState.stepsFailed - 1);
        demoLogs.push({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: `[SYSTEM] Retrying step ${stepId} as requested by operator.`,
        });
        demoStepIndex = demoRunState.steps.findIndex((s) => s.id === stepId);
        demoStepStartTime = null;
      }
      return;
    }
    await apiPost<void>(`/v1/eod/runs/${runId}/steps/${stepId}/retry`);
  },

  skipStep: async (runId: string, stepId: string, reason: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      if (!demoRunState) return;
      const step = demoRunState.steps.find((s) => s.id === stepId);
      if (step) {
        step.status = 'SKIPPED';
        step.errorMessage = undefined;
        demoRunState.stepsCompleted += 1;
        demoRunState.stepsFailed = Math.max(0, demoRunState.stepsFailed - 1);
        demoRunState.status = 'RUNNING';
        demoLogs.push({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          message: `[SYSTEM] Step ${stepId} skipped. Reason: ${reason}`,
        });
        demoStepIndex = demoRunState.steps.findIndex((s) => s.id === stepId) + 1;
        demoStepStartTime = null;
      }
      return;
    }
    await apiPost<void>(`/v1/eod/runs/${runId}/steps/${stepId}/skip`, { reason });
  },

  rollbackRun: async (runId: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 1200));
      if (!demoRunState) return;
      demoRunState.status = 'ROLLED_BACK';
      demoRunState.completedAt = new Date().toISOString();
      demoRunState.steps.forEach((s) => {
        if (s.status === 'COMPLETED') s.status = 'PENDING';
        if (s.status === 'RUNNING') s.status = 'PENDING';
      });
      demoLogs.push({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: '[SYSTEM] EOD run rolled back. All GL entries reversed.',
      });
      return;
    }
    await apiPost<void>(`/v1/eod/runs/${runId}/rollback`);
  },

  getHistory: async (params?: { page?: number; pageSize?: number }): Promise<EodHistoryRow[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      const page = params?.page ?? 0;
      const size = params?.pageSize ?? 30;
      return DEMO_HISTORY.slice(page * size, page * size + size);
    }
    return apiGet<EodHistoryRow[]>('/v1/eod/history', params as Record<string, unknown>);
  },

  getDurationTrend: async (days = 30): Promise<EodDurationPoint[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return generateDurationTrend(days);
    }
    return apiGet<EodDurationPoint[]>('/v1/eod/duration-trend', { days });
  },

  getScheduleConfig: async (): Promise<EodScheduleConfig> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return { ...DEMO_SCHEDULE };
    }
    return apiGet<EodScheduleConfig>('/v1/eod/schedule');
  },

  saveScheduleConfig: async (config: EodScheduleConfig): Promise<EodScheduleConfig> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      Object.assign(DEMO_SCHEDULE, config);
      return { ...DEMO_SCHEDULE };
    }
    return apiPut<EodScheduleConfig>('/v1/eod/schedule', config);
  },
};
