import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';
import type { TradeConfirmation } from '../../api/tradeOpsApi';

interface UnmatchedTradesProps {
  trades: TradeConfirmation[];
  isLoading: boolean;
}

export function UnmatchedTrades({ trades, isLoading }: UnmatchedTradesProps) {
  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse" />;
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No unmatched trades</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-sm font-medium">
          {trades.length} unmatched trade{trades.length !== 1 ? 's' : ''} requiring attention
        </p>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trade Ref</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Instrument</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Counterparty</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Side</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trade Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Aging</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trades.map((t) => {
              const agingDays = Math.ceil(
                (Date.now() - new Date(t.tradeDate).getTime()) / 86400000,
              );
              return (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{t.tradeRef}</td>
                  <td className="px-4 py-3 text-sm font-medium">{t.instrumentCode}</td>
                  <td className="px-4 py-3 text-sm">{t.counterpartyName}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold', t.side === 'BUY' ? 'text-green-600' : 'text-red-600')}>
                      {t.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatDate(t.tradeDate)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        agingDays > 3 ? 'text-red-600' : agingDays > 1 ? 'text-amber-600' : 'text-muted-foreground',
                      )}
                    >
                      {agingDays}d
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
