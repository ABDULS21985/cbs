import { useState } from 'react';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AmlTransaction } from '../../types/aml';

interface Props {
  transactions: AmlTransaction[];
}

interface TooltipState {
  tx: AmlTransaction;
  x: number;
  y: number;
}

export function TransactionTimeline({ transactions }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (!transactions.length) {
    return (
      <div className="border rounded-lg p-4 text-sm text-muted-foreground text-center">
        No transactions to display
      </div>
    );
  }

  const maxAmount = Math.max(...transactions.map((t) => t.amount));

  const getBubbleSize = (amount: number) => {
    const ratio = amount / maxAmount;
    return Math.max(28, Math.min(60, 28 + ratio * 32));
  };

  return (
    <div className="border rounded-lg p-4 relative">
      <h4 className="text-sm font-semibold mb-4">Transaction Timeline</h4>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-end gap-4 min-w-max px-2">
          {transactions.map((tx, idx) => {
            const size = getBubbleSize(tx.amount);
            const isCredit = tx.type === 'CREDIT';

            return (
              <div
                key={tx.id ?? idx}
                className="flex flex-col items-center gap-1"
              >
                {/* Connector line */}
                {idx > 0 && (
                  <div className="absolute" style={{ display: 'none' }} />
                )}
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 relative',
                    isCredit
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700',
                    tx.flagged && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
                  )}
                  style={{ width: size, height: size }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ tx, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="text-[9px] font-bold text-center leading-none px-1">
                    {isCredit ? '+' : '-'}
                    {formatMoney(tx.amount, tx.currency).replace(/[₦$€£]/, '').replace(/,000,000/, 'M').replace(/,000/, 'K').split('.')[0]}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDateTime(tx.date).split(',')[0]}
                  </p>
                  <p className="text-[10px] whitespace-nowrap max-w-[80px] truncate">
                    {tx.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Baseline line */}
        <div className="mt-2 h-px bg-border mx-2" />
      </div>

      {tooltip && (
        <div className="fixed z-50 bg-popover border rounded-lg shadow-lg p-3 text-xs max-w-xs pointer-events-none"
          style={{ top: tooltip.y - 140, left: tooltip.x - 20 }}>
          <div className="space-y-1">
            <p className="font-semibold">{tooltip.tx.description}</p>
            <p><span className="text-muted-foreground">Amount:</span> {formatMoney(tooltip.tx.amount, tooltip.tx.currency)}</p>
            <p><span className="text-muted-foreground">Type:</span> {tooltip.tx.type}</p>
            <p><span className="text-muted-foreground">Date:</span> {formatDateTime(tooltip.tx.date)}</p>
            {tooltip.tx.counterparty && (
              <p><span className="text-muted-foreground">Counterparty:</span> {tooltip.tx.counterparty}</p>
            )}
            {tooltip.tx.channel && (
              <p><span className="text-muted-foreground">Channel:</span> {tooltip.tx.channel}</p>
            )}
            {tooltip.tx.flagged && (
              <p className="text-red-600 font-medium">⚠ Flagged as suspicious</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
