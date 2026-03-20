import { RefreshCw, Loader2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  totalValue: number;
  costBasis: number;
  unrealizedPnl: number;
  lastValuationDate?: string;
  currency?: string;
  onValuate: () => void;
  isValuating: boolean;
  valuationResult?: { totalValue: number; returnYtd: number; valuatedAt: string } | null;
}

export function ValuationPanel({ totalValue, costBasis, unrealizedPnl, lastValuationDate, currency = 'NGN', onValuate, isValuating, valuationResult }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Portfolio Valuation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last valued: {lastValuationDate ? formatDate(lastValuationDate) : 'Never'}</p>
          </div>
          <button onClick={onValuate} disabled={isValuating} className="flex items-center gap-2 btn-primary">
            {isValuating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isValuating ? 'Valuating...' : 'Run Valuation'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold font-mono mt-1">{formatMoney(totalValue, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost Basis</p>
            <p className="text-xl font-bold font-mono mt-1">{formatMoney(costBasis, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
            <p className={cn('text-xl font-bold font-mono mt-1', unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(unrealizedPnl, currency)}</p>
          </div>
        </div>
      </div>
      {valuationResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 p-5">
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Valuation Complete</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">New Total Value</p>
              <p className="font-mono font-bold">{formatMoney(valuationResult.totalValue, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Return YTD</p>
              <p className="font-mono font-bold">{valuationResult.returnYtd.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuated At</p>
              <p className="font-mono">{formatDate(valuationResult.valuatedAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
