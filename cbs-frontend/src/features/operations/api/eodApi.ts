import { apiGet, apiPost, apiPut } from '@/lib/api';

/* ─── Step statuses from EodStep.status (String in backend) ─── */
export type EodStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

/* ─── Run statuses from EodRun.status (String in backend) ─── */
export type EodRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

/**
 * Maps to com.cbs.eod.entity.EodStep (Jackson-serialized).
 * Field names match the Java entity exactly.
 */
export interface EodStep {
  id: number;
  stepOrder: number;
  stepName: string;
  stepDescription?: string | null;
  status: EodStepStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  recordsProcessed?: number | null;
  errorMessage?: string | null;
  createdAt?: string;
}

/**
 * Maps to com.cbs.eod.entity.EodRun (Jackson-serialized).
 * Field names match the Java entity exactly.
 */
export interface EodRun {
  id: number;
  businessDate: string;
  runType: 'EOD' | 'EOM' | 'EOQ' | 'EOY';
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  status: EodRunStatus;
  errorMessage?: string | null;
  initiatedBy?: string | null;
  createdAt?: string;
  steps: EodStep[];
}

/** Synthesized log entry from backend step data */
export interface EodLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

/** For display in the history table */
export interface EodHistoryRow {
  id: number;
  businessDate: string;
  runType: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  status: EodRunStatus;
  initiatedBy: string | null;
}

/** Duration trend data point */
export interface EodDurationPoint {
  date: string;
  durationSeconds: number;
  status: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
}

/**
 * Maps to com.cbs.eod.entity.EodScheduleConfig (Jackson-serialized).
 */
export interface EodScheduleConfig {
  id?: number;
  autoTrigger: boolean;
  scheduledTime: string;
  blockIfUnclosedBranches: boolean;
  notificationEmails: string | null;
  autoRetry: boolean;
  maxRetries: number;
}

/* ─── Helper: map EodRun → EodHistoryRow ─── */
function toHistoryRow(run: EodRun): EodHistoryRow {
  return {
    id: run.id,
    businessDate: run.businessDate,
    runType: run.runType,
    startedAt: run.startedAt ?? null,
    completedAt: run.completedAt ?? null,
    durationSeconds: run.durationSeconds ?? null,
    totalSteps: run.totalSteps,
    completedSteps: run.completedSteps,
    failedSteps: run.failedSteps,
    status: run.status,
    initiatedBy: run.initiatedBy ?? null,
  };
}

export const eodApi = {
  /**
   * GET /v1/eod/status → returns last EodRun with steps (or null).
   */
  getCurrentStatus: async (): Promise<EodRun | null> => {
    return apiGet<EodRun | null>('/api/v1/eod/status');
  },

  /**
   * POST /v1/eod/trigger?businessDate=...&initiatedBy=MANUAL
   * Backend expects query params, not a JSON body.
   */
  triggerEod: async (businessDate: string): Promise<EodRun> => {
    return apiPost<EodRun>(
      `/api/v1/eod/trigger?businessDate=${businessDate}&initiatedBy=MANUAL`,
    );
  },

  /**
   * GET /v1/eod/runs/{runId}/steps
   */
  getStepProgress: async (runId: number): Promise<EodStep[]> => {
    return apiGet<EodStep[]>(`/api/v1/eod/runs/${runId}/steps`);
  },

  /**
   * GET /v1/eod/runs/{runId}/logs?cursor=...
   * Returns { entries, nextCursor }.
   */
  getLogs: async (
    runId: number,
    cursor?: string,
  ): Promise<{ entries: EodLogEntry[]; nextCursor?: string }> => {
    return apiGet<{ entries: EodLogEntry[]; nextCursor?: string }>(
      `/api/v1/eod/runs/${runId}/logs`,
      cursor ? { cursor } : undefined,
    );
  },

  /**
   * POST /v1/eod/runs/{runId}/steps/{stepId}/retry
   */
  retryStep: async (runId: number, stepId: number): Promise<EodStep> => {
    return apiPost<EodStep>(`/api/v1/eod/runs/${runId}/steps/${stepId}/retry`);
  },

  /**
   * POST /v1/eod/runs/{runId}/steps/{stepId}/skip
   */
  skipStep: async (runId: number, stepId: number, reason: string): Promise<EodStep> => {
    return apiPost<EodStep>(`/api/v1/eod/runs/${runId}/steps/${stepId}/skip`, { reason });
  },

  /**
   * POST /v1/eod/runs/{runId}/rollback
   */
  rollbackRun: async (runId: number): Promise<EodRun> => {
    return apiPost<EodRun>(`/api/v1/eod/runs/${runId}/rollback`);
  },

  /**
   * GET /v1/eod/history?page=...&size=...
   * Backend returns List<EodRun>; we map to EodHistoryRow for the table.
   */
  getHistory: async (params?: { page?: number; size?: number }): Promise<EodHistoryRow[]> => {
    const runs = await apiGet<EodRun[]>('/api/v1/eod/history', params as Record<string, unknown>);
    return runs.map(toHistoryRow);
  },

  /**
   * GET /v1/eod/duration-trend
   * Backend returns List<Map> with durationSeconds (not durationMs).
   */
  getDurationTrend: async (): Promise<EodDurationPoint[]> => {
    return apiGet<EodDurationPoint[]>('/api/v1/eod/duration-trend');
  },

  /**
   * GET /v1/eod/schedule/config
   */
  getScheduleConfig: async (): Promise<EodScheduleConfig> => {
    return apiGet<EodScheduleConfig>('/api/v1/eod/schedule/config');
  },

  /**
   * PUT /v1/eod/schedule/config
   */
  saveScheduleConfig: async (config: EodScheduleConfig): Promise<EodScheduleConfig> => {
    return apiPut<EodScheduleConfig>('/api/v1/eod/schedule/config', config);
  },
};
