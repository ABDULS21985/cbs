import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── API Functions ────────────────────────────────────────────────────────────

export function getBalanceSheet(date?: string, comparison?: string): Promise<BalanceSheetData> {
  return apiGet<BalanceSheetData>('/api/v1/reports/financial/balance-sheet', { date, comparison });
}

export function getIncomeStatement(period?: string, comparison?: string): Promise<IncomeStatementData> {
  return apiGet<IncomeStatementData>('/api/v1/reports/financial/income-statement', { period, comparison });
}

export function getCashFlow(period?: string): Promise<CashFlowData> {
  return apiGet<CashFlowData>('/api/v1/reports/financial/cash-flow', { period });
}

export function getCapitalAdequacy(date?: string): Promise<CapitalAdequacyData> {
  return apiGet<CapitalAdequacyData>('/api/v1/reports/financial/capital-adequacy', { date });
}
