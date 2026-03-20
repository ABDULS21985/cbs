import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown } from 'lucide-react';
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
} from '../api/executiveReportApi';
import { ExecutiveKpiCards } from '../components/executive/ExecutiveKpiCards';
import { IncomeStatementSummary } from '../components/executive/IncomeStatementSummary';
import { MonthlyPnlTrendChart } from '../components/executive/MonthlyPnlTrendChart';
import { KeyRatiosBar } from '../components/executive/KeyRatiosBar';
import { CustomerGrowthChart } from '../components/executive/CustomerGrowthChart';
import { DepositLoanGrowthChart } from '../components/executive/DepositLoanGrowthChart';
import { TopBranchesTable } from '../components/executive/TopBranchesTable';

// ─── Period Selector ──────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'this-month', label: 'This Month (Mar 2026)' },
  { value: 'last-month', label: 'Last Month (Feb 2026)' },
  { value: 'q1-2026', label: 'Q1 2026 (Jan–Mar)' },
  { value: 'q4-2025', label: 'Q4 2025 (Oct–Dec)' },
  { value: 'q3-2025', label: 'Q3 2025 (Jul–Sep)' },
  { value: 'ytd-2026', label: 'YTD FY2025/26 (Apr–Mar)' },
  { value: 'fy-2025', label: 'Full Year FY2024/25' },
];

function PeriodSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = PERIODS.find((p) => p.value === value) ?? PERIODS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium bg-card hover:bg-muted/50 transition-colors',
        )}
      >
        <span>{selected.label}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[220px] rounded-md border border-border bg-popover shadow-lg py-1">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => {
                  onChange(period.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors',
                  period.value === value ? 'font-semibold text-primary' : 'text-foreground',
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function ExecutiveDashboardPage() {
  const [period, setPeriod] = useState('ytd-2026');
  const selectedLabel = PERIODS.find((p) => p.value === period)?.label ?? '';
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
            <PeriodSelector value={period} onChange={setPeriod} />
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/50 transition-colors">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {hasLoadError && (
          <SectionError message="One or more executive-report datasets could not be loaded from the backend." />
        )}
        {/* Row 1 — KPI Cards */}
        {kpisError ? (
          <SectionError message="Executive KPIs could not be loaded from the backend." />
        ) : (
          <ExecutiveKpiCards kpis={kpis} />
        )}

        {/* Row 2 — Income Statement + Monthly P&L Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {pnlError ? (
            <SectionError message="P&L summary could not be loaded from the backend." />
          ) : (
            <IncomeStatementSummary pnl={pnl} />
          )}
          {monthlyPnlError ? (
            <SectionError message="Monthly P&L trend could not be loaded from the backend." />
          ) : (
            <MonthlyPnlTrendChart data={monthlyPnl} />
          )}
        </div>

        {/* Row 3 — Key Ratios (full width) */}
        {keyRatiosError ? (
          <SectionError message="Key ratios could not be loaded from the backend." />
        ) : (
          <KeyRatiosBar ratios={keyRatios} />
        )}

        {/* Row 4 — Customer Growth + Deposit/Loan Growth */}
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

        {/* Row 5 — Top Branches Table */}
        {topBranchesError ? (
          <SectionError message="Top-branch performance could not be loaded from the backend." />
        ) : (
          <TopBranchesTable branches={topBranches} />
        )}
      </div>
    </>
  );
}
