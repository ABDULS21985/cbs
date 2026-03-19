import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { VarianceIndicator } from './VarianceIndicator';
import { FinancialLineItemRow } from './FinancialLineItemRow';
import type { FinancialLineItem, IncomeStatementData } from '../../api/financialReportApi';

// ─── Revenue/Expense category detection ──────────────────────────────────────

/** Lines with positive current values under income sections. */
const INCOME_CODES = new Set(['I_INT_TOT', 'I_NONFUND_TOT', 'I_OPI', 'I_NII']);
const PROFIT_CODES = new Set(['I_PBT', 'I_PAT', 'I_PPOP']);

function getRowTint(item: FinancialLineItem): string {
  if (!item.isBold || item.isHeader) return '';
  if (PROFIT_CODES.has(item.code)) return 'bg-blue-50/50 dark:bg-blue-900/10';
  if (INCOME_CODES.has(item.code)) return 'bg-green-50/40 dark:bg-green-900/10';
  if (item.current < 0) return 'bg-red-50/30 dark:bg-red-900/10';
  return '';
}

// ─── Section Band ─────────────────────────────────────────────────────────────

interface SectionBandProps {
  label: string;
  colCount: number;
  color: 'primary' | 'red' | 'green' | 'blue';
}

const BAND_COLORS: Record<string, string> = {
  primary: 'bg-primary/5 text-primary',
  red: 'bg-red-50/60 dark:bg-red-900/10 text-red-700 dark:text-red-400',
  green: 'bg-green-50/60 dark:bg-green-900/10 text-green-700 dark:text-green-400',
  blue: 'bg-blue-50/60 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400',
};

function SectionBand({ label, colCount, color }: SectionBandProps) {
  return (
    <tr className={BAND_COLORS[color]}>
      <td colSpan={colCount} className="py-2 px-3 text-xs font-black uppercase tracking-[0.15em]">
        {label}
      </td>
    </tr>
  );
}

// ─── Grand Total Row ───────────────────────────────────────────────────────────

interface GrandTotalProps {
  label: string;
  current: number;
  prior: number;
  showVariance: boolean;
  currency: string;
}

function GrandTotalRow({ label, current, prior, showVariance, currency }: GrandTotalProps) {
  const isPositive = current >= 0;
  return (
    <tr className={cn('border-t-[3px] border-foreground/20', isPositive ? 'bg-green-50/60 dark:bg-green-900/15' : 'bg-red-50/60 dark:bg-red-900/15')}>
      <td className="py-3 px-3 text-sm font-black uppercase tracking-wide">{label}</td>
      <td className={cn('py-3 px-3 text-right text-sm font-black font-mono tabular-nums', isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
        {formatMoney(current, currency)}
      </td>
      <td className={cn('py-3 px-3 text-right text-sm font-black font-mono tabular-nums', isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
        {formatMoney(prior, currency)}
      </td>
      {showVariance && (
        <td className="py-3 px-3 text-right">
          <VarianceIndicator current={current} prior={prior} favorable="higher" />
        </td>
      )}
    </tr>
  );
}

// ─── Income Statement Component ───────────────────────────────────────────────

interface IncomeStatementReportProps {
  data: IncomeStatementData;
  showVariance?: boolean;
}

export function IncomeStatementReport({ data, showVariance = true }: IncomeStatementReportProps) {
  const colCount = showVariance ? 4 : 3;

  // Prior net profit (back-calculate from items, or use a ratio)
  const priorNetProfit = data.items.find((i) => i.code === 'I_PAT')?.prior ?? 0;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-5 border-b border-border text-center bg-muted/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {data.entityName}
        </p>
        <h2 className="text-lg font-bold tracking-tight">Statement of Comprehensive Income</h2>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">{data.periodLabel}</span>
          {' '}(comparative: {data.priorPeriodLabel})
        </p>
        <p className="text-xs text-muted-foreground mt-1">All amounts in {data.currency}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[45%]">
                Line Item
              </th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {data.periodLabel}
              </th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {data.priorPeriodLabel}
              </th>
              {showVariance && (
                <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                  Change
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Section bands */}
            <SectionBand label="INTEREST INCOME" colCount={colCount} color="green" />
            {data.items
              .filter((i) => i.code.startsWith('I_INT') && i.code !== 'I_INT_TOT')
              .map((item) => (
                <FinancialLineItemRow
                  key={item.code}
                  item={item}
                  showVariance={showVariance}
                  currency={data.currency}
                  favorable={item.current >= 0 ? 'higher' : 'lower'}
                />
              ))}
            {data.items
              .filter((i) => i.code === 'I_INT_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="higher" />
              ))}

            <SectionBand label="INTEREST EXPENSE" colCount={colCount} color="red" />
            {data.items
              .filter((i) => i.code.startsWith('I_INTEXP') && i.code !== 'I_INTEXP_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="lower" />
              ))}
            {data.items
              .filter((i) => i.code === 'I_INTEXP_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="lower" />
              ))}

            {/* NII */}
            {data.items
              .filter((i) => i.code === 'I_NII')
              .map((item) => (
                <tr key={item.code} className="bg-blue-50/40 dark:bg-blue-900/10 border-t-2 border-blue-200/60 dark:border-blue-800/40">
                  <td className="py-2.5 px-3 text-sm font-bold pl-3">{item.label}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300">
                    {formatMoney(item.current, data.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300">
                    {formatMoney(item.prior, data.currency)}
                  </td>
                  {showVariance && (
                    <td className="py-2.5 px-3 text-right">
                      <VarianceIndicator current={item.current} prior={item.prior} favorable="higher" />
                    </td>
                  )}
                </tr>
              ))}

            <tr><td colSpan={colCount} className="py-1.5" /></tr>
            <SectionBand label="NON-INTEREST INCOME" colCount={colCount} color="green" />
            {data.items
              .filter((i) => i.code.startsWith('I_NONFUND') || i.code.startsWith('I_FEE') || i.code.startsWith('I_FX') || i.code.startsWith('I_TRAD') || i.code.startsWith('I_OTHER_INC'))
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="higher" />
              ))}

            {/* Total Operating Income */}
            {data.items
              .filter((i) => i.code === 'I_OPI')
              .map((item) => (
                <tr key={item.code} className="bg-primary/8 border-t-2 border-primary/20">
                  <td className="py-2.5 px-3 text-sm font-bold pl-3">{item.label}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-primary">
                    {formatMoney(item.current, data.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-primary">
                    {formatMoney(item.prior, data.currency)}
                  </td>
                  {showVariance && (
                    <td className="py-2.5 px-3 text-right">
                      <VarianceIndicator current={item.current} prior={item.prior} favorable="higher" />
                    </td>
                  )}
                </tr>
              ))}

            <tr><td colSpan={colCount} className="py-1.5" /></tr>
            <SectionBand label="OPERATING EXPENSES" colCount={colCount} color="red" />
            {data.items
              .filter((i) => i.code.startsWith('I_STAFF') || i.code.startsWith('I_DEP') || i.code.startsWith('I_IT') || i.code.startsWith('I_PREM') || i.code.startsWith('I_MKTG') || i.code.startsWith('I_OTH_EXP') || i.code === 'I_OPEX_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="lower" />
              ))}

            {/* PPOP */}
            {data.items
              .filter((i) => i.code === 'I_PPOP')
              .map((item) => (
                <tr key={item.code} className={cn('border-t-2 border-green-200/60 dark:border-green-800/40', getRowTint(item))}>
                  <td className="py-2.5 px-3 text-sm font-bold pl-3">{item.label}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-green-700 dark:text-green-400">
                    {formatMoney(item.current, data.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-green-700 dark:text-green-400">
                    {formatMoney(item.prior, data.currency)}
                  </td>
                  {showVariance && (
                    <td className="py-2.5 px-3 text-right">
                      <VarianceIndicator current={item.current} prior={item.prior} favorable="higher" />
                    </td>
                  )}
                </tr>
              ))}

            <tr><td colSpan={colCount} className="py-1.5" /></tr>
            <SectionBand label="CREDIT IMPAIRMENT CHARGES" colCount={colCount} color="red" />
            {data.items
              .filter((i) => i.code.startsWith('I_ECL') || i.code.startsWith('I_WO') || i.code === 'I_PROV_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="lower" />
              ))}

            {/* PBT */}
            {data.items
              .filter((i) => i.code === 'I_PBT')
              .map((item) => (
                <tr key={item.code} className="bg-blue-50/40 dark:bg-blue-900/10 border-t-2 border-blue-200/60 dark:border-blue-800/40">
                  <td className="py-2.5 px-3 text-sm font-bold pl-3">{item.label}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums">
                    {formatMoney(item.current, data.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums">
                    {formatMoney(item.prior, data.currency)}
                  </td>
                  {showVariance && (
                    <td className="py-2.5 px-3 text-right">
                      <VarianceIndicator current={item.current} prior={item.prior} favorable="higher" />
                    </td>
                  )}
                </tr>
              ))}

            <SectionBand label="INCOME TAX" colCount={colCount} color="red" />
            {data.items
              .filter((i) => i.code.startsWith('I_CIT') || i.code.startsWith('I_EDTL') || i.code === 'I_TAX_TOT')
              .map((item) => (
                <FinancialLineItemRow key={item.code} item={item} showVariance={showVariance} currency={data.currency} favorable="lower" />
              ))}

            {/* PAT grand total */}
            <GrandTotalRow
              label="PROFIT AFTER TAX (NET PROFIT)"
              current={data.netProfit}
              prior={priorNetProfit}
              showVariance={showVariance}
              currency={data.currency}
            />
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Amounts in Nigerian Naira (₦). Figures in parentheses represent negative values (expenses/losses).
          Prepared in accordance with IFRS 9 and CBN prudential guidelines.
        </p>
      </div>
    </div>
  );
}
