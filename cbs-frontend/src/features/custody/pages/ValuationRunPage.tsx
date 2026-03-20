import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, AlertTriangle, CheckCircle, X, Plus, Calculator,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, DataTable, TabsPage, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useValuationRunSummary,
  useValuationRunExceptions,
  useRecordInstrumentValuation,
  useCompleteValuationRun,
} from '../hooks/useCustodyExt';
import type { InstrumentValuation } from '../types/valuation';
import { FairValueBreakdown } from '../components/FairValueBreakdown';
import { SensitivityDisplay } from '../components/SensitivityDisplay';

// ─── Record Valuation Dialog ────────────────────────────────────────────────

function RecordValuationDialog({ runRef, onClose }: { runRef: string; onClose: () => void }) {
  const recordValuation = useRecordInstrumentValuation();
  const [form, setForm] = useState({
    instrumentCode: '', isin: '', modelPrice: 0, marketPrice: 0,
    fairValueLevel: 'LEVEL_1', sensitivityDelta: 0, sensitivityGamma: 0, sensitivityVega: 0,
    duration: 0, modifiedDuration: 0, convexity: 0, yieldToMaturity: 0,
    spreadToBenchmark: 0, dayCountConvention: 'ACT/365', accrualDays: 0, accruedAmount: 0,
    cleanPrice: 0, dirtyPrice: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordValuation.mutate({ ref: runRef, data: form as Partial<InstrumentValuation> }, {
      onSuccess: () => { toast.success('Instrument valuation recorded'); onClose(); },
      onError: () => toast.error('Failed to record valuation'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Record Instrument Valuation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Instrument Code *</label><input className="w-full mt-1 input font-mono" value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">ISIN</label><input className="w-full mt-1 input font-mono" value={form.isin} onChange={(e) => setForm((f) => ({ ...f, isin: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Model Price *</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.modelPrice || ''} onChange={(e) => setForm((f) => ({ ...f, modelPrice: parseFloat(e.target.value) || 0 }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Market Price *</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.marketPrice || ''} onChange={(e) => setForm((f) => ({ ...f, marketPrice: parseFloat(e.target.value) || 0 }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">FV Level</label><select className="w-full mt-1 input" value={form.fairValueLevel} onChange={(e) => setForm((f) => ({ ...f, fairValueLevel: e.target.value }))}>
              <option value="LEVEL_1">Level 1</option><option value="LEVEL_2">Level 2</option><option value="LEVEL_3">Level 3</option>
            </select></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sensitivities</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">Delta</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.sensitivityDelta || ''} onChange={(e) => setForm((f) => ({ ...f, sensitivityDelta: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Gamma</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.sensitivityGamma || ''} onChange={(e) => setForm((f) => ({ ...f, sensitivityGamma: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Vega</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.sensitivityVega || ''} onChange={(e) => setForm((f) => ({ ...f, sensitivityVega: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-xs text-muted-foreground">Duration</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.duration || ''} onChange={(e) => setForm((f) => ({ ...f, duration: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Mod. Duration</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.modifiedDuration || ''} onChange={(e) => setForm((f) => ({ ...f, modifiedDuration: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">YTM (%)</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.yieldToMaturity || ''} onChange={(e) => setForm((f) => ({ ...f, yieldToMaturity: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Spread</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.spreadToBenchmark || ''} onChange={(e) => setForm((f) => ({ ...f, spreadToBenchmark: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">Clean Price</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.cleanPrice || ''} onChange={(e) => setForm((f) => ({ ...f, cleanPrice: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Dirty Price</label><input type="number" step="0.0001" className="w-full mt-1 input" value={form.dirtyPrice || ''} onChange={(e) => setForm((f) => ({ ...f, dirtyPrice: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Accrued Amt</label><input type="number" step="0.01" className="w-full mt-1 input" value={form.accruedAmount || ''} onChange={(e) => setForm((f) => ({ ...f, accruedAmount: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.instrumentCode || recordValuation.isPending} className="btn-primary flex items-center gap-2">
              {recordValuation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {recordValuation.isPending ? 'Recording...' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ValuationRunPage() {
  const { ref = '' } = useParams<{ ref: string }>();
  useEffect(() => { document.title = `Valuation Run ${ref} | CBS`; }, [ref]);

  const [showRecordForm, setShowRecordForm] = useState(false);
  const { data: run, isLoading: runLoading } = useValuationRunSummary(ref);
  const { data: exceptions = [], isLoading: exceptionsLoading } = useValuationRunExceptions(ref);
  const completeRun = useCompleteValuationRun();

  // Aggregate sensitivities
  const avgSensitivities = useMemo(() => {
    if (exceptions.length === 0) return null;
    const count = exceptions.length;
    return {
      delta: exceptions.reduce((s, e) => s + (e.sensitivityDelta ?? 0), 0) / count,
      gamma: exceptions.reduce((s, e) => s + (e.sensitivityGamma ?? 0), 0) / count,
      vega: exceptions.reduce((s, e) => s + (e.sensitivityVega ?? 0), 0) / count,
      duration: exceptions.reduce((s, e) => s + (e.duration ?? 0), 0) / count,
      modifiedDuration: exceptions.reduce((s, e) => s + (e.modifiedDuration ?? 0), 0) / count,
      convexity: exceptions.reduce((s, e) => s + (e.convexity ?? 0), 0) / count,
      yieldToMaturity: exceptions.reduce((s, e) => s + (e.yieldToMaturity ?? 0), 0) / count,
      spreadToBenchmark: exceptions.reduce((s, e) => s + (e.spreadToBenchmark ?? 0), 0) / count,
    };
  }, [exceptions]);

  const instrumentCols: ColumnDef<InstrumentValuation, unknown>[] = [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.instrumentCode}</span> },
    { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin}</span> },
    { accessorKey: 'modelPrice', header: 'Model Price', cell: ({ row }) => <span className="font-mono text-xs">{row.original.modelPrice.toFixed(4)}</span> },
    { accessorKey: 'marketPrice', header: 'Market Price', cell: ({ row }) => <span className="font-mono text-xs">{row.original.marketPrice.toFixed(4)}</span> },
    {
      accessorKey: 'priceDeviation', header: 'Deviation',
      cell: ({ row }) => {
        const breached = row.original.deviationBreached;
        return <span className={cn('font-mono text-xs font-bold', breached ? 'text-red-600' : 'text-green-600')}>{row.original.priceDeviation.toFixed(2)}%</span>;
      },
    },
    {
      accessorKey: 'fairValueLevel', header: 'FV Level',
      cell: ({ row }) => {
        const level = row.original.fairValueLevel;
        const color = level === 'LEVEL_1' ? 'bg-blue-100 text-blue-700' : level === 'LEVEL_2' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
        return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', color)}>{level?.replace('_', ' ')}</span>;
      },
    },
    { accessorKey: 'duration', header: 'Duration', cell: ({ row }) => <span className="font-mono text-xs">{row.original.duration?.toFixed(2) ?? '—'}</span> },
    { accessorKey: 'modifiedDuration', header: 'Mod. Dur.', cell: ({ row }) => <span className="font-mono text-xs">{row.original.modifiedDuration?.toFixed(2) ?? '—'}</span> },
    { accessorKey: 'yieldToMaturity', header: 'YTM', cell: ({ row }) => <span className="font-mono text-xs">{row.original.yieldToMaturity ? `${row.original.yieldToMaturity.toFixed(2)}%` : '—'}</span> },
    { accessorKey: 'spreadToBenchmark', header: 'Spread', cell: ({ row }) => <span className="font-mono text-xs">{row.original.spreadToBenchmark ? `${row.original.spreadToBenchmark.toFixed(2)}%` : '—'}</span> },
    { accessorKey: 'cleanPrice', header: 'Clean', cell: ({ row }) => <span className="font-mono text-xs">{row.original.cleanPrice?.toFixed(4) ?? '—'}</span> },
    { accessorKey: 'dirtyPrice', header: 'Dirty', cell: ({ row }) => <span className="font-mono text-xs">{row.original.dirtyPrice?.toFixed(4) ?? '—'}</span> },
    { accessorKey: 'accruedAmount', header: 'Accrued', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accruedAmount ? formatMoney(row.original.accruedAmount) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  const handleCompleteRun = () => {
    if (!confirm('Complete this valuation run? This action cannot be undone.')) return;
    completeRun.mutate(ref, {
      onSuccess: () => toast.success('Valuation run completed'),
      onError: () => toast.error('Failed to complete run'),
    });
  };

  if (runLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/custody/valuations" />
        <div className="page-container flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <PageHeader title="Run Not Found" backTo="/custody/valuations" />
        <div className="page-container"><EmptyState title="Valuation run not found" description={`No run found with ref "${ref}".`} /></div>
      </>
    );
  }

  const breachedInstruments = exceptions.filter((e) => e.deviationBreached);
  const isRunning = run.status === 'RUNNING';

  const tabs = [
    {
      id: 'instruments',
      label: 'Instruments',
      badge: exceptions.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          {isRunning && (
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRecordForm(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
                <Plus className="w-3.5 h-3.5" /> Record Valuation
              </button>
            </div>
          )}
          <DataTable columns={instrumentCols} data={exceptions} isLoading={exceptionsLoading} enableGlobalFilter enableExport exportFilename={`valuation-run-${ref}`} emptyMessage="No instrument valuations recorded" />
        </div>
      ),
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      badge: breachedInstruments.length > 0 ? breachedInstruments.length : undefined,
      content: (
        <div className="p-4">
          {breachedInstruments.length > 0 ? (
            <DataTable columns={instrumentCols} data={breachedInstruments} enableGlobalFilter emptyMessage="No exceptions" />
          ) : (
            <EmptyState title="No pricing exceptions" description="All instruments are within IPV threshold" />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {showRecordForm && <RecordValuationDialog runRef={ref} onClose={() => setShowRecordForm(false)} />}

      <PageHeader
        title={run.runRef}
        subtitle={<span className="flex items-center gap-2"><StatusBadge status={run.status} dot /><span className="text-xs text-muted-foreground">{run.runType}</span></span>}
        backTo="/custody/valuations"
        actions={
          isRunning ? (
            <button onClick={handleCompleteRun} disabled={completeRun.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {completeRun.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Complete Run
            </button>
          ) : undefined
        }
      />

      <div className="page-container space-y-6">
        {/* Summary */}
        <div className="rounded-xl border bg-card p-6">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Run Ref', value: run.runRef },
              { label: 'Valuation Date', value: formatDate(run.valuationDate) },
              { label: 'Run Type', value: run.runType },
              { label: 'Model ID', value: `#${run.modelId}` },
              { label: 'Instruments Valued', value: String(run.instrumentsValued) },
              { label: 'Total Market Value', value: formatMoney(run.totalMarketValue, run.currency) },
              { label: 'Unrealized G/L', value: formatMoney(run.unrealizedGainLoss, run.currency) },
              { label: 'IPV Breaches', value: String(run.ipvBreachCount) },
              { label: 'Started At', value: formatDateTime(run.runStartedAt) },
              { label: 'Completed At', value: run.runCompletedAt ? formatDateTime(run.runCompletedAt) : '—' },
              { label: 'Status', value: run.status },
              { label: 'Currency', value: run.currency },
            ]}
          />
        </div>

        {/* Fair Value Breakdown */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Fair Value Hierarchy Breakdown</h3>
          <FairValueBreakdown
            level1Total={run.fairValueLevel1Total}
            level2Total={run.fairValueLevel2Total}
            level3Total={run.fairValueLevel3Total}
            currency={run.currency}
          />
        </div>

        {/* Sensitivities */}
        {avgSensitivities && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Average Sensitivities (across {exceptions.length} instruments)</h3>
            <SensitivityDisplay {...avgSensitivities} />
          </div>
        )}

        {/* IPV Warning */}
        {breachedInstruments.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              {breachedInstruments.length} instrument(s) breached IPV threshold — review required
            </p>
          </div>
        )}

        {/* Tabs: Instruments + Exceptions */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
