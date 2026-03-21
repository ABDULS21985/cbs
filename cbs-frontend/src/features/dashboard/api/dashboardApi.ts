import { apiGet, apiPost } from '@/lib/api';

// ─── Cash Flow Forecast ────────────────────────────────────────────────────────

export interface CashFlowForecast {
  entityCode: string;
  entityType: string;
  currency: string;
  forecasts: Array<{
    date: string;
    inflows: number;
    outflows: number;
    netPosition: number;
    cumulative: number;
  }>;
  totalInflows: number;
  totalOutflows: number;
  netPosition: number;
}

// ─── Account Summary ──────────────────────────────────────────────────────────

export interface AccountSummary {
  totalAccounts: number;
  activeAccounts: number;
  totalDeposits: number;
  totalLoans: number;
  totalCustomers?: number;
}

// ─── Treasury Analytics (aligned with TreasuryAnalyticsSnapshot entity) ──────

export interface TreasuryAnalyticsSnapshot {
  id: number;
  snapshotDate: string;
  currency: string;
  totalDeposits?: number;
  totalBorrowings?: number;
  costOfFundsPct?: number;
  weightedAvgTenorDays?: number;
  totalEarningAssets?: number;
  yieldOnAssetsPct?: number;
  netInterestMarginPct?: number;
  interestSpreadPct?: number;
  loanToDepositRatio?: number;
  capitalAdequacyRatio?: number;
  tier1Ratio?: number;
  leverageRatio?: number;
  returnOnAssetsPct?: number;
  returnOnEquityPct?: number;
  createdAt: string;
}

// ─── Dealer Desk (aligned with DealingDesk entity) ──────────────────────────

export interface DealingDesk {
  id: number;
  deskCode: string;
  deskName: string;
  deskType: string;
  headDealerName?: string;
  headDealerEmployeeId?: string;
  location?: string;
  timezone?: string;
  tradingHoursStart?: string;
  tradingHoursEnd?: string;
  tradingDays?: string[];
  supportedInstruments?: string[];
  supportedCurrencies?: string[];
  maxOpenPositionLimit?: number;
  maxSingleTradeLimit?: number;
  dailyVarLimit?: number;
  stopLossLimit?: number;
  pnlCurrency?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  activatedBy?: string;
  activatedAt?: string;
  status: string;
}

// ─── Approval Stats ─────────────────────────────────────────────────────────

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  slaBreachedCount: number;
  total: number;
}

// ─── ALM Scenario ─────────────────────────────────────────────────────────────

export interface AlmScenario {
  id: string;
  name: string;
  scenarioType: string;
  status: string;
  runDate: string;
  impactOnNim: number;
  impactOnEva: number;
}

// ─── Pending Document ─────────────────────────────────────────────────────────

export interface PendingDocumentSummary {
  pendingCount: number;
  items?: Array<{
    id: string;
    documentType: string;
    uploadedAt: string;
  }>;
}

// ─── Configurable BI Dashboard (Intelligence Module) ────────────────────────

export interface BiDashboardDefinition {
  id: number;
  dashboardCode: string;
  dashboardName: string;
  dashboardType: string;
  layoutConfig: Record<string, unknown>;
  refreshIntervalSec: number;
  allowedRoles: string[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiDashboardWidget {
  id: number;
  dashboardId: number;
  widgetCode: string;
  widgetType: string;
  title: string;
  dataSource: string;
  queryConfig: Record<string, unknown>;
  displayConfig: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  refreshOverrideSec?: number;
  isActive: boolean;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getBankCashFlow: () =>
    apiGet<CashFlowForecast>('/api/v1/intelligence/cashflow/BANK/HEAD_OFFICE'),

  getAccountSummary: () =>
    apiGet<AccountSummary>('/api/v1/accounts/summary')
      .catch(() => apiGet<AccountSummary>('/api/v1/dashboard/stats')),

  /** GET /v1/treasury-analytics/{currency} — TreasuryAnalyticsSnapshot[] from real controller */
  getTreasuryMetrics: (currency = 'NGN') =>
    apiGet<TreasuryAnalyticsSnapshot[]>(`/api/v1/treasury-analytics/${currency}`),

  /** GET /v1/dealer-desks — DealingDesk[] from real DealerDeskController */
  getDealerDesks: () =>
    apiGet<DealingDesk[]>('/api/v1/dealer-desks'),

  getAlmScenarios: () =>
    apiGet<AlmScenario[]>('/api/v1/alm/scenarios'),

  getOverdueComplianceReports: () =>
    apiGet<{ count: number; items?: unknown[] }>('/api/v1/compliance-reports/overdue')
      .catch(() => ({ count: 0 })),

  getPendingDocuments: () =>
    apiGet<PendingDocumentSummary>('/api/v1/intelligence/documents/pending-review'),

  /** GET /v1/approvals/stats — approval statistics from ApprovalController */
  getApprovalStats: () =>
    apiGet<ApprovalStats>('/api/v1/approvals/stats'),

  // ─── Configurable BI Dashboards ─────────────────────────────────────────────

  /** GET /v1/intelligence/dashboards — all configurable dashboards */
  listBiDashboards: () =>
    apiGet<BiDashboardDefinition[]>('/api/v1/intelligence/dashboards'),

  /** GET /v1/intelligence/dashboards/type/{type} — by type */
  getBiDashboardsByType: (type: string) =>
    apiGet<BiDashboardDefinition[]>(`/api/v1/intelligence/dashboards/type/${type}`),

  /** GET /v1/intelligence/dashboards/code/{code} — dashboard + widgets */
  getBiDashboardWithWidgets: (code: string) =>
    apiGet<{ dashboard: BiDashboardDefinition; widgets: BiDashboardWidget[] }>(
      `/api/v1/intelligence/dashboards/code/${code}`
    ),

  /** POST /v1/intelligence/dashboards — create dashboard (ADMIN only) */
  createBiDashboard: (data: Partial<BiDashboardDefinition>) =>
    apiPost<BiDashboardDefinition>('/api/v1/intelligence/dashboards', data),

  /** POST /v1/intelligence/dashboards/{id}/widgets — add widget (ADMIN only) */
  addBiWidget: (dashboardId: number, widget: Partial<BiDashboardWidget>) =>
    apiPost<BiDashboardWidget>(`/api/v1/intelligence/dashboards/${dashboardId}/widgets`, widget),
};
