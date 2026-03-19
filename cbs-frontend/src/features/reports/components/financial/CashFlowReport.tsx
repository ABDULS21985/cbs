import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { VarianceIndicator } from './VarianceIndicator';
import { FinancialLineItemRow } from './FinancialLineItemRow';
import type { CashFlowData, FinancialLineItem } from '../../api/financialReportApi';

// ─── Activity Section ─────────────────────────────────────────────────────────

interface ActivitySectionProps {
  label: string;
  color: 'blue' | 'amber' | 'purple';
  items: FinancialLineItem[];
  currency: string;
}

const COLOR_MAP: Record<string, { band: string; total: string }> = {
  blue: {
    band: 'bg-blue-50/60 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400',
    total: 'bg-blue-50/40 dark:bg-blue-900/10 border-t-2 border-blue-200/60 dark:border-blue-800/40',
  },
  amber: {
    band: 'bg-amber-50/60 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
    total: 'bg-amber-50/40 dark:bg-amber-900/10 border-t-2 border-amber-200/60 dark:border-amber-800/40',
  },
  purple: {
    band: 'bg-purple-50/60 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400',
    total: 'bg-purple-50/40 dark:bg-purple-900/10 border-t-2 border-purple-200/60 dark:border-purple-800/40',
  },
};

function ActivitySection({ label, color, items, currency }: ActivitySectionProps) {
  const colors = COLOR_MAP[color];
  const totalItem = items[items.length - 1]; // Last item is the total
  const lineItems = items.slice(0, -1); // All except last
  const isPositive = totalItem.current >= 0;

  return (
    <>
      {/* Section band */}
      <tr className={colors.band}>
        <td colSpan={4} className="py-2 px-3 text-xs font-black uppercase tracking-[0.15em]">
          {label}
        </td>
      </tr>

      {/* Line items */}
      {lineItems.map((item) => (
        <FinancialLineItemRow
          key={item.code}
          item={item}
          showVariance={false}
          currency={currency}
          favorable={item.current >= 0 ? 'higher' : 'lower'}
        />
      ))}

      {/* Total */}
      <tr className={colors.total}>
        <td className="py-2.5 px-3 text-sm font-bold">{totalItem.label}</td>
        <td className={cn('py-2.5 px-3 text-right font-bold font-mono tabular-nums', isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
          {formatMoney(totalItem.current, currency)}
        </td>
        <td className={cn('py-2.5 px-3 text-right font-bold font-mono tabular-nums', isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
          {formatMoney(totalItem.prior, currency)}
        </td>
        <td className="py-2.5 px-3 text-right">
          <VarianceIndicator current={totalItem.current} prior={totalItem.prior} favorable="higher" />
        </td>
      </tr>
    </>
  );
}

// ─── Cash Reconciliation ──────────────────────────────────────────────────────

interface ReconciliationRowProps {
  label: string;
  value: number;
  currency: string;
  isHighlighted?: boolean;
  isTotal?: boolean;
}

function ReconciliationRow({ label, value, currency, isHighlighted, isTotal }: ReconciliationRowProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2.5 border-b border-border/50',
      isTotal && 'bg-primary/8 border-t-2 border-primary/30',
      isHighlighted && 'bg-muted/30',
    )}>
      <span className={cn('text-sm', isTotal && 'font-bold uppercase tracking-wide text-primary')}>
        {label}
      </span>
      <span className={cn(
        'font-mono tabular-nums text-sm',
        isTotal ? 'font-bold text-primary' : 'font-medium',
        value < 0 && 'text-red-600 dark:text-red-400',
      )}>
        {value < 0 ? `(${formatMoney(Math.abs(value), currency)})` : formatMoney(value, currency)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CashFlowReportProps {
  data: CashFlowData;
}

export function CashFlowReport({ data }: CashFlowReportProps) {
  // Extract totals from each section
  const operatingTotal = data.operating[data.operating.length - 1];
  const investingTotal = data.investing[data.investing.length - 1];
  const financingTotal = data.financing[data.financing.length - 1];
  const priorNetCash = (operatingTotal?.prior ?? 0) + (investingTotal?.prior ?? 0) + (financingTotal?.prior ?? 0);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-5 border-b border-border text-center bg-muted/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {data.entityName}
        </p>
        <h2 className="text-lg font-bold tracking-tight">Statement of Cash Flows</h2>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">{data.periodLabel}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">All amounts in NGN — indirect method</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[45%]">
                Activity
              </th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Period
              </th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prior Period
              </th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            <ActivitySection label="OPERATING ACTIVITIES" color="blue" items={data.operating} currency="NGN" />
            <tr><td colSpan={4} className="py-2" /></tr>
            <ActivitySection label="INVESTING ACTIVITIES" color="amber" items={data.investing} currency="NGN" />
            <tr><td colSpan={4} className="py-2" /></tr>
            <ActivitySection label="FINANCING ACTIVITIES" color="purple" items={data.financing} currency="NGN" />

            {/* Net change */}
            <tr>
              <td colSpan={4} className="py-1" />
            </tr>
            <tr className="bg-muted/30 border-t-2 border-border">
              <td className="py-2.5 px-3 font-bold text-sm uppercase tracking-wide">
                NET INCREASE IN CASH & EQUIVALENTS
              </td>
              <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums">
                {formatMoney(data.netCashflow, 'NGN')}
              </td>
              <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums">
                {formatMoney(priorNetCash, 'NGN')}
              </td>
              <td className="py-2.5 px-3 text-right">
                <VarianceIndicator current={data.netCashflow} prior={priorNetCash} favorable="higher" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cash reconciliation block */}
      <div className="border-t border-border">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Cash & Cash Equivalents Reconciliation
          </h3>
          <div className="rounded-lg border border-border overflow-hidden max-w-sm">
            <ReconciliationRow
              label="Opening cash & equivalents"
              value={data.openingCash}
              currency="NGN"
              isHighlighted
            />
            <ReconciliationRow
              label="Net increase/(decrease) in cash"
              value={data.netCashflow}
              currency="NGN"
            />
            <ReconciliationRow
              label="Closing cash & equivalents"
              value={data.closingCash}
              currency="NGN"
              isTotal
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Cash flows are presented using the indirect method in accordance with IAS 7 — Statement of Cash Flows.
          Amounts in Nigerian Naira (₦). Parentheses denote cash outflows.
        </p>
      </div>
    </div>
  );
}
