import { useState } from 'react';
import { CreditCard, Banknote, Globe, ArrowRight, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import type { LucideIcon } from 'lucide-react';
import type { FraudTransaction } from '../../types/fraud';

interface Props {
  transactions: FraudTransaction[];
  suspiciousIds?: number[];
}

const channelIcons: Record<string, LucideIcon> = {
  POS: CreditCard,
  ATM: Banknote,
  ONLINE: Globe,
  TRANSFER: ArrowRight,
  USSD: Phone,
};

export function TransactionTimelineViz({ transactions, suspiciousIds = [] }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No transactions to display
      </div>
    );
  }

  const amounts = transactions.map((t) => t.amount);
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);

  const getRadius = (amount: number) => {
    if (maxAmount === minAmount) return 20;
    const ratio = (amount - minAmount) / (maxAmount - minAmount);
    return Math.round(12 + ratio * 28);
  };

  const isSuspicious = (t: FraudTransaction) =>
    t.suspicious || suspiciousIds.includes(t.id);

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="relative flex items-center"
        style={{ minWidth: `${Math.max(transactions.length * 100, 400)}px`, height: '140px' }}
      >
        {/* Horizontal timeline line */}
        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-border -translate-y-1/2" />

        {transactions.map((txn, idx) => {
          const radius = getRadius(txn.amount);
          const suspicious = isSuspicious(txn);
          const ChannelIcon = channelIcons[txn.channel] ?? ArrowRight;
          const isHovered = hoveredId === txn.id;
          const xPct = transactions.length === 1 ? 50 : (idx / (transactions.length - 1)) * 82 + 9;

          return (
            <div
              key={txn.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${xPct}%`, transform: 'translateX(-50%)' }}
            >
              {/* Amount above */}
              <div
                className={cn(
                  'text-[10px] font-semibold mb-1 whitespace-nowrap',
                  suspicious ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                )}
              >
                {formatMoney(txn.amount, txn.currency)}
              </div>

              {/* Circle */}
              <div
                className={cn(
                  'relative rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 border-2',
                  suspicious
                    ? 'bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-500'
                    : 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-500'
                )}
                style={{ width: radius * 2, height: radius * 2 }}
                onMouseEnter={() => setHoveredId(txn.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <ChannelIcon
                  className={cn(
                    suspicious ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                  )}
                  style={{ width: Math.max(10, radius * 0.7), height: Math.max(10, radius * 0.7) }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 w-48 rounded-lg border bg-popover text-popover-foreground shadow-lg p-2 text-xs pointer-events-none">
                    <div className="font-semibold mb-1">{txn.channel}</div>
                    <div>{formatMoney(txn.amount, txn.currency)}</div>
                    {txn.merchantName && <div className="text-muted-foreground">{txn.merchantName}</div>}
                    {txn.location && <div className="text-muted-foreground">{txn.location}</div>}
                    <div className="text-muted-foreground mt-1">{formatDateTime(txn.timestamp)}</div>
                    {suspicious && (
                      <div className="mt-1 text-red-600 font-semibold">Suspicious</div>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp below */}
              <div className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">
                {txn.channel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
