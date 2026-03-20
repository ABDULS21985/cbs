import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Performer {
  name: string;
  code: string;
  type: string;
  value: number;
  pnl: number;
  pnlPct: number;
  currency?: string;
}

interface Props {
  topPerformers: Performer[];
  bottomPerformers: Performer[];
  currency?: string;
}

function PerformerRow({ item, currency = 'NGN' }: { item: Performer; currency?: string }) {
  const isPositive = item.pnl >= 0;
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{item.code} · {item.type}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono">{formatMoney(item.value, currency)}</p>
        <p className={cn('flex items-center justify-end gap-1 text-xs font-mono font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {formatMoney(item.pnl, currency)} ({isPositive ? '+' : ''}{item.pnlPct.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}

export function TopPerformersTable({ topPerformers, bottomPerformers, currency = 'NGN' }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-green-700 dark:text-green-400 mb-3">Top 5 Performers</h3>
        <div className="divide-y">
          {topPerformers.slice(0, 5).map((p) => <PerformerRow key={p.code} item={p} currency={currency} />)}
          {topPerformers.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>}
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-red-700 dark:text-red-400 mb-3">Bottom 5 Performers</h3>
        <div className="divide-y">
          {bottomPerformers.slice(0, 5).map((p) => <PerformerRow key={p.code} item={p} currency={currency} />)}
          {bottomPerformers.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>}
        </div>
      </div>
    </div>
  );
}
