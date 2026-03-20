import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { InterestCalcResult } from '../api/fixedDepositApi';

interface FdCalculatorProps {
  principal: number;
  rate: number;
  tenor: number;
  serverResult?: InterestCalcResult | null;
  isCalculating?: boolean;
  currency?: string;
}

function clientCalc(principal: number, rate: number, tenor: number) {
  const grossInterest = principal * (rate / 100) * (tenor / 365);
  const wht = grossInterest * 0.10;
  const netInterest = grossInterest - wht;
  const maturityValue = principal + netInterest;
  return { grossInterest, wht, netInterest, maturityValue };
}

function CalcRow({ label, value, highlight, negative, bold, loading }: {
  label: string; value: string; highlight?: boolean; negative?: boolean; bold?: boolean; loading?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'border-t mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <span className={`font-mono text-sm ${bold ? 'font-semibold' : ''} ${negative ? 'text-red-600 dark:text-red-400' : ''} ${highlight ? 'text-base font-semibold' : ''}`}>
          {negative ? `−${value}` : value}
        </span>
      )}
    </div>
  );
}

export function FdCalculator({ principal, rate, tenor, serverResult, isCalculating, currency = 'NGN' }: FdCalculatorProps) {
  const fallback = useMemo(() => clientCalc(principal, rate, tenor), [principal, rate, tenor]);
  const hasValues = principal > 0 && rate > 0 && tenor > 0;

  const result = serverResult ?? (hasValues ? fallback : null);
  const isEstimated = !serverResult && hasValues;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interest Calculation</h4>
        {isEstimated && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">(estimated)</span>}
      </div>

      <CalcRow label="Principal" value={formatMoney(principal, currency)} />
      <CalcRow label="Rate p.a." value={hasValues ? formatPercent(rate) : '—'} />
      <CalcRow label="Tenor" value={tenor > 0 ? `${tenor} days` : '—'} />

      <div className="border-t my-2" />

      {!hasValues && !isCalculating ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Enter principal, rate, and tenor to see calculation.
        </div>
      ) : (
        <>
          <CalcRow label="Interest (gross)" value={result ? formatMoney(result.grossInterest, currency) : '—'} loading={isCalculating} />
          <CalcRow label="WHT (10%)" value={result ? formatMoney(result.wht, currency) : '—'} negative loading={isCalculating} />
          <CalcRow label="Interest (net)" value={result ? formatMoney(result.netInterest, currency) : '—'} loading={isCalculating} />
          <CalcRow label="Maturity Value" value={result ? formatMoney(result.maturityValue, currency) : '—'} highlight bold loading={isCalculating} />
        </>
      )}
    </div>
  );
}
