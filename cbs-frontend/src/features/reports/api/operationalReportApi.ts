import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by operational report components) ───────────────

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

// ─── Backend Response Types ────────────────────────────────────────────────────

interface BackendOperationsStats {
  transactionVolume: number;
  avgProcessingTimeMs: number;
  slaCompliancePercent: number;
}

interface BackendSlaEntry {
  serviceType: string;
  totalCases: number;
  withinSla: number;
  slaPercent: number;
}

interface BackendSlaTrendEntry {
  month: string;
  slaPercent: number;
}

interface BackendQueueMetrics {
  queueName: string;
  depth: number;
  avgWaitTimeMs: number;
  avgProcessingTimeMs: number;
}

interface BackendStaffProductivity {
  staffId: string;
  staffName: string;
  transactionsProcessed: number;
  avgTimePerTransaction: number;
}

interface BackendEfficiencyTrendEntry {
  month: string;
  avgProcessingTimeMs: number;
  throughput: number;
}

interface BackendUptimeReport {
  system: string;
  uptimePercent: number;
  incidentCount: number;
  mttr: number;
}

interface BackendIncidentSummary {
  totalIncidents: number;
  critical: number;
  major: number;
  minor: number;
  avgResolutionTimeHours: number;
}

interface BackendAutomationMetrics {
  automationRate: number;
  automatedTransactions: number;
  manualInterventions: number;
  straightThroughPercent: number;
}

// ─── Transformation Functions ──────────────────────────────────────────────────

function transformOpsStats(raw: BackendOperationsStats): OpsStats {
  return {
    slaAchievementPct:      raw?.slaCompliancePercent  ?? 0,
    avgCaseResolutionHours: 0,   // not in backend DTO
    staffUtilizationPct:    0,
    costPerTransaction:     0,
    downtimeHours:          0,
    automationRatePct:      0,
  };
}

function transformSlaPerformance(entries: BackendSlaEntry[]): SlaRow[] {
  return (entries ?? []).map((e) => ({
    process:        e.serviceType  ?? '',
    slaTargetHours: 0,              // not in backend DTO
    actualHours:    0,
    achievementPct: e.slaPercent   ?? 0,
    breaches:       Math.max(0, (e.totalCases ?? 0) - (e.withinSla ?? 0)),
  }));
}

function transformSlaTrend(entries: BackendSlaTrendEntry[]): SlaTrendPoint[] {
  return (entries ?? []).map((e) => ({
    month:         e.month      ?? '',
    process:       '',           // backend aggregates all processes
    achievementPct: e.slaPercent ?? 0,
  }));
}

function transformQueueAnalytics(
  entries: BackendQueueMetrics[],
): { metrics: QueueMetric[]; peakHours: PeakHourData[] } {
  const metrics = (entries ?? []).map((e) => ({
    branch:            e.queueName          ?? '',
    avgWaitMinutes:    (e.avgWaitTimeMs      ?? 0) / 60000,
    avgServiceMinutes: (e.avgProcessingTimeMs ?? 0) / 60000,
    noShowRate:        0,           // not in backend DTO
    ticketsToday:      e.depth      ?? 0,
  }));
  return { metrics, peakHours: [] };
}

function transformStaffProductivity(entries: BackendStaffProductivity[]): StaffProductivity[] {
  return (entries ?? []).map((e) => ({
    branch:          e.staffName            ?? '',
    staffCount:      1,
    txnPerStaff:     e.transactionsProcessed ?? 0,
    revenuePerStaff: 0,   // not in backend DTO
    customersServed: 0,
  }));
}

function transformEfficiencyTrend(entries: BackendEfficiencyTrendEntry[]): EfficiencyPoint[] {
  return (entries ?? []).map((e) => ({
    month:       e.month              ?? '',
    costPerTxn:  e.avgProcessingTimeMs ?? 0,  // ms as proxy for cost
  }));
}

function transformSystemUptime(entries: BackendUptimeReport[]): ServiceUptime[] {
  return (entries ?? []).map((e) => ({
    service:        e.system        ?? '',
    uptimePct:      e.uptimePercent ?? 0,
    downtimeMinutes: 0,              // not in backend DTO
    incidentCount:  e.incidentCount ?? 0,
  }));
}

function transformIncidentTrend(raw: BackendIncidentSummary): IncidentPoint[] {
  if (!raw) return [];
  return [{
    month:     '',
    count:     raw.totalIncidents          ?? 0,
    mttrHours: raw.avgResolutionTimeHours  ?? 0,
    severity:  raw.critical > 0 ? 'CRITICAL' : raw.major > 0 ? 'MAJOR' : 'MINOR',
  }];
}

function transformAutomationStats(raw: BackendAutomationMetrics): AutomationStats[] {
  if (!raw) return [];
  const total = (raw.automatedTransactions ?? 0) + (raw.manualInterventions ?? 0);
  return [{
    transactionType:               'ALL',
    totalCount:                    total,
    automatedCount:                raw.automatedTransactions ?? 0,
    manualCount:                   raw.manualInterventions   ?? 0,
    automationPct:                 raw.automationRate        ?? 0,
    manualInterventionOpportunity: (raw.manualInterventions  ?? 0) > 0,
  }];
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const operationalReportApi = {
  getStats: (params: DateRangeParams): Promise<OpsStats> =>
    apiGet<BackendOperationsStats>('/api/v1/reports/operations/stats', params as unknown as Record<string, unknown>)
      .then(transformOpsStats),

  getSlaPerformance: (params: DateRangeParams): Promise<SlaRow[]> =>
    apiGet<BackendSlaEntry[]>('/api/v1/reports/operations/sla', params as unknown as Record<string, unknown>)
      .then(transformSlaPerformance),

  getSlaTrend: (params: DateRangeParams): Promise<SlaTrendPoint[]> =>
    apiGet<BackendSlaTrendEntry[]>('/api/v1/reports/operations/sla-trend', params as unknown as Record<string, unknown>)
      .then(transformSlaTrend),

  getQueueAnalytics: (params: DateRangeParams): Promise<{ metrics: QueueMetric[]; peakHours: PeakHourData[] }> =>
    apiGet<BackendQueueMetrics[]>('/api/v1/reports/operations/queue', params as unknown as Record<string, unknown>)
      .then(transformQueueAnalytics),

  getStaffProductivity: (params: DateRangeParams): Promise<StaffProductivity[]> =>
    apiGet<BackendStaffProductivity[]>('/api/v1/reports/operations/staff', params as unknown as Record<string, unknown>)
      .then(transformStaffProductivity),

  getEfficiencyTrend: (months = 12): Promise<EfficiencyPoint[]> =>
    apiGet<BackendEfficiencyTrendEntry[]>('/api/v1/reports/operations/efficiency-trend', { months } as unknown as Record<string, unknown>)
      .then(transformEfficiencyTrend),

  getSystemUptime: (params: DateRangeParams): Promise<ServiceUptime[]> =>
    apiGet<BackendUptimeReport[]>('/api/v1/reports/operations/uptime', params as unknown as Record<string, unknown>)
      .then(transformSystemUptime),

  getIncidentTrend: (months = 12): Promise<IncidentPoint[]> =>
    apiGet<BackendIncidentSummary>('/api/v1/reports/operations/incidents', { months } as unknown as Record<string, unknown>)
      .then(transformIncidentTrend),

  getAutomationStats: (params: DateRangeParams): Promise<AutomationStats[]> =>
    apiGet<BackendAutomationMetrics>('/api/v1/reports/operations/automation', params as unknown as Record<string, unknown>)
      .then(transformAutomationStats),
};
