import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';

interface Props {
  returnYtd: number;
  returnTotal?: number;
  unrealizedPnl: number;
  costBasis: number;
  currency?: string;
}

export function ReturnsSummary({ returnYtd, returnTotal = 0, unrealizedPnl, costBasis, currency = 'NGN' }: Props) {
  const items = [
    { label: 'YTD', value: returnYtd, pct: true },
    { label: 'Total Return', value: returnTotal, pct: true },
    { label: 'Unrealized P&L', value: unrealizedPnl, money: true },
    { label: 'Cost Basis', value: costBasis, money: true },
  ];

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Return Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={cn('text-lg font-bold font-mono mt-1', item.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {item.money ? formatMoney(item.value, currency) : `${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
