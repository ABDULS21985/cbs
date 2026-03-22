import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import type { FxRate } from '../../api/internationalPaymentApi';

interface Props {
  rate: FxRate | null;
  sendingAmount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function FxRateDisplay({ rate, sendingAmount, onRefresh, isRefreshing }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!rate?.validUntil) {
      setSecondsLeft(30);
      return;
    }
    const validUntil = new Date(rate.validUntil).getTime();
    if (!Number.isFinite(validUntil)) {
      setSecondsLeft(30);
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((validUntil - now) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [rate]);

  if (!rate) return null;

  const directRate = Number.isFinite(rate.rate) ? rate.rate : 0;
  const inverseRate = Number.isFinite(rate.inverseRate) ? rate.inverseRate : 0;
  const receivingAmount = sendingAmount * inverseRate;
  const hasUsableQuote = directRate > 0 && inverseRate > 0;

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FX Conversion</h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${secondsLeft <= 10 ? 'text-red-600' : 'text-muted-foreground'}`}>
            Rate valid: {secondsLeft}s
          </span>
          <button type="button" onClick={onRefresh} disabled={isRefreshing} className="p-1 hover:bg-muted rounded">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {hasUsableQuote ? (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-mono">1 {rate.sourceCurrency} = {directRate.toFixed(6)} {rate.targetCurrency}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Inverse Rate</span>
              <span className="font-mono">1 {rate.targetCurrency} = {inverseRate.toFixed(6)} {rate.sourceCurrency}</span>
            </div>
          </div>
          {sendingAmount > 0 && (
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Receiving Amount</span>
              <span className="font-mono">{formatMoney(receivingAmount, rate.targetCurrency)}</span>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          FX quote is unavailable for this currency pair right now. Refresh to try again.
        </div>
      )}
      {rate.validUntil && (
        <p className="text-[10px] text-muted-foreground">
          Valid until: {new Date(rate.validUntil).toLocaleTimeString()}
        </p>
      )}
      {rate.source && (
        <p className="text-[10px] text-muted-foreground">Source: {rate.source}</p>
      )}
    </div>
  );
}
