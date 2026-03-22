import { apiGet, apiPost, apiPostParams } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegulatoryReportDefinition {
  id: number;
  reportCode: string;
  reportName: string;
  regulator: string;
  frequency: string;
  category: string;
  format: string;
  active: boolean;
  templateConfig?: string;
  sqlQuery?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegulatoryReportRun {
  id: number;
  reportCode: string;
  reportName: string;
  regulator: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  generatedAt?: string;
  submittedAt?: string;
  submittedBy?: string;
  acknowledgedAt?: string;
  acknowledgementRef?: string;
  outputUrl?: string;
  errorMessage?: string;
  rowCount?: number;
}

export interface CreateDefinitionPayload {
  reportCode: string;
  reportName: string;
  regulator: string;
  frequency: string;
  category: string;
  format: string;
  sqlQuery?: string;
  active?: boolean;
}

// ─── Exported API ─────────────────────────────────────────────────────────────

export const regulatoryReportApi = {
  createDefinition: (data: CreateDefinitionPayload): Promise<RegulatoryReportDefinition> =>
    apiPost<RegulatoryReportDefinition>('/api/v1/regulatory/definitions', data),

  getDefinitions: (): Promise<RegulatoryReportDefinition[]> =>
    apiGet<RegulatoryReportDefinition[]>('/api/v1/regulatory/definitions'),

  getDefinitionsByRegulator: (regulator: string): Promise<RegulatoryReportDefinition[]> =>
    apiGet<RegulatoryReportDefinition[]>(`/api/v1/regulatory/definitions/regulator/${regulator}`),

  generateReport: (params: { reportCode: string; periodStart: string; periodEnd: string }): Promise<RegulatoryReportRun> =>
    apiPostParams<RegulatoryReportRun>('/api/v1/regulatory/generate', params as unknown as Record<string, unknown>),

  submitRun: (runId: number): Promise<RegulatoryReportRun> =>
    apiPost<RegulatoryReportRun>(`/api/v1/regulatory/runs/${runId}/submit`, {}),

  getRuns: (reportCode: string, params?: { page?: number; size?: number }): Promise<RegulatoryReportRun[]> =>
    apiGet<RegulatoryReportRun[]>(`/api/v1/regulatory/runs/${reportCode}`, params as Record<string, unknown>),
};
