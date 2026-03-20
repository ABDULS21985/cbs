import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type {
  FraudAlert,
  FraudRule,
  FraudStats,
  FraudTrend,
  ModelPerformance,
  ScoreTransactionPayload,
  CreateFraudRulePayload,
} from '../types/fraud';

export const fraudApi = {
  // ─── Scoring ────────────────────────────────────────────────────────────────

  /** GET /v1/fraud/score */
  getScoreStatus: () =>
    apiGet<{ status: string }>('/api/v1/fraud/score'),

  /** POST /v1/fraud/score */
  scoreTransaction: (data: ScoreTransactionPayload) =>
    apiPost<{ riskScore: number; maxScore: number; triggeredRules: Array<{ ruleCode: string; ruleName: string; weight: number }>; recommendedAction: string }>('/api/v1/fraud/score', data),

  // ─── Rules ──────────────────────────────────────────────────────────────────

  /** POST /v1/fraud/rules */
  createRule: (data: CreateFraudRulePayload) =>
    apiPost<FraudRule>('/api/v1/fraud/rules', data),

  /** GET /v1/fraud/rules */
  getActiveRules: () =>
    apiGet<FraudRule[]>('/api/v1/fraud/rules'),

  /** PATCH /v1/fraud/rules/{id}/toggle */
  toggleRule: (id: number) =>
    apiPatch<FraudRule>(`/api/v1/fraud/rules/${id}/toggle`),

  // ─── Alerts ─────────────────────────────────────────────────────────────────

  /** GET /v1/fraud/alerts */
  getAlerts: (params?: { status?: string; page?: number; size?: number }) =>
    apiGet<FraudAlert[]>('/api/v1/fraud/alerts', params as Record<string, unknown>),

  /** GET /v1/fraud/alerts/{id} */
  getAlert: (id: number) =>
    apiGet<FraudAlert>(`/api/v1/fraud/alerts/${id}`),

  /** POST /v1/fraud/alerts/{id}/assign */
  assignAlert: (id: number, assignedTo: string) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${id}/assign`, { assignedTo }),

  /** POST /v1/fraud/alerts/{id}/resolve */
  resolveAlert: (id: number, data: { resolution: string; resolvedBy: string }) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${id}/resolve`, data),

  /** GET /v1/fraud/alerts/{alertId}/transactions */
  getAlertTransactions: (alertId: number) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/fraud/alerts/${alertId}/transactions`),

  // ─── Alert Actions ──────────────────────────────────────────────────────────

  /** POST /v1/fraud/alerts/{alertId}/block-card */
  blockCard: (alertId: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${alertId}/block-card`),

  /** POST /v1/fraud/alerts/{alertId}/block-account */
  blockAccount: (alertId: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${alertId}/block-account`),

  /** POST /v1/fraud/alerts/{alertId}/allow */
  allowTransaction: (alertId: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${alertId}/allow`),

  /** POST /v1/fraud/alerts/{alertId}/dismiss */
  dismissAlert: (alertId: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${alertId}/dismiss`),

  /** POST /v1/fraud/alerts/{alertId}/file-case */
  fileCase: (alertId: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${alertId}/file-case`),

  // ─── Dashboard & Stats ──────────────────────────────────────────────────────

  /** GET /v1/fraud */
  listAll: (params?: Record<string, unknown>) =>
    apiGet<FraudAlert[]>('/api/v1/fraud', params),

  /** GET /v1/fraud/stats */
  getStats: () =>
    apiGet<FraudStats>('/api/v1/fraud/stats'),

  /** GET /v1/fraud/trend */
  getTrend: () =>
    apiGet<FraudTrend>('/api/v1/fraud/trend'),

  /** GET /v1/fraud/model-performance */
  getModelPerformance: () =>
    apiGet<ModelPerformance>('/api/v1/fraud/model-performance'),
};
