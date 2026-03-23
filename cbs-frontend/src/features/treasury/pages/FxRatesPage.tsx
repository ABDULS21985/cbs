import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { treasuryApi } from '../api/treasuryApi';
import type { FxRate } from '../types/treasury';
import { cn } from '@/lib/utils';

function RateCard({ rate }: { rate: FxRate }) {
  const DirectionIcon =
    rate.changeDirection === 'up' ? TrendingUp : rate.changeDirection === 'down' ? TrendingDown : Minus;
  const directionColor =
    rate.changeDirection === 'up'
      ? 'text-green-600 dark:text-green-400'
      : rate.changeDirection === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold">{rate.pair}</span>
        <div className={cn('flex items-center gap-1 text-xs font-medium', directionColor)}>
          <DirectionIcon className="w-3.5 h-3.5" />
          {rate.change > 0 ? '+' : ''}
          {rate.change.toFixed(4)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Bid</p>
          <p className="text-sm font-mono font-semibold">{rate.bid.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mid</p>
          <p className="text-sm font-mono font-semibold">{rate.mid.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ask</p>
          <p className="text-sm font-mono font-semibold">{rate.ask.toFixed(4)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Spread: {((rate.ask - rate.bid) * 10_000).toFixed(1)} bps</span>
        <span>{new Date(rate.lastUpdated).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export function FxRatesPage() {
  useEffect(() => { document.title = 'FX Rates | CBS'; }, []);
  const { data: rates = [], isLoading, refetch } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: () => treasuryApi.getFxRates(),
    refetchInterval: 30_000,
  });

  // Keyboard shortcut: Ctrl+R → refresh rates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        refetch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [refetch]);

  const majors = rates.filter((r) => ['USD/NGN', 'EUR/NGN', 'GBP/NGN', 'EUR/USD'].includes(r.pair));
  const avgSpread =
    rates.length > 0
      ? rates.reduce((sum, r) => sum + (r.ask - r.bid), 0) / rates.length
      : 0;

  return (
    <>
      <PageHeader title="FX Rates" subtitle="Live foreign exchange rates and spread monitoring" />
      <div className="page-container space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Currency Pairs" value={rates.length} format="number" icon={ArrowUpDown} loading={isLoading} />
          <StatCard
            label="Avg Spread (bps)"
            value={(avgSpread * 10_000).toFixed(1)}
            icon={ArrowUpDown}
            loading={isLoading}
          />
          <StatCard
            label="Pairs Moving Up"
            value={rates.filter((r) => r.changeDirection === 'up').length}
            format="number"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Pairs Moving Down"
            value={rates.filter((r) => r.changeDirection === 'down').length}
            format="number"
            icon={TrendingDown}
            loading={isLoading}
          />
        </div>

        {/* Refresh button */}
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium surface-card hover:bg-muted/40 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface-card p-4 space-y-3 animate-pulse">
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-8 w-full bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Rate grid */}
        {!isLoading && rates.length > 0 && (
          <>
            {majors.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Major Pairs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {majors.map((rate) => (
                    <RateCard key={rate.pair} rate={rate} />
                  ))}
                </div>
              </>
            )}
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Pairs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rates.map((rate) => (
                <RateCard key={rate.pair} rate={rate} />
              ))}
            </div>
          </>
        )}

        {!isLoading && rates.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No FX rates available</p>
            <p className="text-sm mt-1">Market data feeds may be offline.</p>
          </div>
        )}
      </div>
    </>
  );
}
