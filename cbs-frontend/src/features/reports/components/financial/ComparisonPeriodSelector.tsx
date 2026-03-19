import { cn } from '@/lib/utils';
import { FileText, TrendingUp, Droplets, Shield, RefreshCw, FileDown, Table2 } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportType = 'balance_sheet' | 'income_statement' | 'cash_flow' | 'capital_adequacy';

interface ReportTypeOption {
  value: ReportType;
  label: string;
  icon: React.ElementType;
}

const REPORT_TYPES: ReportTypeOption[] = [
  { value: 'balance_sheet', label: 'Balance Sheet', icon: FileText },
  { value: 'income_statement', label: 'Income Statement', icon: TrendingUp },
  { value: 'cash_flow', label: 'Cash Flow', icon: Droplets },
  { value: 'capital_adequacy', label: 'Capital Adequacy', icon: Shield },
];

const COMPARISON_OPTIONS = [
  { value: 'prior_month', label: 'vs Prior Month' },
  { value: 'same_month_ly', label: 'vs Same Month Last Year' },
  { value: 'budget', label: 'vs Budget' },
  { value: 'prior_year_end', label: 'vs Prior Year-End' },
];

// ─── Period Generator ─────────────────────────────────────────────────────────

function generatePeriodOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = startOfMonth(subMonths(now, i));
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return options;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComparisonPeriodSelectorProps {
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  period: string;
  onPeriodChange: (p: string) => void;
  comparison: string;
  onComparisonChange: (c: string) => void;
  onGenerate: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComparisonPeriodSelector({
  reportType,
  onReportTypeChange,
  period,
  onPeriodChange,
  comparison,
  onComparisonChange,
  onGenerate,
  onExportPdf,
  onExportExcel,
  loading = false,
}: ComparisonPeriodSelectorProps) {
  const periodOptions = generatePeriodOptions();

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      {/* Report type selector */}
      <div className="flex flex-wrap gap-1.5">
        {REPORT_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onReportTypeChange(value)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors border',
              reportType === value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-foreground border-border hover:bg-muted',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period select */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Period</label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-sm border border-border rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[160px]"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comparison select */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Compare</label>
          <select
            value={comparison}
            onChange={(e) => onComparisonChange(e.target.value)}
            className="text-sm border border-border rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
          >
            {COMPARISON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          {loading ? 'Generating…' : 'Generate Report'}
        </button>

        {/* Export buttons — push to right */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors text-foreground"
          >
            <FileDown className="w-3.5 h-3.5 text-red-500" />
            Export PDF
          </button>
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors text-foreground"
          >
            <Table2 className="w-3.5 h-3.5 text-green-600" />
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
