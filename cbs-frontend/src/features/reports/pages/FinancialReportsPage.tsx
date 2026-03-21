import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { FileBarChart2, Loader2 } from 'lucide-react';

import {
  ComparisonPeriodSelector,
  type ReportType,
} from '../components/financial/ComparisonPeriodSelector';
import { BalanceSheetReport } from '../components/financial/BalanceSheetReport';
import { IncomeStatementReport } from '../components/financial/IncomeStatementReport';
import { CashFlowReport } from '../components/financial/CashFlowReport';
import { CapitalAdequacyReport } from '../components/financial/CapitalAdequacyReport';
import { VarianceTable, type VarianceLineItem } from '../components/financial/VarianceTable';
import { ReportExportSuite, type ExportColumn } from '../components/shared/ReportExportSuite';

import {
  getBalanceSheet,
  getIncomeStatement,
  getCashFlow,
  getCapitalAdequacy,
  type BalanceSheetData,
  type IncomeStatementData,
  type CashFlowData,
  type CapitalAdequacyData,
  type FinancialLineItem,
} from '../api/financialReportApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportData =
  | { type: 'balance_sheet'; data: BalanceSheetData }
  | { type: 'income_statement'; data: IncomeStatementData }
  | { type: 'cash_flow'; data: CashFlowData }
  | { type: 'capital_adequacy'; data: CapitalAdequacyData }
  | null;

// ─── Helpers: build VarianceTable data from report ─────────────────────────

function buildVarianceRows(items: FinancialLineItem[]): VarianceLineItem[] {
  return items
    .filter((item) => !item.isSeparator && !item.isHeader && item.budget !== undefined && item.budget !== null)
    .map((item) => {
      const budget = item.budget ?? 0;
      const varianceAmt = item.current - budget;
      const variancePct = budget !== 0 ? (varianceAmt / Math.abs(budget)) * 100 : 0;
      return {
        lineItem: item.label,
        current: item.current,
        priorPeriod: item.prior,
        budget,
        varianceAmt,
        variancePct,
      };
    });
}

// ─── Helpers: build export data ────────────────────────────────────────────

const VARIANCE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'lineItem', header: 'Line Item' },
  { key: 'current', header: 'Current' },
  { key: 'priorPeriod', header: 'Prior Period' },
  { key: 'budget', header: 'Budget' },
  { key: 'varianceAmt', header: 'Variance (₦)' },
  { key: 'variancePct', header: 'Variance (%)' },
];

const BS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'label', header: 'Line Item' },
  { key: 'current', header: 'Current Period' },
  { key: 'prior', header: 'Prior Period' },
  { key: 'budget', header: 'Budget' },
];

const IS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'label', header: 'Line Item' },
  { key: 'current', header: 'Current Period' },
  { key: 'prior', header: 'Prior Period' },
  { key: 'budget', header: 'Budget' },
];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <FileBarChart2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No report generated yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Select a report type and period above, then click{' '}
        <span className="font-medium text-foreground">Generate Report</span> to view the financial statements.
      </p>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ reportType }: { reportType: ReportType }) {
  const labels: Record<ReportType, string> = {
    balance_sheet: 'Balance Sheet',
    income_statement: 'Income Statement',
    cash_flow: 'Cash Flow Statement',
    capital_adequacy: 'Capital Adequacy Report',
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-sm font-medium text-foreground">Generating {labels[reportType]}…</p>
      <p className="text-xs text-muted-foreground mt-1">Fetching data from GL and financial systems</p>
    </div>
  );
}

// ─── Toast helper (simple) ────────────────────────────────────────────────────

function showToast(msg: string) {
  console.info('[FinancialReports]', msg);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FinancialReportsPage() {
  useEffect(() => { document.title = 'Financial Reports | CBS'; }, []);
  // Controls
  const defaultPeriod = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM');
  const [reportType, setReportType] = useState<ReportType>('balance_sheet');
  const [period, setPeriod] = useState(defaultPeriod);
  const [comparison, setComparison] = useState('prior_year_end');

  // Data
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>(null);

  // ─── Derived: variance rows and export data ────────────────────────────────

  const varianceRows = useMemo<VarianceLineItem[]>(() => {
    if (!reportData) return [];
    if (reportData.type === 'balance_sheet') {
      const allItems = [
        ...reportData.data.assets,
        ...reportData.data.liabilities,
        ...reportData.data.equity,
      ];
      return buildVarianceRows(allItems);
    }
    if (reportData.type === 'income_statement') {
      return buildVarianceRows(reportData.data.items);
    }
    return [];
  }, [reportData]);

  const exportData = useMemo<Record<string, any>[]>(() => {
    if (!reportData) return [];
    if (reportData.type === 'balance_sheet') {
      return [
        ...reportData.data.assets,
        ...reportData.data.liabilities,
        ...reportData.data.equity,
      ].filter((item) => !item.isSeparator && !item.isHeader);
    }
    if (reportData.type === 'income_statement') {
      return reportData.data.items.filter((item) => !item.isSeparator && !item.isHeader);
    }
    if (reportData.type === 'cash_flow') {
      return [
        ...reportData.data.operating,
        ...reportData.data.investing,
        ...reportData.data.financing,
      ].filter((item) => !item.isSeparator && !item.isHeader);
    }
    return [];
  }, [reportData]);

  const exportColumns: ExportColumn[] = useMemo(() => {
    if (!reportData) return BS_EXPORT_COLUMNS;
    if (reportData.type === 'income_statement') return IS_EXPORT_COLUMNS;
    return BS_EXPORT_COLUMNS;
  }, [reportData]);

  const exportReportName = useMemo(() => {
    if (!reportData) return 'Financial_Report';
    const names: Record<string, string> = {
      balance_sheet: 'Balance_Sheet',
      income_statement: 'Income_Statement',
      cash_flow: 'Cash_Flow',
      capital_adequacy: 'Capital_Adequacy',
    };
    return `${names[reportData.type] || 'Financial_Report'}_${period}`;
  }, [reportData, period]);

  // ─── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      switch (reportType) {
        case 'balance_sheet': {
          const data = await getBalanceSheet(period, comparison);
          setReportData({ type: 'balance_sheet', data });
          break;
        }
        case 'income_statement': {
          const data = await getIncomeStatement(period, comparison);
          setReportData({ type: 'income_statement', data });
          break;
        }
        case 'cash_flow': {
          const data = await getCashFlow(period);
          setReportData({ type: 'cash_flow', data });
          break;
        }
        case 'capital_adequacy': {
          const data = await getCapitalAdequacy(period);
          setReportData({ type: 'capital_adequacy', data });
          break;
        }
      }
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setLoading(false);
    }
  }, [reportType, period, comparison]);

  // ─── Export handlers ───────────────────────────────────────────────────────

  const handleExportPdf = () => {
    showToast('PDF export triggered — connect to server-side PDF renderer.');
    window.print();
  };

  const handleExportExcel = () => {
    showToast('Excel export triggered — connect to xlsx library or API endpoint.');
  };

  // ─── Report type change resets data ───────────────────────────────────────

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    setReportData(null);
  };

  // ─── Subtitle ─────────────────────────────────────────────────────────────

  const subtitle = reportData
    ? (() => {
        const label = {
          balance_sheet: 'Statement of Financial Position',
          income_statement: 'Statement of Comprehensive Income',
          cash_flow: 'Statement of Cash Flows',
          capital_adequacy: 'Capital Adequacy & Basel III',
        }[reportData.type];
        return label;
      })()
    : 'Generate and review statutory financial statements';

  const showVarianceSection =
    !loading && reportData &&
    (reportData.type === 'balance_sheet' || reportData.type === 'income_statement') &&
    varianceRows.length > 0;

  return (
    <>
      <PageHeader
        title="Financial Reports"
        subtitle={subtitle}
        actions={
          reportData && !loading ? (
            <ReportExportSuite
              reportName={exportReportName}
              data={exportData}
              columns={exportColumns}
            />
          ) : undefined
        }
      />

      <div className="page-container space-y-5">
        {/* Controls */}
        <ComparisonPeriodSelector
          reportType={reportType}
          onReportTypeChange={handleReportTypeChange}
          period={period}
          onPeriodChange={setPeriod}
          comparison={comparison}
          onComparisonChange={setComparison}
          onGenerate={handleGenerate}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          loading={loading}
        />

        {/* Report area */}
        <div className={cn('transition-opacity duration-200', loading && 'opacity-60 pointer-events-none')}>
          {loading && <LoadingState reportType={reportType} />}

          {!loading && !reportData && <EmptyState />}

          {!loading && reportData && (
            <div className="space-y-6">
              {reportData.type === 'balance_sheet' && (
                <BalanceSheetReport data={reportData.data} showVariance />
              )}
              {reportData.type === 'income_statement' && (
                <IncomeStatementReport data={reportData.data} showVariance />
              )}
              {reportData.type === 'cash_flow' && (
                <CashFlowReport data={reportData.data} />
              )}
              {reportData.type === 'capital_adequacy' && (
                <CapitalAdequacyReport data={reportData.data} />
              )}

              {/* Variance Analysis — shown for Balance Sheet and Income Statement when budget data is available */}
              {showVarianceSection && (
                <div>
                  <VarianceTable
                    data={varianceRows}
                    favorableDirection={reportData.type === 'income_statement' ? 'higher' : 'higher'}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
