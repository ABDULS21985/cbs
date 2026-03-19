import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutiveKpi {
  label: string;
  value: number;
  formatted: string;
  yoyChange: number;
  budget: number;
  budgetPct: number;
  sparkline: number[];
  favorable: boolean;
}

export interface PnlSummary {
  interestIncome: number;
  interestExpense: number;
  netInterestIncome: number;
  feeCommission: number;
  tradingIncome: number;
  otherIncome: number;
  totalRevenue: number;
  opex: number;
  provisions: number;
  pbt: number;
  tax: number;
  netProfit: number;
  nim: number;
  costToIncome: number;
  roe: number;
}

export interface MonthlyPnl {
  month: string;
  interestIncome: number;
  feeIncome: number;
  tradingIncome: number;
  opex: number;
  netProfit: number;
}

export interface KeyRatio {
  label: string;
  value: number;
  formatted: string;
  target: number;
  targetLabel: string;
  targetType: 'MIN' | 'MAX' | 'RANGE';
  met: boolean;
  peerAvg?: number;
  barFill: number;
}

export interface CustomerGrowthData {
  month: string;
  newCustomers: number;
  closedCustomers: number;
  netGrowth: number;
  totalCustomers: number;
}

export interface BranchPerformance {
  rank: number;
  branch: string;
  deposits: number;
  loans: number;
  revenue: number;
  customers: number;
  efficiencyRatio: number;
}

export interface DepositLoanPoint {
  month: string;
  deposits: number;
  loans: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getExecutiveKpis(): Promise<ExecutiveKpi[]> {
  return apiGet<ExecutiveKpi[]>('/api/v1/reports/executive/kpis').catch(() => []);
}

export function getPnlSummary(): Promise<PnlSummary> {
  return apiGet<PnlSummary>('/api/v1/reports/executive/pnl-summary');
}

export function getMonthlyPnl(): Promise<MonthlyPnl[]> {
  return apiGet<MonthlyPnl[]>('/api/v1/reports/executive/monthly-pnl').catch(() => []);
}

export function getKeyRatios(): Promise<KeyRatio[]> {
  return apiGet<KeyRatio[]>('/api/v1/reports/executive/key-ratios').catch(() => []);
}

export function getCustomerGrowthData(): Promise<CustomerGrowthData[]> {
  return apiGet<CustomerGrowthData[]>('/api/v1/reports/executive/customer-growth').catch(() => []);
}

export function getDepositLoanGrowthData(): Promise<DepositLoanPoint[]> {
  return apiGet<DepositLoanPoint[]>('/api/v1/reports/executive/deposit-loan-growth').catch(() => []);
}

export function getTopBranches(): Promise<BranchPerformance[]> {
  return apiGet<BranchPerformance[]>('/api/v1/reports/executive/top-branches').catch(() => []);
}
