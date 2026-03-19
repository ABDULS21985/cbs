import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

export interface OpsStats {
  slaAchievementPct: number;
  avgCaseResolutionHours: number;
  staffUtilizationPct: number;
  costPerTransaction: number;
  downtimeHours: number;
  automationRatePct: number;
}

export interface SlaRow {
  process: string;
  slaTargetHours: number;
  actualHours: number;
  achievementPct: number;
  breaches: number;
}

export interface SlaTrendPoint {
  month: string;
  process: string;
  achievementPct: number;
}

export interface QueueMetric {
  branch: string;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
  noShowRate: number;
  ticketsToday: number;
}

export interface PeakHourData {
  hour: number;
  volumeCount: number;
  avgWaitMinutes: number;
}

export interface StaffProductivity {
  branch: string;
  staffCount: number;
  txnPerStaff: number;
  revenuePerStaff: number;
  customersServed: number;
}

export interface EfficiencyPoint {
  month: string;
  costPerTxn: number;
}

export interface ServiceUptime {
  service: string;
  uptimePct: number;
  downtimeMinutes: number;
  incidentCount: number;
}

export interface IncidentPoint {
  month: string;
  count: number;
  mttrHours: number;
  severity: string;
}

export interface AutomationStats {
  transactionType: string;
  totalCount: number;
  automatedCount: number;
  manualCount: number;
  automationPct: number;
  manualInterventionOpportunity: boolean;
  notes?: string;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const operationalReportApi = {
  getStats: (params: DateRangeParams): Promise<OpsStats> =>
    apiGet<OpsStats>('/api/v1/reports/operations/stats', params as unknown as Record<string, unknown>),

  getSlaPerformance: (params: DateRangeParams): Promise<SlaRow[]> =>
    apiGet<SlaRow[]>('/api/v1/reports/operations/sla', params as unknown as Record<string, unknown>),

  getSlaTrend: (params: DateRangeParams): Promise<SlaTrendPoint[]> =>
    apiGet<SlaTrendPoint[]>('/api/v1/reports/operations/sla-trend', params as unknown as Record<string, unknown>),

  getQueueAnalytics: (params: DateRangeParams): Promise<{ metrics: QueueMetric[]; peakHours: PeakHourData[] }> =>
    apiGet<{ metrics: QueueMetric[]; peakHours: PeakHourData[] }>('/api/v1/reports/operations/queue', params as unknown as Record<string, unknown>),

  getStaffProductivity: (params: DateRangeParams): Promise<StaffProductivity[]> =>
    apiGet<StaffProductivity[]>('/api/v1/reports/operations/staff', params as unknown as Record<string, unknown>),

  getEfficiencyTrend: (months = 12): Promise<EfficiencyPoint[]> =>
    apiGet<EfficiencyPoint[]>('/api/v1/reports/operations/efficiency-trend', { months } as unknown as Record<string, unknown>),

  getSystemUptime: (params: DateRangeParams): Promise<ServiceUptime[]> =>
    apiGet<ServiceUptime[]>('/api/v1/reports/operations/uptime', params as unknown as Record<string, unknown>),

  getIncidentTrend: (months = 12): Promise<IncidentPoint[]> =>
    apiGet<IncidentPoint[]>('/api/v1/reports/operations/incidents', { months } as unknown as Record<string, unknown>),

  getAutomationStats: (params: DateRangeParams): Promise<AutomationStats[]> =>
    apiGet<AutomationStats[]>('/api/v1/reports/operations/automation', params as unknown as Record<string, unknown>),
};
