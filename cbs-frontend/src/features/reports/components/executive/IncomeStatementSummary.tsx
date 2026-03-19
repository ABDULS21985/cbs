import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PnlSummary } from '../../api/executiveReportApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}₦${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}₦${(abs / 1e6).toFixed(0)}M`;
  return `${sign}₦${abs.toLocaleString()}`;
}

// ─── Row variants ─────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  variant = 'normal',
  indent = false,
}: {
  label: string;
  value: number;
  variant?: 'normal' | 'muted' | 'subtotal' | 'profit' | 'total';
  indent?: boolean;
}) {
  const labelClass = cn(
    'text-sm',
    indent && 'pl-4',
    variant === 'muted' && 'text-muted-foreground',
    variant === 'subtotal' && 'font-semibold text-foreground',
    variant === 'profit' && 'font-semibold text-green-600 dark:text-green-400',
    variant === 'total' && 'font-bold text-foreground',
    variant === 'normal' && 'text-foreground',
  );
  const valueClass = cn(
    'text-sm text-right tabular-nums',
    variant === 'muted' && 'text-muted-foreground',
    variant === 'subtotal' && 'font-semibold',
    variant === 'profit' && 'font-semibold text-green-600 dark:text-green-400',
    variant === 'total' && 'font-bold',
  );
  const rowClass = cn(
    'flex justify-between items-center py-1.5 px-2 rounded',
    variant === 'subtotal' && 'bg-muted/40',
    variant === 'profit' && 'bg-green-50 dark:bg-green-900/20',
    variant === 'total' && 'bg-primary/5 border border-primary/10',
    (variant === 'normal' || variant === 'muted') && 'hover:bg-muted/30 transition-colors',
  );
  return (
    <div className={rowClass}>
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{fmt(value)}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-1" />;
}

function RatioItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface IncomeStatementSummaryProps {
  pnl: PnlSummary;
}

export function IncomeStatementSummary({ pnl }: IncomeStatementSummaryProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Income Statement Summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Year-to-Date (FY2025/26)</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {/* P&L Lines */}
      <div className="flex-1 space-y-0.5">
        {/* Interest income section */}
        <Row label="Interest Income" value={pnl.interestIncome} />
        <Row label="Interest Expense" value={-pnl.interestExpense} variant="muted" indent />
        <Divider />
        <Row label="Net Interest Income" value={pnl.netInterestIncome} variant="subtotal" />

        <div className="mt-2 space-y-0.5">
          <Row label="Fee & Commission Income" value={pnl.feeCommission} />
          <Row label="Trading Income" value={pnl.tradingIncome} />
          <Row label="Other Income" value={pnl.otherIncome} />
        </div>
        <Divider />
        <Row label="Total Revenue" value={pnl.totalRevenue} variant="subtotal" />

        <div className="mt-2 space-y-0.5">
          <Row label="Operating Expenses" value={-pnl.opex} variant="muted" />
          <Row label="Loan Loss Provisions" value={-pnl.provisions} variant="muted" />
        </div>
        <Divider />
        <Row label="Profit Before Tax" value={pnl.pbt} variant="subtotal" />

        <div className="mt-1">
          <Row label="Income Tax" value={-pnl.tax} variant="muted" />
        </div>
        <Divider />
        <Row label="Net Profit After Tax" value={pnl.netProfit} variant="profit" />
      </div>

      {/* Footer ratios */}
      <div className="mt-4 pt-4 border-t border-border space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Key Ratios</p>
        <RatioItem label="Net Interest Margin (NIM)" value={`${pnl.nim.toFixed(2)}%`} />
        <RatioItem label="Cost-to-Income Ratio" value={`${pnl.costToIncome.toFixed(1)}%`} />
        <RatioItem label="Return on Equity (ROE)" value={`${pnl.roe.toFixed(1)}%`} />
      </div>
    </div>
  );
}
