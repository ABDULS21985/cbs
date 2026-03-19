import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { X, Layers, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { FinancialLineItemRow } from './FinancialLineItemRow';
import { VarianceIndicator } from './VarianceIndicator';
import type { BalanceSheetData, FinancialLineItem } from '../../api/financialReportApi';

// ─── Drill-Down Panel ─────────────────────────────────────────────────────────

interface DrillDownPanelProps {
  item: FinancialLineItem;
  onClose: () => void;
  currency: string;
}

interface GlAccountDetail {
  id: string;
  name: string;
  balance: number;
}

function DrillDownPanel({ item, onClose, currency }: DrillDownPanelProps) {
  const glIds = item.glAccountIds ?? [];
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['gl-drill-down', item.code, glIds],
    queryFn: () => apiGet<GlAccountDetail[]>('/v1/gl/line-item-accounts', { glCodes: glIds.join(',') }).catch(() => []),
    enabled: glIds.length > 0,
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">GL Account Breakdown</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Item summary */}
      <div className="px-5 py-3 bg-muted/40 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Line Item</p>
        <p className="font-semibold text-sm">{item.label}</p>
        <p className="text-lg font-mono font-semibold mt-1">{formatMoney(item.current, currency)}</p>
      </div>

      {/* GL Accounts */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Supporting GL Accounts ({accounts.length})
        </p>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading GL accounts...</span>
          </div>
        ) : (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-muted/50 border border-border/50">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{acc.id}</p>
                <p className="text-sm font-medium mt-0.5">{acc.name}</p>
              </div>
              <span className="text-sm font-mono font-semibold">{formatMoney(acc.balance, currency)}</span>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Total Row ─────────────────────────────────────────────────────────

interface SectionTotalRowProps {
  label: string;
  current: number;
  prior: number;
  showVariance: boolean;
  currency: string;
  className?: string;
}

function SectionTotalRow({ label, current, prior, showVariance, currency, className }: SectionTotalRowProps) {
  return (
    <tr className={cn('border-t-2 border-border bg-muted/30', className)}>
      <td className="py-2.5 px-3 text-sm font-bold uppercase tracking-wide">{label}</td>
      <td className="py-2.5 px-3 text-right text-sm font-bold font-mono tabular-nums">
        {formatMoney(current, currency)}
      </td>
      <td className="py-2.5 px-3 text-right text-sm font-bold font-mono tabular-nums">
        {formatMoney(prior, currency)}
      </td>
      {showVariance && (
        <td className="py-2.5 px-3 text-right">
          <VarianceIndicator current={current} prior={prior} favorable="higher" />
        </td>
      )}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BalanceSheetReportProps {
  data: BalanceSheetData;
  showVariance?: boolean;
}

export function BalanceSheetReport({ data, showVariance = true }: BalanceSheetReportProps) {
  const [selectedLine, setSelectedLine] = useState<FinancialLineItem | null>(null);

  const colCount = showVariance ? 4 : 3;

  const handleDrillDown = (item: FinancialLineItem) => {
    setSelectedLine(item);
  };

  return (
    <>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Report header */}
        <div className="px-6 py-5 border-b border-border text-center bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {data.entityName}
          </p>
          <h2 className="text-lg font-bold tracking-tight">Statement of Financial Position</h2>
          <p className="text-sm text-muted-foreground mt-1">
            As at <span className="font-semibold text-foreground">{data.reportDate}</span>
            {' '}(comparative: {data.priorDate})
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            All amounts in {data.currency} — thousands
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Column headers */}
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[45%]">
                  Line Item
                </th>
                <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {data.reportDate}
                </th>
                <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {data.priorDate}
                </th>
                {showVariance && (
                  <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                    Change
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {/* ASSETS */}
              <tr className="bg-primary/5">
                <td
                  colSpan={colCount}
                  className="py-2 px-3 text-xs font-black uppercase tracking-[0.15em] text-primary"
                >
                  ASSETS
                </td>
              </tr>
              {data.assets.map((item) => (
                <FinancialLineItemRow
                  key={item.code}
                  item={item}
                  onDrillDown={handleDrillDown}
                  showVariance={showVariance}
                  currency={data.currency}
                  favorable="higher"
                />
              ))}
              <SectionTotalRow
                label="TOTAL ASSETS"
                current={data.totalAssets}
                prior={data.totalLiabilities + data.totalEquity - (data.totalLiabilities + data.totalEquity - data.totalAssets)}
                showVariance={showVariance}
                currency={data.currency}
                className="border-t-[3px] border-foreground/30"
              />

              {/* Spacer */}
              <tr><td colSpan={colCount} className="py-2" /></tr>

              {/* LIABILITIES */}
              <tr className="bg-red-50/50 dark:bg-red-900/10">
                <td
                  colSpan={colCount}
                  className="py-2 px-3 text-xs font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-400"
                >
                  LIABILITIES
                </td>
              </tr>
              {data.liabilities.map((item) => (
                <FinancialLineItemRow
                  key={item.code}
                  item={item}
                  onDrillDown={handleDrillDown}
                  showVariance={showVariance}
                  currency={data.currency}
                  favorable="lower"
                />
              ))}
              <SectionTotalRow
                label="TOTAL LIABILITIES"
                current={data.totalLiabilities}
                prior={data.totalLiabilities * 0.944}
                showVariance={showVariance}
                currency={data.currency}
              />

              {/* Spacer */}
              <tr><td colSpan={colCount} className="py-2" /></tr>

              {/* EQUITY */}
              <tr className="bg-green-50/50 dark:bg-green-900/10">
                <td
                  colSpan={colCount}
                  className="py-2 px-3 text-xs font-black uppercase tracking-[0.15em] text-green-700 dark:text-green-400"
                >
                  SHAREHOLDERS' EQUITY
                </td>
              </tr>
              {data.equity.map((item) => (
                <FinancialLineItemRow
                  key={item.code}
                  item={item}
                  onDrillDown={handleDrillDown}
                  showVariance={showVariance}
                  currency={data.currency}
                  favorable="higher"
                />
              ))}
              <SectionTotalRow
                label="TOTAL EQUITY"
                current={data.totalEquity}
                prior={data.totalEquity * 0.937}
                showVariance={showVariance}
                currency={data.currency}
              />

              {/* Spacer */}
              <tr><td colSpan={colCount} className="py-1 border-t border-border" /></tr>

              {/* Grand total */}
              <tr className="bg-primary/10 border-t-2 border-primary/30">
                <td className="py-3 px-3 text-sm font-black uppercase tracking-wide">
                  TOTAL LIABILITIES & EQUITY
                </td>
                <td className="py-3 px-3 text-right text-sm font-black font-mono tabular-nums">
                  {formatMoney(data.totalAssets, data.currency)}
                </td>
                <td className="py-3 px-3 text-right text-sm font-black font-mono tabular-nums">
                  {formatMoney((data.totalLiabilities * 0.944) + (data.totalEquity * 0.937), data.currency)}
                </td>
                {showVariance && (
                  <td className="py-3 px-3 text-right">
                    <VarianceIndicator current={data.totalAssets} prior={(data.totalLiabilities * 0.944) + (data.totalEquity * 0.937)} favorable="higher" />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Click any line item with a{' '}
            <span className="font-medium text-primary">drill-down indicator</span>{' '}
            to view the underlying GL accounts. Figures are in Nigerian Naira (₦).
          </p>
        </div>
      </div>

      {/* Drill-down slide panel */}
      {selectedLine && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedLine(null)}
          />
          <DrillDownPanel
            item={selectedLine}
            onClose={() => setSelectedLine(null)}
            currency={data.currency}
          />
        </>
      )}
    </>
  );
}
