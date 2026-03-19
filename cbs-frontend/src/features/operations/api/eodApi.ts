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

export const eodApi = {
  getCurrentStatus: async (): Promise<EodRun> => {
    return apiGet<EodRun>('/v1/eod/status');
  },

  triggerEod: async (businessDate: string): Promise<EodRun> => {
    return apiPost<EodRun>('/v1/eod/trigger', { businessDate });
  },

  getStepProgress: async (runId: string): Promise<EodStep[]> => {
    return apiGet<EodStep[]>(`/v1/eod/runs/${runId}/steps`);
  },

  getLogs: async (runId: string, cursor?: string): Promise<{ entries: EodLogEntry[]; nextCursor?: string }> => {
    return apiGet<{ entries: EodLogEntry[]; nextCursor?: string }>(`/v1/eod/runs/${runId}/logs`, cursor ? { cursor } : undefined);
  },

  retryStep: async (runId: string, stepId: string): Promise<void> => {
    await apiPost<void>(`/v1/eod/runs/${runId}/steps/${stepId}/retry`);
  },

  skipStep: async (runId: string, stepId: string, reason: string): Promise<void> => {
    await apiPost<void>(`/v1/eod/runs/${runId}/steps/${stepId}/skip`, { reason });
  },

  rollbackRun: async (runId: string): Promise<void> => {
    await apiPost<void>(`/v1/eod/runs/${runId}/rollback`);
  },

  getHistory: async (params?: { page?: number; pageSize?: number }): Promise<EodHistoryRow[]> => {
    return apiGet<EodHistoryRow[]>('/v1/eod/history', params as Record<string, unknown>);
  },

  getDurationTrend: async (days = 30): Promise<EodDurationPoint[]> => {
    return apiGet<EodDurationPoint[]>('/v1/eod/duration-trend', { days });
  },

  getScheduleConfig: async (): Promise<EodScheduleConfig> => {
    return apiGet<EodScheduleConfig>('/v1/eod/schedule');
  },

  saveScheduleConfig: async (config: EodScheduleConfig): Promise<EodScheduleConfig> => {
    return apiPut<EodScheduleConfig>('/v1/eod/schedule', config);
  },
};
