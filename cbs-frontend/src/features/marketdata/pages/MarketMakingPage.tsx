import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Activity, TrendingUp, CheckCircle, AlertTriangle, Plus, X, Loader2 } from 'lucide-react';
import { useMarketMakingMandates, useRecordMarketMakingActivity, useSuspendMarketMakingMandate } from '../hooks/useMarketData';
import type { MarketMakingMandate, MarketMakingActivity } from '../types/marketMaking';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'border-l-green-500', SUSPENDED: 'border-l-amber-500', EXPIRED: 'border-l-red-500', DRAFT: 'border-l-gray-400',
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700', SUSPENDED: 'bg-amber-100 text-amber-700', EXPIRED: 'bg-red-100 text-red-700', DRAFT: 'bg-gray-100 text-gray-600',
};

export function MarketMakingPage() {
  useEffect(() => { document.title = 'Market Making | CBS'; }, []);
  const [activityTarget, setActivityTarget] = useState<MarketMakingMandate | null>(null);
  const [activityForm, setActivityForm] = useState<Partial<MarketMakingActivity>>({});

  const { data: mandates = [], isLoading, isError, refetch } = useMarketMakingMandates();
  const recordActivity = useRecordMarketMakingActivity();
  const suspendMandate = useSuspendMarketMakingMandate();

  const activeMandates = mandates.filter((m) => m.status === 'ACTIVE');

  const handleRecord = () => {
    if (!activityTarget) return;
    recordActivity.mutate(
      { code: activityTarget.mandateCode, data: { ...activityForm, fillRatioPct: activityForm.quotesPublished ? ((activityForm.quotesHit ?? 0) / activityForm.quotesPublished) * 100 : 0, netPosition: (activityForm.buyVolume ?? 0) - (activityForm.sellVolume ?? 0) } },
      {
        onSuccess: () => { toast.success('Activity recorded'); setActivityTarget(null); setActivityForm({}); },
        onError: () => toast.error('Failed to record activity'),
      },
    );
  };

  const handleSuspend = (code: string) => {
    if (!confirm(`Suspend mandate ${code}?`)) return;
    suspendMandate.mutate(code, {
      onSuccess: () => toast.success(`Mandate ${code} suspended`),
      onError: () => toast.error('Failed to suspend'),
    });
  };

  return (
    <>
      <PageHeader title="Market Making" subtitle="Mandate management and activity monitoring"
        actions={<button onClick={() => { if (mandates[0]) setActivityTarget(mandates[0]); }} disabled={activeMandates.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Record Activity
        </button>} />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Mandates" value={activeMandates.length} format="number" icon={Activity} />
          <StatCard label="Avg Fill Rate" value="—" icon={TrendingUp} />
          <StatCard label="Total P&L MTD" value="—" icon={TrendingUp} />
          <StatCard label="Compliance Rate" value="—" icon={CheckCircle} />
        </div>

        {/* Error/Loading */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm text-red-700">Failed to load mandates.</p></div>
            <button onClick={() => refetch()} className="text-xs text-primary hover:underline">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2].map((i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : mandates.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No market making mandates</p>
            <p className="text-sm text-muted-foreground mt-1">Mandates are created via the trading desk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mandates.map((m) => (
              <div key={m.id} className={cn('rounded-xl border bg-card p-5 space-y-3 border-l-4', STATUS_COLORS[m.status] ?? 'border-l-gray-400')}>
                <div className="flex items-start justify-between">
                  <div>
                    <code className="text-[10px] font-mono text-muted-foreground">{m.mandateCode}</code>
                    <p className="text-sm font-semibold">{m.mandateName}</p>
                    <p className="text-xs text-muted-foreground">Instrument: {m.instrumentCode} · Exchange: {m.exchange}</p>
                    <p className="text-xs text-muted-foreground">Type: {m.mandateType}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_BADGE[m.status] ?? 'bg-muted')}>{m.status}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Obligation:</span> <span className="font-medium">{m.quoteObligation}</span></div>
                  <div><span className="text-muted-foreground">Min Size:</span> <span className="font-mono">{m.minQuoteSize}</span></div>
                  <div><span className="text-muted-foreground">Max Spread:</span> <span className="font-mono">{m.maxSpreadBps} bps</span></div>
                  <div><span className="text-muted-foreground">Hours:</span> <span className="font-mono">{m.dailyQuoteHours}h/day</span></div>
                  <div><span className="text-muted-foreground">Inventory:</span> <span className="font-mono">{formatMoney(m.inventoryLimit)}</span></div>
                  <div><span className="text-muted-foreground">Hedging:</span> <span className="font-medium">{m.hedgingStrategy}</span></div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {formatDate(m.effectiveFrom)} → {formatDate(m.effectiveTo)}
                  {m.regulatoryRef && <> · Reg: <span className="font-mono">{m.regulatoryRef}</span></>}
                </div>

                <div className="flex gap-2 pt-1 border-t">
                  <button onClick={() => { setActivityTarget(m); setActivityForm({ activityDate: new Date().toISOString().split('T')[0] }); }}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">Record Activity</button>
                  {m.status === 'ACTIVE' && (
                    <button onClick={() => handleSuspend(m.mandateCode)} disabled={suspendMandate.isPending}
                      className="px-2 py-1.5 rounded-lg border text-xs font-medium text-amber-700 hover:bg-amber-50">Suspend</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity history note */}
        <div className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Activity history available in the reports module.
        </div>
      </div>

      {/* Activity Recording Dialog */}
      {activityTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setActivityTarget(null)} />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="font-semibold">Record Daily Activity — {activityTarget.mandateCode}</h3>
                <button onClick={() => setActivityTarget(null)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['activityDate', 'Date', 'date'],
                    ['quotesPublished', 'Quotes Published', 'number'],
                    ['quotesHit', 'Quotes Hit', 'number'],
                    ['avgBidAskSpreadBps', 'Avg Spread (bps)', 'number'],
                    ['totalVolume', 'Total Volume', 'number'],
                    ['buyVolume', 'Buy Volume', 'number'],
                    ['sellVolume', 'Sell Volume', 'number'],
                    ['realizedPnl', 'Realized P&L', 'number'],
                    ['unrealizedPnl', 'Unrealized P&L', 'number'],
                    ['inventoryTurnover', 'Inventory Turnover', 'number'],
                    ['quotingUptimePct', 'Uptime %', 'number'],
                    ['spreadViolationCount', 'Spread Violations', 'number'],
                  ] as const).map(([key, label, type]) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input type={type} value={(activityForm as any)[key] ?? ''} onChange={(e) => setActivityForm((f) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                    </div>
                  ))}
                </div>
                {activityForm.quotesPublished && activityForm.quotesPublished > 0 && (
                  <div className="text-xs text-muted-foreground">Fill Ratio: <span className="font-semibold">{(((activityForm.quotesHit ?? 0) / activityForm.quotesPublished) * 100).toFixed(1)}%</span></div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={activityForm.obligationMet ?? false} onChange={(e) => setActivityForm((f) => ({ ...f, obligationMet: e.target.checked }))} className="rounded" />
                  Obligation Met
                </label>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => setActivityTarget(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleRecord} disabled={recordActivity.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {recordActivity.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Record
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
