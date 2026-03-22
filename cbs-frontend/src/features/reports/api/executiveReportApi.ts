import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by dashboard components) ────────────────────────

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

// ─── Backend Response Types ───────────────────────────────────────────────────

interface BackendExecutiveKpis {
  totalDeposits: number;
  totalLoans: number;
  totalCustomers: number;
  totalRevenue: number;
  nplRatio: number;
  costToIncomeRatio: number;
  priorPeriodRevenue: number | null;
  changePercent: number | null;
  changeDirection: string | null; // "UP" | "DOWN" | "FLAT"
}

/** Backend PnlSummary — simple totals-only shape from ReportsService.getPnlSummary() */
interface BackendPnlSummary {
  currentRevenue: number;
  currentExpenses: number;
  currentNetProfit: number;
  priorRevenue: number;
  priorExpenses: number;
  priorNetProfit: number;
}

/** Enriched backend shape from PnlSummaryV2 DTO (after service update) */
interface BackendPnlSummaryV2 {
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

interface BackendMonthlyPnlEntry {
  month: string;
  // Enriched shape (MonthlyPnlEntryV2) — new fields
  interestIncome?: number;
  feeIncome?: number;
  tradingIncome?: number;
  opex?: number;
  netProfit?: number;
  // Legacy shape (MonthlyPnlEntry) — fallback fields
  revenue?: number;
  expenses?: number;
}

interface BackendKeyRatios {
  roa: number;
  roe: number;
  nim: number;
  costToIncome: number;
  car: number;
  ldr: number;
}

interface BackendCustomerGrowthEntry {
  month: string;
  newCustomers: number;
  closedCustomers: number;
  netGrowth: number;
  totalCustomers?: number; // added in CustomerGrowthEntryV2; may be absent on older backends
}

interface BackendBranchPerformance {
  branchCode?: string;
  branchName?: string;
  branch?: string;         // present if already mapped
  revenue: number;
  deposits: number;
  loans: number;
  customers?: number;
  efficiencyRatio?: number;
}

// ─── Transformation Functions ─────────────────────────────────────────────────

function mapKpisResponseToArray(r: BackendExecutiveKpis): ExecutiveKpi[] {
  const pct = r.changePercent ?? 0;
  const favorable = r.changeDirection === 'UP';
  return [
    { label: 'Total Deposits',  value: r.totalDeposits,      formatted: formatMoney(r.totalDeposits),      yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable },
    { label: 'Gross Loans',     value: r.totalLoans,          formatted: formatMoney(r.totalLoans),          yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable },
    { label: 'Customer Count',  value: r.totalCustomers,      formatted: r.totalCustomers.toLocaleString(),  yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable },
    { label: 'Total Revenue',   value: r.totalRevenue,        formatted: formatMoney(r.totalRevenue),        yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable },
    { label: 'NPL Ratio',       value: r.nplRatio,            formatted: `${r.nplRatio.toFixed(2)}%`,        yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable: r.changeDirection === 'DOWN' },
    { label: 'Cost-to-Income',  value: r.costToIncomeRatio,   formatted: `${r.costToIncomeRatio.toFixed(2)}%`, yoyChange: pct, budget: 0, budgetPct: 0, sparkline: [], favorable: r.changeDirection === 'DOWN' },
  ];
}

/**
 * Transforms either the new PnlSummaryV2 (all breakdown fields) or the legacy
 * PnlSummary (totals only) into the frontend PnlSummary contract.
 */
function mapPnlSummary(raw: BackendPnlSummaryV2 | BackendPnlSummary): PnlSummary {
  const v2 = raw as BackendPnlSummaryV2;
  const legacy = raw as BackendPnlSummary;

  // Prefer enriched fields if present
  if (v2.totalRevenue != null) {
    return {
      interestIncome:    v2.interestIncome    ?? 0,
      interestExpense:   v2.interestExpense   ?? 0,
      netInterestIncome: v2.netInterestIncome ?? 0,
      feeCommission:     v2.feeCommission     ?? 0,
      tradingIncome:     v2.tradingIncome     ?? 0,
      otherIncome:       v2.otherIncome       ?? 0,
      totalRevenue:      v2.totalRevenue      ?? 0,
      opex:              v2.opex              ?? 0,
      provisions:        v2.provisions        ?? 0,
      pbt:               v2.pbt               ?? 0,
      tax:               v2.tax               ?? 0,
      netProfit:         v2.netProfit         ?? 0,
      nim:               v2.nim               ?? 0,
      costToIncome:      v2.costToIncome      ?? 0,
      roe:               v2.roe               ?? 0,
    };
  }

  // Fallback: map legacy totals-only shape
  const revenue  = legacy.currentRevenue  ?? 0;
  const expenses = legacy.currentExpenses ?? 0;
  const net      = legacy.currentNetProfit ?? (revenue - expenses);
  return {
    interestIncome:    revenue,
    interestExpense:   0,
    netInterestIncome: revenue,
    feeCommission:     0,
    tradingIncome:     0,
    otherIncome:       0,
    totalRevenue:      revenue,
    opex:              expenses,
    provisions:        0,
    pbt:               net,
    tax:               0,
    netProfit:         net,
    nim:               0,
    costToIncome:      revenue > 0 ? (expenses / revenue) * 100 : 0,
    roe:               0,
  };
}

function mapMonthlyPnl(entries: BackendMonthlyPnlEntry[]): MonthlyPnl[] {
  return (entries ?? []).map((e) => {
    // Prefer enriched fields (MonthlyPnlEntryV2), fall back to legacy revenue/expenses
    const interestIncome = e.interestIncome ?? e.revenue ?? 0;
    const expenses       = e.opex ?? e.expenses ?? 0;
    return {
      month:         e.month        ?? '',
      interestIncome,
      feeIncome:     e.feeIncome    ?? 0,
      tradingIncome: e.tradingIncome ?? 0,
      opex:          expenses,
      netProfit:     e.netProfit    ?? (interestIncome - expenses),
    };
  });
}

/**
 * Transforms the backend's single KeyRatios object into the array of
 * enriched KeyRatio rows the frontend ratio bar renders.
 */
function mapKeyRatios(raw: BackendKeyRatios): KeyRatio[] {
  const fmt = (v: number, unit: string) => `${v.toFixed(2)}${unit}`;
  const clamp = (v: number, max: number) => Math.min(100, (v / max) * 100);

  return [
    {
      label: 'ROA',
      value: raw.roa ?? 0,
      formatted: fmt(raw.roa ?? 0, '%'),
      target: 1.5,
      targetLabel: '≥ 1.5%',
      targetType: 'MIN',
      met: (raw.roa ?? 0) >= 1.5,
      barFill: clamp(raw.roa ?? 0, 3),
    },
    {
      label: 'ROE',
      value: raw.roe ?? 0,
      formatted: fmt(raw.roe ?? 0, '%'),
      target: 15,
      targetLabel: '≥ 15%',
      targetType: 'MIN',
      met: (raw.roe ?? 0) >= 15,
      barFill: clamp(raw.roe ?? 0, 30),
    },
    {
      label: 'NIM',
      value: raw.nim ?? 0,
      formatted: fmt(raw.nim ?? 0, '%'),
      target: 4,
      targetLabel: '≥ 4%',
      targetType: 'MIN',
      met: (raw.nim ?? 0) >= 4,
      barFill: clamp(raw.nim ?? 0, 8),
    },
    {
      label: 'Cost-to-Income',
      value: raw.costToIncome ?? 0,
      formatted: fmt(raw.costToIncome ?? 0, '%'),
      target: 55,
      targetLabel: '≤ 55%',
      targetType: 'MAX',
      met: (raw.costToIncome ?? 0) <= 55,
      barFill: clamp(raw.costToIncome ?? 0, 100),
    },
    {
      label: 'CAR',
      value: raw.car ?? 0,
      formatted: fmt(raw.car ?? 0, '%'),
      target: 15,
      targetLabel: '≥ 15%',
      targetType: 'MIN',
      met: (raw.car ?? 0) >= 15,
      barFill: clamp(raw.car ?? 0, 30),
    },
    {
      label: 'LDR',
      value: raw.ldr ?? 0,
      formatted: fmt(raw.ldr ?? 0, '%'),
      target: 80,
      targetLabel: '≤ 80%',
      targetType: 'MAX',
      met: (raw.ldr ?? 0) <= 80,
      barFill: clamp(raw.ldr ?? 0, 120),
    },
  ];
}

function mapCustomerGrowth(entries: BackendCustomerGrowthEntry[]): CustomerGrowthData[] {
  let running = 0;
  return (entries ?? []).map((e) => {
    running = e.totalCustomers ?? running + (e.netGrowth ?? 0);
    return {
      month:           e.month           ?? '',
      newCustomers:    e.newCustomers     ?? 0,
      closedCustomers: e.closedCustomers  ?? 0,
      netGrowth:       e.netGrowth        ?? 0,
      totalCustomers:  running,
    };
  });
}

function mapTopBranches(entries: BackendBranchPerformance[]): BranchPerformance[] {
  return (entries ?? []).map((e, idx) => ({
    rank:            idx + 1,
    branch:          e.branchName ?? e.branch ?? e.branchCode ?? `Branch ${idx + 1}`,
    deposits:        e.deposits        ?? 0,
    loans:           e.loans           ?? 0,
    revenue:         e.revenue         ?? 0,
    customers:       e.customers       ?? 0,
    efficiencyRatio: e.efficiencyRatio  ?? 0,
  }));
}

function formatMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getExecutiveKpis(): Promise<ExecutiveKpi[]> {
  const raw = await apiGet<BackendExecutiveKpis>('/api/v1/reports/executive/kpis');
  return mapKpisResponseToArray(raw);
}

export async function getPnlSummary(): Promise<PnlSummary> {
  const raw = await apiGet<BackendPnlSummaryV2 | BackendPnlSummary>('/api/v1/reports/executive/pnl-summary');
  return mapPnlSummary(raw);
}

export async function getMonthlyPnl(): Promise<MonthlyPnl[]> {
  const raw = await apiGet<BackendMonthlyPnlEntry[]>('/api/v1/reports/executive/monthly-pnl');
  return mapMonthlyPnl(raw);
}

export async function getKeyRatios(): Promise<KeyRatio[]> {
  const raw = await apiGet<BackendKeyRatios>('/api/v1/reports/executive/key-ratios');
  return mapKeyRatios(raw);
}

export async function getCustomerGrowthData(): Promise<CustomerGrowthData[]> {
  const raw = await apiGet<BackendCustomerGrowthEntry[]>('/api/v1/reports/executive/customer-growth');
  return mapCustomerGrowth(raw);
}

export function getDepositLoanGrowthData(): Promise<DepositLoanPoint[]> {
  return apiGet<DepositLoanPoint[]>('/api/v1/reports/executive/deposit-loan-growth');
}

export async function getTopBranches(): Promise<BranchPerformance[]> {
  const raw = await apiGet<BackendBranchPerformance[]>('/api/v1/reports/executive/top-branches');
  return mapTopBranches(raw);
}
