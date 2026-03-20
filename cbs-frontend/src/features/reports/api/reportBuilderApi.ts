import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VisualizationType = 'TABLE' | 'BAR_CHART' | 'LINE_CHART' | 'PIE_CHART' | 'SUMMARY_CARDS' | 'COMBINED';
export type FilterOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'is_null' | 'is_not_null';
export type ScheduleType = 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface DataField {
  id: string;
  name: string;
  displayName: string;
  type: 'TEXT' | 'NUMBER' | 'MONEY' | 'DATE' | 'BOOLEAN';
  aggregatable: boolean;
  filterable: boolean;
  groupable: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  category: string;
  fields: DataField[];
}

export interface ReportColumn {
  fieldId: string;
  fieldName: string;
  displayName: string;
  type: string;
  aggregation?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'NONE';
  format?: 'MONEY' | 'PERCENT' | 'NUMBER' | 'DATE' | 'TEXT';
}

export interface ReportFilter {
  id: string;
  fieldId: string;
  fieldName: string;
  operator: FilterOperator;
  value: string | string[];
}

export interface ReportConfig {
  dataSources: string[];
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  limit?: number;
  visualization: VisualizationType;
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    title?: string;
  };
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  schedule: ScheduleType;
  config: ReportConfig;
  savedTo: 'MY_REPORTS' | 'SHARED' | 'DEPARTMENT';
}

export interface CreateReportRequest extends Omit<SavedReport, 'id' | 'createdBy' | 'createdAt' | 'lastRun'> {
  deliveryEmails?: string[];
  exportFormat?: 'PDF' | 'EXCEL' | 'CSV';
  scheduleTime?: string;
  scheduleDay?: string;
}

export interface ReportResult {
  reportId: string;
  runAt: string;
  rowCount: number;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, unknown>[];
  summary?: Record<string, number>;
  executionId?: number;
  durationMs?: number;
}

export interface ReportExecutionRecord {
  id: number;
  reportId: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  rowCount?: number;
  durationMs?: number;
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SchedulePayload {
  frequency: ScheduleType;
  time?: string;
  day?: string;
  timezone?: string;
  formats?: string[];
  recipients?: string[];
  onlyIfChanged?: boolean;
}

// ─── Exported API ─────────────────────────────────────────────────────────────

export const reportBuilderApi = {
  getSavedReports: (params?: { owner?: 'mine' | 'shared' | 'all' }): Promise<SavedReport[]> =>
    apiGet<SavedReport[]>('/api/v1/reports/custom', params as Record<string, unknown>),

  getReport: (id: string): Promise<SavedReport> =>
    apiGet<SavedReport>(`/api/v1/reports/custom/${id}`),

  createReport: (data: CreateReportRequest): Promise<SavedReport> =>
    apiPost<SavedReport>('/api/v1/reports/custom/save', data),

  updateReport: (id: string, data: Partial<CreateReportRequest>): Promise<SavedReport> =>
    apiPost<SavedReport>('/api/v1/reports/custom/save', { id, ...data }),

  deleteReport: (id: string): Promise<void> =>
    apiDelete<void>(`/api/v1/reports/custom/${id}`),

  runReport: (id: string, params?: Record<string, string>): Promise<ReportResult> =>
    apiPost<ReportResult>(`/api/v1/reports/custom/${id}/run`, params),

  getMyReports: (): Promise<SavedReport[]> =>
    apiGet<SavedReport[]>('/api/v1/reports/custom/mine'),

  getRunHistory: (id: string): Promise<ReportExecutionRecord[]> =>
    apiGet<ReportExecutionRecord[]>(`/api/v1/reports/custom/${id}/history`),

  updateSchedule: (id: string, schedule: SchedulePayload): Promise<SavedReport> =>
    apiPost<SavedReport>(`/api/v1/reports/custom/${id}/schedule`, schedule),

  getDataSources: (): Promise<DataSource[]> =>
    apiGet<DataSource[]>('/api/v1/reports/custom/data-sources'),

  shareReport: (id: string, emails: string[]): Promise<void> =>
    apiPost<void>(`/api/v1/reports/custom/${id}/share`, { emails }),

  generatePreview: (config: ReportConfig): Promise<ReportResult> =>
    apiPost<ReportResult>('/api/v1/reports/custom/preview', config),

  cloneReport: (id: string): Promise<SavedReport> =>
    apiPost<SavedReport>(`/api/v1/reports/custom/${id}/clone`, {}),

  // Alias used by the 6-step wizard
  saveReport: (data: CreateReportRequest): Promise<SavedReport> =>
    apiPost<SavedReport>('/api/v1/reports/custom/save', data),
};
