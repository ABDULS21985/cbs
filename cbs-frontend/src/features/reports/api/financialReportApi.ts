import { apiGet, apiDownload } from '@/lib/api';

// ─── Frontend Types (consumed by financial report components) ─────────────────

export interface FinancialLineItem {
  code: string;
  label: string;
  indent: number;
  isBold?: boolean;
  isSeparator?: boolean;
  isHeader?: boolean;
  current: number;
  prior: number;
  priorYear?: number;
  budget?: number;
  glAccountIds?: string[];
}

export interface BalanceSheetData {
  entityName: string;
  reportDate: string;
  priorDate: string;
  currency: string;
  assets: FinancialLineItem[];
  liabilities: FinancialLineItem[];
  equity: FinancialLineItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatementData {
  entityName: string;
  periodLabel: string;
  priorPeriodLabel: string;
  currency: string;
  items: FinancialLineItem[];
  netProfit: number;
}

export interface CashFlowData {
  entityName: string;
  periodLabel: string;
  operating: FinancialLineItem[];
  investing: FinancialLineItem[];
  financing: FinancialLineItem[];
  netCashflow: number;
  openingCash: number;
  closingCash: number;
}

export interface CapitalAdequacyData {
  tier1Capital: number;
  tier2Capital: number;
  totalCapital: number;
  rwa: number;
  car: number;
  minimumCar: number;
  capitalBuffer: number;
  creditRiskRwa: number;
  marketRiskRwa: number;
  operationalRiskRwa: number;
}

// ─── Backend Response Types ───────────────────────────────────────────────────

/** GlCategoryEntry — as returned by the backend balance sheet */
interface BackendGlCategoryEntry {
  glCode: string;
  glName: string;
  balance: number;
}

interface BackendBalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  assets: BackendGlCategoryEntry[];
  liabilities: BackendGlCategoryEntry[];
  equity: BackendGlCategoryEntry[];
}

interface BackendIncomeStatement {
  interestIncome: number;
  interestExpense: number;
  netInterestIncome: number;
  feeIncome: number;
  operatingExpenses: number;
  provisionCharge: number;
  profitBeforeTax: number;
}

interface BackendCashFlowStatement {
  operatingActivities: number;
  investingActivities: number;
  financingActivities: number;
  netCashFlow: number;
}

interface BackendCapitalAdequacy {
  tier1Capital: number;
  tier2Capital: number;
  totalCapital: number;
  riskWeightedAssets: number;   // frontend expects "rwa"
  capitalAdequacyRatio: number; // frontend expects "car"
}

// ─── Transformation Functions ─────────────────────────────────────────────────

function glEntriesToLineItems(entries: BackendGlCategoryEntry[], indent = 1): FinancialLineItem[] {
  return (entries ?? []).map((e) => ({
    code:  e.glCode  ?? '',
    label: e.glName  ?? '',
    indent,
    current: e.balance ?? 0,
    prior: 0,
  }));
}

function transformBalanceSheet(raw: BackendBalanceSheet): BalanceSheetData {
  const today = new Date().toISOString().slice(0, 10);
  const priorYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    entityName:       'CBS Bank',
    reportDate:       today,
    priorDate:        priorYear,
    currency:         'NGN',
    assets:           glEntriesToLineItems(raw.assets),
    liabilities:      glEntriesToLineItems(raw.liabilities),
    equity:           glEntriesToLineItems(raw.equity),
    totalAssets:      raw.totalAssets      ?? 0,
    totalLiabilities: raw.totalLiabilities ?? 0,
    totalEquity:      raw.totalEquity      ?? 0,
  };
}

function transformIncomeStatement(
  raw: BackendIncomeStatement,
  from?: string,
  to?: string,
): IncomeStatementData {
  const periodLabel      = from && to ? `${from} – ${to}` : 'Current Period';
  const priorPeriodLabel = 'Prior Period';

  const items: FinancialLineItem[] = [
    { code: 'INT_INC',  label: 'Interest Income',      indent: 1, isBold: false, current: raw.interestIncome      ?? 0, prior: 0 },
    { code: 'INT_EXP',  label: 'Interest Expense',     indent: 1, isBold: false, current: -(raw.interestExpense   ?? 0), prior: 0 },
    { code: 'NII',      label: 'Net Interest Income',  indent: 0, isBold: true,  current: raw.netInterestIncome   ?? 0, prior: 0 },
    { code: 'FEE_INC',  label: 'Fee & Commission Income', indent: 1, current: raw.feeIncome          ?? 0, prior: 0 },
    { code: 'OPEX',     label: 'Operating Expenses',   indent: 1, current: -(raw.operatingExpenses   ?? 0), prior: 0 },
    { code: 'PROV',     label: 'Provision Charge',     indent: 1, current: -(raw.provisionCharge     ?? 0), prior: 0 },
    { code: 'PBT',      label: 'Profit Before Tax',    indent: 0, isBold: true,  current: raw.profitBeforeTax    ?? 0, prior: 0 },
  ];

  return {
    entityName:      'CBS Bank',
    periodLabel,
    priorPeriodLabel,
    currency:        'NGN',
    items,
    netProfit:       raw.profitBeforeTax ?? 0,
  };
}

function transformCashFlow(
  raw: BackendCashFlowStatement,
  from?: string,
  to?: string,
): CashFlowData {
  const periodLabel = from && to ? `${from} – ${to}` : 'Current Period';

  const toItem = (code: string, label: string, value: number): FinancialLineItem[] => [
    { code, label, indent: 1, current: value, prior: 0 },
  ];

  const net = raw.netCashFlow ?? 0;

  return {
    entityName:   'CBS Bank',
    periodLabel,
    operating:    toItem('OPER', 'Net Cash from Operating Activities', raw.operatingActivities ?? 0),
    investing:    toItem('INV',  'Net Cash from Investing Activities', raw.investingActivities ?? 0),
    financing:    toItem('FIN',  'Net Cash from Financing Activities', raw.financingActivities ?? 0),
    netCashflow:  net,
    openingCash:  0,
    closingCash:  net,
  };
}

function transformCapitalAdequacy(raw: BackendCapitalAdequacy): CapitalAdequacyData {
  const rwa = raw.riskWeightedAssets ?? 0;
  const car = raw.capitalAdequacyRatio ?? 0;
  // Minimum CAR is typically 15% for CBN regulation; buffer = actual - minimum
  const minimumCar = 15;
  return {
    tier1Capital:         raw.tier1Capital  ?? 0,
    tier2Capital:         raw.tier2Capital  ?? 0,
    totalCapital:         raw.totalCapital  ?? 0,
    rwa,
    car,
    minimumCar,
    capitalBuffer:        Math.max(0, car - minimumCar),
    creditRiskRwa:        rwa * 0.75,  // approximate split; backend doesn't break this down
    marketRiskRwa:        rwa * 0.15,
    operationalRiskRwa:   rwa * 0.10,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getBalanceSheet(asOf?: string, _comparison?: string): Promise<BalanceSheetData> {
  const raw = await apiGet<BackendBalanceSheet>('/api/v1/reports/financial/balance-sheet', { asOf });
  return transformBalanceSheet(raw);
}

export async function getIncomeStatement(from?: string, to?: string): Promise<IncomeStatementData> {
  const raw = await apiGet<BackendIncomeStatement>('/api/v1/reports/financial/income-statement', { from, to });
  return transformIncomeStatement(raw, from, to);
}

export async function getCashFlow(from?: string, to?: string): Promise<CashFlowData> {
  const raw = await apiGet<BackendCashFlowStatement>('/api/v1/reports/financial/cash-flow', { from, to });
  return transformCashFlow(raw, from, to);
}

export async function getCapitalAdequacy(_date?: string): Promise<CapitalAdequacyData> {
  const raw = await apiGet<BackendCapitalAdequacy>('/api/v1/reports/financial/capital-adequacy');
  return transformCapitalAdequacy(raw);
}

export async function exportExcel(reportType: string, params: { asOf?: string; from?: string; to?: string }) {
  const queryParams = new URLSearchParams({ reportType });
  if (params.asOf) queryParams.set('asOf', params.asOf);
  if (params.from) queryParams.set('from', params.from);
  if (params.to)   queryParams.set('to', params.to);
  return apiDownload(
    `/api/v1/reports/financial/export/excel?${queryParams}`,
    `financial-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportPdf(reportType: string, params: { asOf?: string; from?: string; to?: string }) {
  const queryParams = new URLSearchParams({ reportType });
  if (params.asOf) queryParams.set('asOf', params.asOf);
  if (params.from) queryParams.set('from', params.from);
  if (params.to)   queryParams.set('to', params.to);
  return apiDownload(
    `/api/v1/reports/financial/export/pdf?${queryParams}`,
    `financial-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
