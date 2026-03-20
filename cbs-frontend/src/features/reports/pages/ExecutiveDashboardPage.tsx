import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, DollarSign, TrendingUp, Users, Landmark, PiggyBank, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import {
  getExecutiveKpis,
  getPnlSummary,
  getMonthlyPnl,
  getKeyRatios,
  getCustomerGrowthData,
  getDepositLoanGrowthData,
  getTopBranches,
  type PnlSummary,
  type ExecutiveKpi,
} from '../api/executiveReportApi';
import { KpiDrilldownCard } from '../components/executive/KpiDrilldownCard';
import { PnlWaterfallChart, type WaterfallItem } from '../components/executive/PnlWaterfallChart';
import { CeoDailyBrief, type BriefKpi, type PendingApproval } from '../components/executive/CeoDailyBrief';
import { IncomeStatementSummary } from '../components/executive/IncomeStatementSummary';
import { MonthlyPnlTrendChart } from '../components/executive/MonthlyPnlTrendChart';
import { KeyRatiosBar } from '../components/executive/KeyRatiosBar';
import { CustomerGrowthChart } from '../components/executive/CustomerGrowthChart';
import { DepositLoanGrowthChart } from '../components/executive/DepositLoanGrowthChart';
import { TopBranchesTable } from '../components/executive/TopBranchesTable';
import { ReportExportSuite, type ExportColumn } from '../components/shared/ReportExportSuite';

// ─── Period Selector ──────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
];

const PERIOD_LABELS: Record<string, string> = {
  mtd: 'Month-to-Date (Mar 2026)',
  qtd: 'Quarter-to-Date (Q1 2026)',
  ytd: 'Year-to-Date FY2025/26',
  custom: 'Custom Period',
};

function PeriodToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded transition-colors',
            p.value === value
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label={`Select ${p.label} period`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_PNL: PnlSummary = {
  interestIncome: 0,
  interestExpense: 0,
  netInterestIncome: 0,
  feeCommission: 0,
  tradingIncome: 0,
  otherIncome: 0,
  totalRevenue: 0,
  opex: 0,
  provisions: 0,
  pbt: 0,
  tax: 0,
  netProfit: 0,
  nim: 0,
  costToIncome: 0,
  roe: 0,
};

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
      {message}
    </div>
  );
}

const KPI_ICONS = [DollarSign, TrendingUp, Landmark, PiggyBank, Users, BarChart3];

const KPI_DRILLDOWN_PATHS: Record<string, string> = {
  'Total Assets': '/reports/financial',
  'Net Interest Income': '/reports/financial',
  'Total Deposits': '/reports/deposits',
  'Gross Loans': '/reports/loans',
  'Net Profit': '/reports/financial',
  'Customer Count': '/reports/customers',
  'Cost-to-Income': '/reports/financial',
  'Return on Equity': '/reports/financial',
};

function buildKpiCards(kpis: ExecutiveKpi[]) {
  return kpis.map((kpi, i) => ({
    label: kpi.label,
    value: kpi.value,
    format: (kpi.label.includes('%') || kpi.label.includes('Ratio') || kpi.label.includes('Return') ? 'percent' : 'money') as 'money' | 'percent' | 'number',
    change: kpi.yoyChange,
    changePeriod: 'YoY',
    sparklineData: kpi.sparkline,
    drilldownPath: KPI_DRILLDOWN_PATHS[kpi.label],
    icon: KPI_ICONS[i % KPI_ICONS.length],
  }));
}

function buildWaterfallData(pnl: PnlSummary): WaterfallItem[] {
  if (pnl.totalRevenue === 0) return [];
  return [
    { category: 'Interest Income', amount: pnl.interestIncome },
    { category: 'Interest Expense', amount: -pnl.interestExpense },
    { category: 'Net Interest Income', amount: pnl.netInterestIncome, isSubtotal: true },
    { category: 'Fee & Commission', amount: pnl.feeCommission },
    { category: 'Trading Income', amount: pnl.tradingIncome },
    { category: 'Other Income', amount: pnl.otherIncome },
    { category: 'Total Revenue', amount: pnl.totalRevenue, isSubtotal: true },
    { category: 'Operating Expenses', amount: -pnl.opex },
    { category: 'Provisions', amount: -pnl.provisions },
    { category: 'Profit Before Tax', amount: pnl.pbt, isSubtotal: true },
    { category: 'Tax', amount: -pnl.tax },
    { category: 'Net Profit', amount: pnl.netProfit, isTotal: true },
  ];
}

function buildBriefKpis(kpis: ExecutiveKpi[]): BriefKpi[] {
  return kpis.map((k) => ({
    label: k.label,
    value: k.value,
    formatted: k.formatted,
    change: k.yoyChange,
    favorable: k.favorable,
  }));
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'label', header: 'Metric' },
  { key: 'formatted', header: 'Value' },
  { key: 'yoyChange', header: 'YoY Change %' },
  { key: 'budgetPct', header: 'Budget %' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ExecutiveDashboardPage() {
  const [period, setPeriod] = useState('ytd');
  const selectedLabel = PERIOD_LABELS[period] ?? '';

  const { data: kpis = [], isError: kpisError } = useQuery({
    queryKey: ['reports', 'executive', 'kpis'],
    queryFn: getExecutiveKpis,
  });
  const { data: pnl = EMPTY_PNL, isError: pnlError } = useQuery({
    queryKey: ['reports', 'executive', 'pnl-summary'],
    queryFn: getPnlSummary,
  });
  const { data: monthlyPnl = [], isError: monthlyPnlError } = useQuery({
    queryKey: ['reports', 'executive', 'monthly-pnl'],
    queryFn: getMonthlyPnl,
  });
  const { data: keyRatios = [], isError: keyRatiosError } = useQuery({
    queryKey: ['reports', 'executive', 'key-ratios'],
    queryFn: getKeyRatios,
  });
  const { data: customerGrowth = [], isError: customerGrowthError } = useQuery({
    queryKey: ['reports', 'executive', 'customer-growth'],
    queryFn: getCustomerGrowthData,
  });
  const { data: depositLoanGrowth = [], isError: depositLoanGrowthError } = useQuery({
    queryKey: ['reports', 'executive', 'deposit-loan-growth'],
    queryFn: getDepositLoanGrowthData,
  });
  const { data: topBranches = [], isError: topBranchesError } = useQuery({
    queryKey: ['reports', 'executive', 'top-branches'],
    queryFn: getTopBranches,
  });

  const kpiCards = useMemo(() => buildKpiCards(kpis), [kpis]);
  const waterfallData = useMemo(() => buildWaterfallData(pnl), [pnl]);
  const briefKpis = useMemo(() => buildBriefKpis(kpis), [kpis]);

  // Simulated pending approvals for the brief
  const pendingApprovals: PendingApproval[] = [
    { type: 'loan approvals', count: 3 },
    { type: 'expense requests', count: 5 },
  ];

  const hasLoadError =
    kpisError ||
    pnlError ||
    monthlyPnlError ||
    keyRatiosError ||
    customerGrowthError ||
    depositLoanGrowthError ||
    topBranchesError;

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        subtitle={`Board-level financial overview — ${selectedLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <PeriodToggle value={period} onChange={setPeriod} />
            <ReportExportSuite
              reportName="Executive_Dashboard"
              data={kpis}
              columns={EXPORT_COLUMNS}
            />
          </div>
        }
      />

      <div className="page-container space-y-6">
        {hasLoadError && (
          <SectionError message="One or more executive-report datasets could not be loaded from the backend." />
        )}

        {/* CEO Daily Brief */}
        <CeoDailyBrief
          kpis={briefKpis}
          pendingApprovals={pendingApprovals}
          recentEvents={[
            { description: 'Q1 board presentation materials are due by end of week.' },
            { description: 'CBN monetary policy rate was held steady at 22.75% in the latest MPC meeting.' },
          ]}
        />

        {/* Row 1 — KPI Drilldown Cards */}
        {kpisError ? (
          <SectionError message="Executive KPIs could not be loaded from the backend." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiCards.map((card) => (
              <KpiDrilldownCard key={card.label} {...card} period={period} />
            ))}
          </div>
        )}

        {/* Row 2 — P&L Waterfall + Income Statement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {pnlError ? (
            <SectionError message="P&L summary could not be loaded from the backend." />
          ) : (
            <PnlWaterfallChart data={waterfallData} />
          )}
          {pnlError ? (
            <SectionError message="P&L summary could not be loaded from the backend." />
          ) : (
            <IncomeStatementSummary pnl={pnl} />
          )}
        </div>

        {/* Row 3 — Monthly P&L Chart (full width) */}
        {monthlyPnlError ? (
          <SectionError message="Monthly P&L trend could not be loaded from the backend." />
        ) : (
          <MonthlyPnlTrendChart data={monthlyPnl} />
        )}

        {/* Row 4 — Key Ratios (full width) */}
        {keyRatiosError ? (
          <SectionError message="Key ratios could not be loaded from the backend." />
        ) : (
          <KeyRatiosBar ratios={keyRatios} />
        )}

        {/* Row 5 — Customer Growth + Deposit/Loan Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {customerGrowthError ? (
            <SectionError message="Customer growth data could not be loaded from the backend." />
          ) : (
            <CustomerGrowthChart data={customerGrowth} />
          )}
          {depositLoanGrowthError ? (
            <SectionError message="Deposit-loan growth data could not be loaded from the backend." />
          ) : (
            <DepositLoanGrowthChart data={depositLoanGrowth} />
          )}
        </div>

        {/* Row 6 — Top Branches Table */}
        {topBranchesError ? (
          <SectionError message="Top-branch performance could not be loaded from the backend." />
        ) : (
          <TopBranchesTable branches={topBranches} />
        )}
      </div>
    </>
  );
}
