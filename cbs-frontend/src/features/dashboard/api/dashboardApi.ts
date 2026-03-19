import { apiGet } from '@/lib/api';

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

// ─── Treasury Analytics ────────────────────────────────────────────────────────

export interface TreasuryAnalytics {
  currency: string;
  nim: number;       // Net Interest Margin
  car: number;       // Capital Adequacy Ratio
  roa: number;       // Return on Assets
  roe: number;       // Return on Equity
  liquidityRatio: number;
  nplRatio: number;
  recordedAt: string;
}

// ─── Dealer Desk ──────────────────────────────────────────────────────────────

export interface DealerDesk {
  id: string;
  name: string;
  deskType: string;
  currency: string;
  totalPositions: number;
  dailyPnl: number;
  ytdPnl: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
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

// ─── API ──────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getBankCashFlow: () =>
    apiGet<CashFlowForecast>('/v1/intelligence/cashflow/BANK/HEAD_OFFICE').catch(() => null),

  getAccountSummary: () =>
    apiGet<AccountSummary>('/v1/accounts/summary')
      .catch(() => apiGet<AccountSummary>('/v1/dashboard/stats').catch(() => null)),

  getTreasuryMetrics: (currency = 'NGN') =>
    apiGet<TreasuryAnalytics>(`/v1/treasury-analytics/${currency}`).catch(() => null),

  getDealerDesks: () =>
    apiGet<DealerDesk[]>('/v1/dealer-desks').catch(() => [] as DealerDesk[]),

  getAlmScenarios: () =>
    apiGet<AlmScenario[]>('/v1/alm/scenarios').catch(() => [] as AlmScenario[]),

  getOverdueComplianceReports: () =>
    apiGet<{ count: number; items?: unknown[] }>('/v1/compliance-reports/overdue')
      .catch(() => ({ count: 0 })),

  getPendingDocuments: () =>
    apiGet<PendingDocumentSummary>('/v1/intelligence/documents/pending-review').catch(() => null),
};
