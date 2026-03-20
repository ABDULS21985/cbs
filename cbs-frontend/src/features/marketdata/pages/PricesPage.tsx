import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatRelative } from '@/lib/formatters';
import {
  Search, TrendingUp, TrendingDown, Minus, Plus, X, Loader2,
  BarChart3, Clock, AlertTriangle, Send,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useInstrumentPrices, useMarketSignals, useRecordPrice, useRecordMarketSignal,
} from '../hooks/useMarketData';
import type { MarketPrice, MarketSignal } from '../types';
import { toast } from 'sonner';

const DEFAULT_WATCHLIST = ['NGN/USD', 'NGN/GBP', 'NGN/EUR', 'NGSE', 'TBILL-91', 'TBILL-182', 'TBILL-364'];
const STORAGE_KEY = 'market-watchlist';

function getWatchlist(): string[] {
  try { const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : DEFAULT_WATCHLIST; } catch { return DEFAULT_WATCHLIST; }
}
function saveWatchlist(list: string[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function TrendIcon({ pct }: { pct: number }) {
  if (pct > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (pct < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-600" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function changeColor(pct: number): string {
  if (pct > 0) return 'text-green-600';
  if (pct < 0) return 'text-red-600';
  return 'text-muted-foreground';
}

function isStale(recordedAt: string): boolean {
  return Date.now() - new Date(recordedAt).getTime() > 5 * 60_000;
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function PriceSparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) return null;
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;
  const w = 160, h = 40;
  const points = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - min) / range) * (h - 4) - 2}`).join(' ');
  const isUp = prices[prices.length - 1] >= prices[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ── Watchlist Item ────────────────────────────────────────────────────────────

function WatchlistItem({ code, isSelected, onClick, onRemove }: { code: string; isSelected: boolean; onClick: () => void; onRemove: () => void }) {
  const { data: price } = useInstrumentPrices(code);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group',
        isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50',
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-mono font-medium truncate">{code}</p>
        {price && <p className="text-[10px] tabular-nums">{price.last?.toFixed(2) ?? '--'}</p>}
      </div>
      <div className="flex items-center gap-1">
        {price && (
          <span className={cn('text-[10px] font-medium tabular-nums', changeColor(price.changePct ?? 0))}>
            {(price.changePct ?? 0) > 0 ? '+' : ''}{(price.changePct ?? 0).toFixed(2)}%
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </button>
  );
}

// ── Record Price Dialog ──────────────────────────────────────────────────────

function RecordPriceDialog({ instrumentCode, onClose }: { instrumentCode: string; onClose: () => void }) {
  const record = useRecordPrice();
  const [form, setForm] = useState({ bid: 0, ask: 0, last: 0, volume: 0, source: 'Manual' });
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="record-price-title">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close dialog"><X className="w-4 h-4" /></button>
        <h2 id="record-price-title" className="text-lg font-semibold mb-4">Record Price</h2>
        <p className="text-xs text-muted-foreground font-mono mb-3">{instrumentCode}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">Bid</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.bid || ''} onChange={(e) => update('bid', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="text-xs text-muted-foreground">Ask</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.ask || ''} onChange={(e) => update('ask', parseFloat(e.target.value) || 0)} /></div>
            <div><label className="text-xs text-muted-foreground">Last</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.last || ''} onChange={(e) => update('last', parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Volume</label><input type="number" className="w-full mt-1 input" value={form.volume || ''} onChange={(e) => update('volume', parseInt(e.target.value) || 0)} /></div>
            <div><label className="text-xs text-muted-foreground">Source</label><select className="w-full mt-1 input" value={form.source} onChange={(e) => update('source', e.target.value)}><option>Reuters</option><option>Bloomberg</option><option>CBN</option><option>Manual</option></select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => record.mutate({ instrumentCode, ...form }, { onSuccess: () => { toast.success('Price recorded'); onClose(); } })} disabled={record.isPending} className="btn-primary">{record.isPending ? 'Recording...' : 'Record'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Instrument Detail Panel ──────────────────────────────────────────────────

function InstrumentDetail({ code }: { code: string }) {
  const { data: price, isLoading } = useInstrumentPrices(code);
  const { data: signals = [] } = useMarketSignals(code);
  const [showRecordPrice, setShowRecordPrice] = useState(false);

  if (isLoading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  if (!price) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">No price data for {code}</div>;

  const spread = price.ask - price.bid;
  const stale = isStale(price.recordedAt);

  const signalColors: Record<string, string> = {
    BUY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    SELL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HOLD: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="space-y-4">
      {/* Price Header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold font-mono">{code}</h3>
            {price.instrumentName && <span className="text-xs text-muted-foreground">{price.instrumentName}</span>}
            {stale && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3" /> Stale</span>}
          </div>
          <button onClick={() => setShowRecordPrice(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"><Send className="w-3 h-3" /> Record Price</button>
        </div>

        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-3xl font-bold tabular-nums">{price.last?.toFixed(2) ?? '--'}</span>
          {price.currency && <span className="text-sm text-muted-foreground">{price.currency}</span>}
          <div className={cn('flex items-center gap-1', changeColor(price.changePct))}>
            <TrendIcon pct={price.changePct} />
            <span className="text-sm font-medium tabular-nums">
              {price.changeAbs != null && (price.changeAbs > 0 ? '+' : '')}{price.changeAbs?.toFixed(2) ?? ''}
            </span>
            <span className="text-sm font-medium tabular-nums">
              ({price.changePct > 0 ? '+' : ''}{price.changePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Bid</p><p className="font-bold tabular-nums">{price.bid?.toFixed(2) ?? '--'}</p></div>
          <div><p className="text-xs text-muted-foreground">Ask</p><p className="font-bold tabular-nums">{price.ask?.toFixed(2) ?? '--'}</p></div>
          <div><p className="text-xs text-muted-foreground">Spread</p><p className="font-bold tabular-nums">{spread.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">Volume</p><p className="font-bold tabular-nums">{(price.volume ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Source</p><p className="text-xs">{price.source ?? '--'} · {formatRelative(price.recordedAt)}</p></div>
        </div>
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Latest Signals</p>
          <div className="space-y-2">
            {signals.slice(0, 5).map((sig) => (
              <div key={sig.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-bold', signalColors[sig.signal])}>{sig.signal}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${sig.confidence}%` }} />
                    </div>
                    <span className="text-xs tabular-nums">{sig.confidence}%</span>
                  </div>
                  {sig.summary && <p className="text-xs text-muted-foreground mt-1 truncate">{sig.summary}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  <p>{sig.analyst || sig.source}</p>
                  <p>{formatRelative(sig.generatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRecordPrice && <RecordPriceDialog instrumentCode={code} onClose={() => setShowRecordPrice(false)} />}
    </div>
  );
}

// ── Market Overview Table ────────────────────────────────────────────────────

function MarketOverviewTable({ watchlist, onSelectInstrument }: { watchlist: string[]; onSelectInstrument: (code: string) => void }) {
  // Fetch prices for all watchlist instruments
  const priceQueries = watchlist.map((code) => {
    const { data } = useInstrumentPrices(code);
    return data;
  });

  const allPrices = priceQueries.filter(Boolean) as MarketPrice[];

  const columns: ColumnDef<MarketPrice, any>[] = useMemo(() => [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.instrumentCode}</span> },
    { accessorKey: 'bid', header: 'Bid', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.bid?.toFixed(2) ?? '--'}</span> },
    { accessorKey: 'ask', header: 'Ask', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.ask?.toFixed(2) ?? '--'}</span> },
    { accessorKey: 'last', header: 'Last', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{row.original.last?.toFixed(2) ?? '--'}</span> },
    {
      accessorKey: 'changePct', header: 'Change %',
      cell: ({ row }) => (
        <span className={cn('flex items-center gap-1 text-sm tabular-nums font-medium', changeColor(row.original.changePct))}>
          <TrendIcon pct={row.original.changePct} />
          {row.original.changePct > 0 ? '+' : ''}{row.original.changePct.toFixed(2)}%
        </span>
      ),
    },
    { accessorKey: 'volume', header: 'Volume', cell: ({ row }) => <span className="text-sm tabular-nums">{(row.original.volume ?? 0).toLocaleString()}</span> },
    { accessorKey: 'source', header: 'Source', cell: ({ row }) => <span className="text-xs">{row.original.source ?? '--'}</span> },
    {
      accessorKey: 'recordedAt', header: 'Updated',
      cell: ({ row }) => {
        const stale = isStale(row.original.recordedAt);
        return (
          <span className={cn('text-xs', stale && 'text-amber-600')}>
            {formatRelative(row.original.recordedAt)}
            {stale && <AlertTriangle className="w-3 h-3 inline ml-1" />}
          </span>
        );
      },
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={allPrices}
      enableGlobalFilter
      enableExport
      exportFilename="market-prices"
      onRowClick={(row) => onSelectInstrument(row.instrumentCode)}
      emptyMessage="No market data loaded. Add instruments to your watchlist."
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PricesPage() {
  useEffect(() => { document.title = 'Prices & Signals | CBS'; }, []);

  const [watchlist, setWatchlist] = useState<string[]>(getWatchlist);
  const [selectedCode, setSelectedCode] = useState(watchlist[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [addInput, setAddInput] = useState('');

  const updateWatchlist = useCallback((newList: string[]) => {
    setWatchlist(newList);
    saveWatchlist(newList);
  }, []);

  const addToWatchlist = (code: string) => {
    const upper = code.toUpperCase().trim();
    if (!upper || watchlist.includes(upper)) return;
    updateWatchlist([...watchlist, upper]);
    setAddInput('');
  };

  const removeFromWatchlist = (code: string) => {
    updateWatchlist(watchlist.filter((c) => c !== code));
    if (selectedCode === code && watchlist.length > 1) {
      setSelectedCode(watchlist.find((c) => c !== code) || '');
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Market Prices & Signals
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
              Live
            </span>
          </span>
        }
        subtitle="Real-time instrument prices, market signals, and analytics"
      />
      <div className="page-container space-y-4">
        {/* Main 2-column layout */}
        <div className="flex gap-4">
          {/* Watchlist (Left) */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <div className="rounded-xl border bg-card p-3 space-y-2 sticky top-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Watchlist</p>

              {/* Add instrument */}
              <div className="flex gap-1">
                <input
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToWatchlist(addInput)}
                  placeholder="Add code..."
                  className="flex-1 h-7 px-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={() => addToWatchlist(addInput)} disabled={!addInput.trim()} className="h-7 w-7 flex items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-30">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-0.5 max-h-[60vh] overflow-auto">
                {watchlist.map((code) => (
                  <WatchlistItem
                    key={code}
                    code={code}
                    isSelected={selectedCode === code}
                    onClick={() => setSelectedCode(code)}
                    onRemove={() => removeFromWatchlist(code)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Detail + Table (Center/Right) */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Mobile: instrument selector */}
            <div className="lg:hidden">
              <select value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)} className="w-full input">
                {watchlist.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>

            {/* Instrument Detail */}
            {selectedCode ? (
              <InstrumentDetail code={selectedCode} />
            ) : (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select an instrument from the watchlist</p>
              </div>
            )}

            {/* Market Overview Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">Market Overview</p>
              </div>
              <div className="p-4">
                <MarketOverviewTable watchlist={watchlist} onSelectInstrument={setSelectedCode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
