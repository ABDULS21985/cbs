import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useFxRates, useMoneyMarketRates, useMarketDataFeeds } from '../hooks/useTreasuryData';
import { Activity, Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';

function LiveRatesTab() {
  const { data: fxRates = [], isLoading: fxLoading } = useFxRates();
  const { data: mmRates = [], isLoading: mmLoading } = useMoneyMarketRates();

  return (
    <div className="p-4 space-y-6">
      {/* FX Rates */}
      <div>
        <h3 className="text-sm font-semibold mb-3">FX Rates</h3>
        {fxLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading FX rates...</div>
        ) : fxRates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No FX rates available</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full data-table">
              <thead><tr className="bg-muted/30 border-b"><th className="px-4 py-2.5 text-left">Pair</th><th className="px-4 py-2.5 text-right">Bid</th><th className="px-4 py-2.5 text-right">Ask</th><th className="px-4 py-2.5 text-right">Mid</th><th className="px-4 py-2.5 text-right">Change</th></tr></thead>
              <tbody>
                {fxRates.map((r: any) => (
                  <tr key={r.pair ?? r.id}>
                    <td className="px-4 text-sm font-semibold">{r.pair}</td>
                    <td className="px-4 text-sm font-mono text-right">{Number(r.bid).toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 text-sm font-mono text-right">{Number(r.ask).toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 text-sm font-mono text-right font-medium">{Number(r.mid).toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                    <td className={cn('px-4 text-sm font-mono text-right font-medium', r.changeDirection === 'up' ? 'text-green-600' : r.changeDirection === 'down' ? 'text-red-600' : 'text-muted-foreground')}>
                      {r.changeDirection === 'up' ? '\u25B2' : r.changeDirection === 'down' ? '\u25BC' : '\u2500'} {Math.abs(Number(r.change ?? 0)).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Money Market Rates */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Money Market Rates</h3>
        {mmLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading money market rates...</div>
        ) : mmRates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No money market rates available</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full data-table">
              <thead><tr className="bg-muted/30 border-b"><th className="px-4 py-2.5 text-left">Instrument</th><th className="px-4 py-2.5 text-right">Bid</th><th className="px-4 py-2.5 text-right">Offer</th><th className="px-4 py-2.5 text-right">Mid</th><th className="px-4 py-2.5 text-right">Change</th></tr></thead>
              <tbody>
                {mmRates.map((r) => (
                  <tr key={r.instrument}>
                    <td className="px-4 text-sm font-medium">{r.instrument}</td>
                    <td className="px-4 text-sm font-mono text-right">{r.bid.toFixed(2)}%</td>
                    <td className="px-4 text-sm font-mono text-right">{r.offer.toFixed(2)}%</td>
                    <td className="px-4 text-sm font-mono text-right font-medium">{r.mid.toFixed(2)}%</td>
                    <td className={cn('px-4 text-sm font-mono text-right font-medium', r.changeDirection === 'up' ? 'text-green-600' : r.changeDirection === 'down' ? 'text-red-600' : 'text-muted-foreground')}>
                      {r.changeDirection === 'up' ? '\u25B2' : r.changeDirection === 'down' ? '\u25BC' : '\u2500'} {Math.abs(r.change).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedStatusTab() {
  const { data: feeds = [], isLoading } = useMarketDataFeeds();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading feed status...</div>;
  }

  if (feeds.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No market data feeds configured</div>;
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeds.map((feed) => {
          const StatusIcon = feed.status === 'ONLINE' ? Wifi : feed.status === 'DEGRADED' ? AlertTriangle : WifiOff;
          const statusColor = feed.status === 'ONLINE' ? 'text-green-500' : feed.status === 'DEGRADED' ? 'text-amber-500' : 'text-red-500';
          return (
            <div key={feed.feedCode} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{feed.feedName}</h4>
                <StatusIcon className={cn('w-4 h-4', statusColor)} />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={feed.status} dot />
                <span className="text-xs text-muted-foreground">{feed.provider}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Latency:</span> <span className="font-mono font-medium">{feed.latencyMs}ms</span></div>
                <div><span className="text-muted-foreground">Records/hr:</span> <span className="font-mono font-medium">{feed.recordsPerHour.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Errors:</span> <span className={cn('font-mono font-medium', feed.errorCount > 0 && 'text-red-600')}>{feed.errorCount}</span></div>
                <div><span className="text-muted-foreground">Last update:</span> <span className="font-mono font-medium">{feed.lastUpdateSecondsAgo < 60 ? `${feed.lastUpdateSecondsAgo}s ago` : `${Math.floor(feed.lastUpdateSecondsAgo / 60)}m ago`}</span></div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Quality Score</span>
                  <span className={cn('font-mono font-bold', feed.qualityScore >= 90 ? 'text-green-600' : feed.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600')}>{feed.qualityScore}/100</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className={cn('h-full rounded-full', feed.qualityScore >= 90 ? 'bg-green-500' : feed.qualityScore >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${feed.qualityScore}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MarketDataPage() {
  const { data: feeds = [] } = useMarketDataFeeds();
  const degradedCount = feeds.filter((f) => f.status !== 'ONLINE').length;

  return (
    <>
      <PageHeader title="Market Data" subtitle="Live rates, price history, feed status, data quality" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'rates', label: 'Live Rates', icon: Activity, content: <LiveRatesTab /> },
          { id: 'history', label: 'Price History', content: <div className="p-8 text-center text-muted-foreground">Price history charting coming soon</div> },
          { id: 'feeds', label: 'Feed Status', badge: degradedCount || undefined, content: <FeedStatusTab /> },
          { id: 'quality', label: 'Data Quality', content: <div className="p-8 text-center text-muted-foreground">Data quality scorecard coming soon</div> },
        ]} />
      </div>
    </>
  );
}
