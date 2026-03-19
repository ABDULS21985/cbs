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
}

// ─── Demo fixtures ─────────────────────────────────────────────────────────────

function makeMockSources(): DataSource[] {
  const t = (id: string, dn: string): DataField => ({ id, name: id, displayName: dn, type: 'TEXT', aggregatable: false, filterable: true, groupable: true });
  const n = (id: string, dn: string): DataField => ({ id, name: id, displayName: dn, type: 'NUMBER', aggregatable: true, filterable: true, groupable: false });
  const m = (id: string, dn: string): DataField => ({ id, name: id, displayName: dn, type: 'MONEY', aggregatable: true, filterable: true, groupable: false });
  const d = (id: string, dn: string): DataField => ({ id, name: id, displayName: dn, type: 'DATE', aggregatable: false, filterable: true, groupable: false });

  return [
    { id: 'customers', name: 'Customers', category: 'Banking Data', fields: [t('customer_id','Customer ID'), t('customer_name','Customer Name'), t('customer_type','Customer Type'), t('kyc_status','KYC Status'), d('registration_date','Registration Date'), t('risk_rating','Risk Rating'), m('total_balance','Total Balance')] },
    { id: 'accounts', name: 'Accounts', category: 'Banking Data', fields: [t('account_id','Account ID'), t('account_number','Account Number'), t('account_type','Account Type'), t('currency','Currency'), m('balance','Balance'), t('status','Status'), d('opened_date','Opened Date'), t('customer_id','Customer ID')] },
    { id: 'transactions', name: 'Transactions', category: 'Banking Data', fields: [t('txn_id','Transaction ID'), d('txn_date','Transaction Date'), t('txn_type','Type'), m('amount','Amount'), t('channel','Channel'), t('status','Status'), t('account_id','Account ID'), t('narration','Narration')] },
    { id: 'loans', name: 'Loans', category: 'Banking Data', fields: [t('loan_id','Loan ID'), t('loan_type','Loan Type'), m('principal','Principal'), m('outstanding','Outstanding'), n('interest_rate','Interest Rate'), t('status','Status'), d('disbursed_date','Disbursed Date'), d('maturity_date','Maturity Date'), t('customer_id','Customer ID')] },
    { id: 'fixed_deposits', name: 'Fixed Deposits', category: 'Banking Data', fields: [t('fd_id','FD ID'), m('principal','Principal'), n('interest_rate','Interest Rate'), n('tenor_days','Tenor (Days)'), d('maturity_date','Maturity Date'), t('status','Status'), t('customer_id','Customer ID')] },
    { id: 'cards', name: 'Cards', category: 'Banking Data', fields: [t('card_id','Card ID'), t('card_type','Card Type'), t('card_scheme','Card Scheme'), m('credit_limit','Credit Limit'), m('balance_used','Balance Used'), t('status','Status'), t('account_id','Account ID')] },
    { id: 'payments', name: 'Payments', category: 'Banking Data', fields: [t('payment_id','Payment ID'), d('payment_date','Payment Date'), t('payment_type','Payment Type'), m('amount','Amount'), t('rail','Rail'), t('status','Status'), t('sender_account','Sender Account'), t('receiver_account','Receiver Account')] },
    { id: 'aml_alerts', name: 'AML Alerts', category: 'Risk Data', fields: [t('alert_id','Alert ID'), d('alert_date','Alert Date'), t('alert_type','Alert Type'), n('risk_score','Risk Score'), t('status','Status'), t('customer_id','Customer ID'), m('amount_flagged','Amount Flagged')] },
    { id: 'fraud_cases', name: 'Fraud Cases', category: 'Risk Data', fields: [t('case_id','Case ID'), d('case_date','Case Date'), t('fraud_type','Fraud Type'), m('amount_lost','Amount Lost'), m('amount_recovered','Amount Recovered'), t('status','Status'), t('customer_id','Customer ID')] },
    { id: 'credit_risk', name: 'Credit Risk Scores', category: 'Risk Data', fields: [t('customer_id','Customer ID'), n('credit_score','Credit Score'), n('pd_score','PD Score'), n('lgd_score','LGD Score'), t('rating_grade','Rating Grade'), d('scored_date','Scored Date')] },
    { id: 'operational_events', name: 'Operational Events', category: 'Risk Data', fields: [t('event_id','Event ID'), d('event_date','Event Date'), t('event_type','Event Type'), t('severity','Severity'), m('loss_amount','Loss Amount'), t('department','Department'), t('status','Status')] },
    { id: 'audit_trail', name: 'Audit Trail', category: 'Risk Data', fields: [t('audit_id','Audit ID'), d('audit_date','Audit Date'), t('action','Action'), t('entity_type','Entity Type'), t('user_id','User ID'), t('ip_address','IP Address'), t('outcome','Outcome')] },
  ];
}

const DEMO_SOURCES: DataSource[] = makeMockSources();

const DEMO_REPORTS: SavedReport[] = [
  {
    id: 'rpt-001', name: 'Monthly Transaction Summary',
    description: 'Summary of all transactions grouped by type and channel',
    createdBy: 'admin@cbs.ng', createdAt: '2026-02-10T09:00:00Z', lastRun: '2026-03-18T08:00:00Z',
    schedule: 'MONTHLY', savedTo: 'SHARED',
    config: { dataSources: ['transactions'], columns: [{ fieldId: 'txn_type', fieldName: 'txn_type', displayName: 'Type', type: 'TEXT' }, { fieldId: 'channel', fieldName: 'channel', displayName: 'Channel', type: 'TEXT' }, { fieldId: 'amount', fieldName: 'amount', displayName: 'Total Amount', type: 'MONEY', aggregation: 'SUM', format: 'MONEY' }, { fieldId: 'txn_id', fieldName: 'txn_id', displayName: 'Count', type: 'TEXT', aggregation: 'COUNT' }], filters: [], groupBy: ['txn_type', 'channel'], visualization: 'BAR_CHART', chartConfig: { xAxis: 'txn_type', yAxis: 'amount', title: 'Transaction Volume by Type' } },
  },
  {
    id: 'rpt-002', name: 'Customer KYC Status Report',
    description: 'All customers and their KYC verification status',
    createdBy: 'compliance@cbs.ng', createdAt: '2026-01-15T10:30:00Z', lastRun: '2026-03-17T14:20:00Z',
    schedule: 'WEEKLY', savedTo: 'DEPARTMENT',
    config: { dataSources: ['customers'], columns: [{ fieldId: 'customer_id', fieldName: 'customer_id', displayName: 'Customer ID', type: 'TEXT' }, { fieldId: 'customer_name', fieldName: 'customer_name', displayName: 'Name', type: 'TEXT' }, { fieldId: 'kyc_status', fieldName: 'kyc_status', displayName: 'KYC Status', type: 'TEXT' }, { fieldId: 'risk_rating', fieldName: 'risk_rating', displayName: 'Risk Rating', type: 'TEXT' }, { fieldId: 'registration_date', fieldName: 'registration_date', displayName: 'Registered', type: 'DATE', format: 'DATE' }], filters: [], visualization: 'TABLE' },
  },
  {
    id: 'rpt-003', name: 'AML High Risk Alerts',
    description: 'AML alerts with risk score above 70',
    createdBy: 'aml@cbs.ng', createdAt: '2026-02-28T11:00:00Z', lastRun: '2026-03-19T07:00:00Z',
    schedule: 'DAILY', savedTo: 'MY_REPORTS',
    config: { dataSources: ['aml_alerts'], columns: [{ fieldId: 'alert_type', fieldName: 'alert_type', displayName: 'Alert Type', type: 'TEXT' }, { fieldId: 'risk_score', fieldName: 'risk_score', displayName: 'Avg Risk Score', type: 'NUMBER', aggregation: 'AVG' }, { fieldId: 'amount_flagged', fieldName: 'amount_flagged', displayName: 'Total Flagged', type: 'MONEY', aggregation: 'SUM', format: 'MONEY' }, { fieldId: 'alert_id', fieldName: 'alert_id', displayName: 'Count', type: 'TEXT', aggregation: 'COUNT' }], filters: [{ id: 'f1', fieldId: 'risk_score', fieldName: 'risk_score', operator: 'greater_than', value: '70' }], groupBy: ['alert_type'], visualization: 'PIE_CHART', chartConfig: { xAxis: 'alert_type', yAxis: 'amount_flagged', title: 'High Risk AML Alerts' } },
  },
  {
    id: 'rpt-004', name: 'Loan Portfolio Overview',
    description: 'Active loan portfolio summary with outstanding balances',
    createdBy: 'credit@cbs.ng', createdAt: '2026-03-01T09:00:00Z', lastRun: '2026-03-18T09:00:00Z',
    schedule: 'WEEKLY', savedTo: 'SHARED',
    config: { dataSources: ['loans'], columns: [{ fieldId: 'loan_type', fieldName: 'loan_type', displayName: 'Loan Type', type: 'TEXT' }, { fieldId: 'principal', fieldName: 'principal', displayName: 'Total Principal', type: 'MONEY', aggregation: 'SUM', format: 'MONEY' }, { fieldId: 'outstanding', fieldName: 'outstanding', displayName: 'Outstanding', type: 'MONEY', aggregation: 'SUM', format: 'MONEY' }, { fieldId: 'loan_id', fieldName: 'loan_id', displayName: 'Count', type: 'TEXT', aggregation: 'COUNT' }], filters: [{ id: 'f1', fieldId: 'status', fieldName: 'status', operator: 'equals', value: 'ACTIVE' }], groupBy: ['loan_type'], visualization: 'SUMMARY_CARDS' },
  },
  {
    id: 'rpt-005', name: 'Daily Payments Reconciliation',
    description: 'End-of-day payments reconciliation across all rails',
    createdBy: 'ops@cbs.ng', createdAt: '2026-03-05T08:00:00Z', lastRun: '2026-03-19T00:05:00Z',
    schedule: 'DAILY', savedTo: 'MY_REPORTS',
    config: { dataSources: ['payments'], columns: [{ fieldId: 'rail', fieldName: 'rail', displayName: 'Rail', type: 'TEXT' }, { fieldId: 'payment_type', fieldName: 'payment_type', displayName: 'Type', type: 'TEXT' }, { fieldId: 'amount', fieldName: 'amount', displayName: 'Total Amount', type: 'MONEY', aggregation: 'SUM', format: 'MONEY' }, { fieldId: 'status', fieldName: 'status', displayName: 'Status', type: 'TEXT' }, { fieldId: 'payment_id', fieldName: 'payment_id', displayName: 'Count', type: 'TEXT', aggregation: 'COUNT' }], filters: [], groupBy: ['rail', 'payment_type', 'status'], visualization: 'COMBINED', chartConfig: { xAxis: 'rail', yAxis: 'amount', title: 'Payments by Rail' } },
  },
];

const TEXT_OPTIONS: Record<string, string[]> = {
  txn_type: ['DEBIT', 'CREDIT', 'TRANSFER'], channel: ['MOBILE', 'WEB', 'BRANCH', 'ATM', 'USSD'],
  status: ['ACTIVE', 'PENDING', 'COMPLETED', 'FAILED'], kyc_status: ['VERIFIED', 'PENDING', 'REJECTED'],
  alert_type: ['STRUCTURING', 'SMURFING', 'LAYERING', 'HIGH_VALUE'], loan_type: ['PERSONAL', 'MORTGAGE', 'AUTO', 'SME'],
  rail: ['NIP', 'NEFT', 'RTGS', 'INTRA'], payment_type: ['TRANSFER', 'BILL', 'SALARY'],
  risk_rating: ['LOW', 'MEDIUM', 'HIGH'], fraud_type: ['CARD_FRAUD', 'IDENTITY_THEFT', 'PHISHING'],
  rating_grade: ['A', 'B', 'C', 'D'], severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  event_type: ['SYSTEM_FAILURE', 'PROCESS_ERROR', 'HUMAN_ERROR'], customer_type: ['RETAIL', 'CORPORATE', 'SME'],
  action: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'], entity_type: ['ACCOUNT', 'CUSTOMER', 'LOAN', 'PAYMENT'],
  outcome: ['SUCCESS', 'FAILURE'],
};

function buildMockResult(config: ReportConfig): ReportResult {
  const columns = config.columns.map((c) => ({ key: c.fieldId, label: c.displayName, type: c.type }));
  const rows: Record<string, unknown>[] = Array.from({ length: 10 }, (_, i) => {
    const row: Record<string, unknown> = {};
    config.columns.forEach((col) => {
      if (col.type === 'MONEY' || col.format === 'MONEY') {
        row[col.fieldId] = Math.floor(Math.random() * 10_000_000) + 500_000;
      } else if (col.type === 'NUMBER') {
        row[col.fieldId] = Math.floor(Math.random() * 1000);
      } else if (col.type === 'DATE' || col.format === 'DATE') {
        row[col.fieldId] = `2026-0${Math.floor(Math.random() * 3) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
      } else if (col.aggregation === 'COUNT') {
        row[col.fieldId] = Math.floor(Math.random() * 500) + 10;
      } else {
        const opts = TEXT_OPTIONS[col.fieldName];
        row[col.fieldId] = opts ? opts[Math.floor(Math.random() * opts.length)] : `Value-${i + 1}`;
      }
    });
    return row;
  });
  const summary: Record<string, number> = {};
  config.columns.forEach((col) => {
    if ((col.aggregation === 'SUM' || col.aggregation === 'COUNT') && (col.type === 'MONEY' || col.type === 'NUMBER' || col.aggregation === 'COUNT')) {
      summary[col.fieldId] = rows.reduce((a, r) => a + (Number(r[col.fieldId]) || 0), 0);
    }
  });
  return { reportId: `run-${Date.now()}`, runAt: new Date().toISOString(), rowCount: rows.length, columns, rows, summary };
}

function sleep(ms = 400) { return new Promise((r) => setTimeout(r, ms + Math.random() * 200)); }

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// ─── API ───────────────────────────────────────────────────────────────────────

export const reportBuilderApi = {
  async getSavedReports(params?: { owner?: 'mine' | 'shared' | 'all' }): Promise<SavedReport[]> {
    if (DEMO) {
      await sleep();
      if (params?.owner === 'mine') return DEMO_REPORTS.filter((r) => r.savedTo === 'MY_REPORTS');
      if (params?.owner === 'shared') return DEMO_REPORTS.filter((r) => r.savedTo === 'SHARED' || r.savedTo === 'DEPARTMENT');
      return [...DEMO_REPORTS];
    }
    return apiGet<SavedReport[]>('/v1/reports/custom', params as Record<string, unknown>);
  },

  async getReport(id: string): Promise<SavedReport> {
    if (DEMO) {
      await sleep();
      const r = DEMO_REPORTS.find((x) => x.id === id);
      if (!r) throw new Error(`Report ${id} not found`);
      return r;
    }
    return apiGet<SavedReport>(`/v1/reports/custom/${id}`);
  },

  async createReport(data: CreateReportRequest): Promise<SavedReport> {
    if (DEMO) {
      await sleep(600);
      const created: SavedReport = { ...data, id: `rpt-${Date.now()}`, createdBy: 'current.user@cbs.ng', createdAt: new Date().toISOString() };
      DEMO_REPORTS.push(created);
      return created;
    }
    return apiPost<SavedReport>('/v1/reports/custom', data);
  },

  async updateReport(id: string, data: Partial<CreateReportRequest>): Promise<SavedReport> {
    if (DEMO) {
      await sleep(500);
      const idx = DEMO_REPORTS.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Report ${id} not found`);
      DEMO_REPORTS[idx] = { ...DEMO_REPORTS[idx], ...data };
      return DEMO_REPORTS[idx];
    }
    return apiPut<SavedReport>(`/v1/reports/custom/${id}`, data);
  },

  async deleteReport(id: string): Promise<void> {
    if (DEMO) {
      await sleep(400);
      const idx = DEMO_REPORTS.findIndex((r) => r.id === id);
      if (idx !== -1) DEMO_REPORTS.splice(idx, 1);
      return;
    }
    return apiDelete<void>(`/v1/reports/custom/${id}`);
  },

  async runReport(id: string, params?: Record<string, string>): Promise<ReportResult> {
    if (DEMO) {
      await sleep(800);
      const report = DEMO_REPORTS.find((r) => r.id === id);
      if (!report) throw new Error(`Report ${id} not found`);
      const idx = DEMO_REPORTS.findIndex((r) => r.id === id);
      if (idx !== -1) DEMO_REPORTS[idx].lastRun = new Date().toISOString();
      return buildMockResult(report.config);
    }
    return apiPost<ReportResult>(`/v1/reports/custom/${id}/run`, params);
  },

  async getDataSources(): Promise<DataSource[]> {
    if (DEMO) { await sleep(400); return DEMO_SOURCES; }
    return apiGet<DataSource[]>('/v1/reports/custom/data-sources');
  },

  async shareReport(id: string, emails: string[]): Promise<void> {
    if (DEMO) { await sleep(400); return; }
    return apiPost<void>(`/v1/reports/custom/${id}/share`, { emails });
  },

  generatePreview(config: ReportConfig): ReportResult {
    return buildMockResult(config);
  },
};
