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
    if (!rate) return;
    const validUntil = new Date(rate.validUntil).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((validUntil - now) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [rate]);

  if (!rate) return null;

  const receivingAmount = sendingAmount * rate.inverseRate;

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-3">
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Exchange Rate</span>
        <span className="font-mono">1 {rate.toCurrency} = {formatMoney(rate.rate, rate.fromCurrency)}</span>
      </div>
      {sendingAmount > 0 && (
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Receiving Amount</span>
          <span className="font-mono">{formatMoney(receivingAmount, rate.toCurrency)}</span>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">Source: {rate.source}</p>
    </div>
  );
}
