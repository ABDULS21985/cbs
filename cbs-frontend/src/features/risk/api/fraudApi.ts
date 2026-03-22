import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type {
  FraudAlert,
  FraudAlertSeverity,
  FraudRule,
  FraudStats,
  FraudTransaction,
  FraudTrendPoint,
  ModelPerformance,
} from '../types/fraud';

interface RawFraudAlert {
  id: number;
  alertRef: string;
  customerId: number;
  accountId?: number | null;
  transactionRef?: string | null;
  riskScore: number;
  triggeredRules?: string[];
  channel?: string | null;
  geoLocation?: string | null;
  description: string;
  actionTaken?: string | null;
  status: string;
  assignedTo?: string | null;
  createdAt: string;
}

interface RawFraudStats {
  total?: number;
  new?: number;
  investigating?: number;
  resolved?: number;
}

interface RawFraudTrendResponse {
  recentAlerts?: RawFraudAlert[];
}

interface RawFraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleCategory: string;
  description?: string | null;
  severity?: string | null;
  scoreWeight?: number | null;
  applicableChannels?: string | null;
  isActive: boolean;
}

interface RawFraudModelPerformance {
  totalAlerts?: number;
  resolvedAlerts?: number;
  falsePositives?: number;
  detectionRate?: number;
  falsePositiveRate?: number;
}

function severityFromScore(score: number): FraudAlertSeverity {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function mapAlert(raw: RawFraudAlert): FraudAlert {
  return {
    id: raw.id,
    alertNumber: raw.alertRef,
    severity: severityFromScore(raw.riskScore ?? 0),
    type: raw.channel ? `${raw.channel} alert` : 'Fraud alert',
    customerLabel: `Customer #${raw.customerId}`,
    accountLabel: raw.accountId ? `Account #${raw.accountId}` : undefined,
    location: raw.geoLocation ?? undefined,
    score: raw.riskScore ?? 0,
    rules: raw.triggeredRules ?? [],
    createdAt: raw.createdAt,
    status: (raw.status ?? 'NEW') as FraudAlert['status'],
    channel: raw.channel ?? undefined,
    assignedTo: raw.assignedTo ?? null,
    description: raw.description,
    actionTaken: raw.actionTaken ?? null,
    transactionRef: raw.transactionRef ?? null,
  };
}

function mapRule(raw: RawFraudRule): FraudRule {
  return {
    id: raw.id,
    ruleCode: raw.ruleCode,
    ruleName: raw.ruleName,
    description: raw.description ?? 'No rule description provided.',
    category: raw.ruleCategory,
    severity: (raw.severity as FraudAlertSeverity | null) ?? severityFromScore(raw.scoreWeight ?? 0),
    scoreWeight: raw.scoreWeight ?? 0,
    applicableChannels: raw.applicableChannels ?? 'ALL',
    active: raw.isActive,
  };
}

function buildTrendPoints(alerts: RawFraudAlert[], days: number): FraudTrendPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(days - 1, 0));

  const grouped = new Map<string, { alertCount: number; investigatingCount: number; scoreTotal: number }>();
  for (const alert of alerts) {
    const createdAt = new Date(alert.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt < cutoff) {
      continue;
    }
    const key = createdAt.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? { alertCount: 0, investigatingCount: 0, scoreTotal: 0 };
    current.alertCount += 1;
    if (alert.status === 'INVESTIGATING') {
      current.investigatingCount += 1;
    }
    current.scoreTotal += alert.riskScore ?? 0;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      alertCount: value.alertCount,
      investigatingCount: value.investigatingCount,
      averageRiskScore: value.alertCount > 0 ? value.scoreTotal / value.alertCount : 0,
    }));
}

function mapTransaction(entry: Record<string, unknown>): FraudTransaction | null {
  const timestamp = typeof entry.timestamp === 'string'
    ? entry.timestamp
    : typeof entry.createdAt === 'string'
      ? entry.createdAt
      : null;
  const amountValue = entry.amount;
  const amount = typeof amountValue === 'number'
    ? amountValue
    : typeof amountValue === 'string'
      ? Number(amountValue)
      : NaN;

  if (!timestamp || Number.isNaN(amount)) {
    return null;
  }

  const idValue = entry.id;
  const id = typeof idValue === 'number'
    ? idValue
    : typeof idValue === 'string'
      ? Number(idValue)
      : NaN;

  if (Number.isNaN(id)) {
    return null;
  }

  return {
    id,
    timestamp,
    amount,
    currency: typeof entry.currency === 'string' ? entry.currency : 'NGN',
    channel: (typeof entry.channel === 'string' ? entry.channel : 'TRANSFER') as FraudTransaction['channel'],
    merchantName: typeof entry.merchantName === 'string' ? entry.merchantName : undefined,
    location: typeof entry.location === 'string' ? entry.location : undefined,
    suspicious: Boolean(entry.suspicious),
  };
}

export const fraudApi = {
  getStats: async (): Promise<FraudStats> => {
    const { data } = await api.get<ApiResponse<RawFraudStats>>('/api/v1/fraud/stats');
    const totalAlerts = data.data.total ?? 0;
    const newAlerts = data.data.new ?? 0;
    const investigatingAlerts = data.data.investigating ?? 0;
    const resolvedAlerts = data.data.resolved ?? 0;
    return {
      totalAlerts,
      newAlerts,
      investigatingAlerts,
      resolvedAlerts,
      resolutionRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
    };
  },

  getTrend: async (days = 30): Promise<FraudTrendPoint[]> => {
    const { data } = await api.get<ApiResponse<RawFraudTrendResponse>>('/api/v1/fraud/trend', {
      params: { size: Math.min(Math.max(days * 3, 60), 500) },
    });
    return buildTrendPoints(data.data.recentAlerts ?? [], days);
  },

  listAlerts: async (params?: { status?: string; severity?: string; page?: number; size?: number }) => {
    const { data } = await api.get<ApiResponse<RawFraudAlert[]>>('/api/v1/fraud/alerts', { params });
    return {
      items: (data.data ?? []).map(mapAlert),
      page: data.page ?? {},
    };
  },

  getAlert: async (id: number): Promise<FraudAlert> => {
    const { data } = await api.get<ApiResponse<RawFraudAlert>>(`/api/v1/fraud/alerts/${id}`);
    return mapAlert(data.data);
  },

  getAlertTransactions: async (alertId: number): Promise<FraudTransaction[]> => {
    const { data } = await api.get<ApiResponse<Array<Record<string, unknown>>>>(`/api/v1/fraud/alerts/${alertId}/transactions`);
    return (data.data ?? []).map(mapTransaction).filter((item): item is FraudTransaction => item !== null);
  },

  blockCard: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/block-card`),

  blockAccount: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/block-account`),

  allowTransaction: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/allow`),

  dismissAlert: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/dismiss`),

  fileFraudCase: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/file-case`),

  listRules: async (): Promise<FraudRule[]> => {
    const { data } = await api.get<ApiResponse<RawFraudRule[]>>('/api/v1/fraud/rules');
    return (data.data ?? []).map(mapRule);
  },

  toggleRule: (id: number) =>
    api.patch(`/api/v1/fraud/rules/${id}/toggle`),

  getModelPerformance: async (): Promise<ModelPerformance> => {
    const { data } = await api.get<ApiResponse<RawFraudModelPerformance>>('/api/v1/fraud/model-performance');
    return {
      totalAlerts: data.data.totalAlerts ?? 0,
      resolvedAlerts: data.data.resolvedAlerts ?? 0,
      falsePositives: data.data.falsePositives ?? 0,
      detectionRate: (data.data.detectionRate ?? 0) * 100,
      falsePositiveRate: (data.data.falsePositiveRate ?? 0) * 100,
    };
  },
};
