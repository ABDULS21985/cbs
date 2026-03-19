import { useMemo } from 'react';
import { formatMoney, formatPercent } from '@/lib/formatters';

interface FdCalculatorProps {
  principal: number;
  rate: number;
  tenor: number;
}

interface CalcResult {
  grossInterest: number;
  wht: number;
  netInterest: number;
  maturityValue: number;
}

function calculateFd(principal: number, rate: number, tenor: number): CalcResult {
  const grossInterest = principal * (rate / 100) * (tenor / 365);
  const wht = grossInterest * 0.10;
  const netInterest = grossInterest - wht;
  const maturityValue = principal + netInterest;
  return { grossInterest, wht, netInterest, maturityValue };
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  bold?: boolean;
}

function CalcRow({ label, value, highlight, negative, bold }: RowProps) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'border-t mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? 'font-semibold' : ''} ${negative ? 'text-red-600 dark:text-red-400' : ''} ${highlight ? 'text-base font-semibold' : ''}`}>
        {negative ? `−${value}` : value}
      </span>
    </div>
  );
}

export function FdCalculator({ principal, rate, tenor }: FdCalculatorProps) {
  const result = useMemo(() => calculateFd(principal, rate, tenor), [principal, rate, tenor]);
  const hasValues = principal > 0 && rate > 0 && tenor > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Interest Calculation</h4>

      <CalcRow label="Principal" value={formatMoney(principal)} />
      <CalcRow label="Rate p.a." value={hasValues ? formatPercent(rate) : '—'} />
      <CalcRow label="Tenor" value={tenor > 0 ? `${tenor} days` : '—'} />

      <div className="border-t my-2" />

      {hasValues ? (
        <>
          <CalcRow label="Interest (gross)" value={formatMoney(result.grossInterest)} />
          <CalcRow label="WHT (10%)" value={formatMoney(result.wht)} negative />
          <CalcRow label="Interest (net)" value={formatMoney(result.netInterest)} />
          <CalcRow label="Maturity Value" value={formatMoney(result.maturityValue)} highlight bold />
        </>
      ) : (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Enter principal, rate, and tenor to see calculation.
        </div>
      )}
    </div>
  );
}
