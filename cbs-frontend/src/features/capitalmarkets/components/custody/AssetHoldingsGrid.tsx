import { formatMoney, formatDate } from '@/lib/formatters';
import type { CustodyHolding } from '../../api/custodyApi';

interface AssetHoldingsGridProps {
  holdings: CustodyHolding[];
}

export function AssetHoldingsGrid({ holdings }: AssetHoldingsGridProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        No asset holdings
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {holdings.map((h) => (
        <div key={h.instrumentCode} className="surface-card p-4 hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold">{h.instrumentCode}</p>
              <p className="text-xs text-muted-foreground">{h.instrumentName}</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {h.isin}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className="text-sm font-bold tabular-nums">{h.quantity.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Market Value</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(h.marketValue, h.currency)}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Last priced: {formatDate(h.lastPriced)}</p>
        </div>
      ))}
    </div>
  );
}
