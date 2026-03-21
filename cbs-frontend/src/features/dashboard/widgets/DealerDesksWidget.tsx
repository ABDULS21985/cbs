import { useDashboardDealerDesks } from '../hooks/useDashboardData';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared';

const deskTypeLabels: Record<string, string> = {
  FX: 'Foreign Exchange',
  MONEY_MARKET: 'Money Market',
  FIXED_INCOME: 'Fixed Income',
  DERIVATIVES: 'Derivatives',
  COMMODITIES: 'Commodities',
};

export function DealerDesksWidget() {
  const { data: desks = [], isLoading } = useDashboardDealerDesks();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (desks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No dealer desks configured</p>;
  }

  return (
    <div className="space-y-3">
      {desks.map((desk) => (
        <div key={desk.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{desk.deskName}</p>
              <StatusBadge status={desk.status} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              {deskTypeLabels[desk.deskType] ?? desk.deskType}
              {desk.headDealerName ? ` · ${desk.headDealerName}` : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {desk.supportedCurrencies && desk.supportedCurrencies.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {desk.supportedCurrencies.slice(0, 3).join(', ')}
                {desk.supportedCurrencies.length > 3 ? ` +${desk.supportedCurrencies.length - 3}` : ''}
              </p>
            )}
            {desk.pnlCurrency && (
              <p className="text-xs font-mono text-muted-foreground">{desk.pnlCurrency}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
