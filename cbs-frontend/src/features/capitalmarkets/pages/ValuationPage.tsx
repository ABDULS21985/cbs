import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Calculator, BarChart3, AlertTriangle, Play, Plus, X, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  useValuationModels,
  useValuationRuns,
  useValuationExceptions,
  useDefineValuationModel,
  useRunValuation,
  useCompleteValuationRun,
} from '../hooks/useCapitalMarketsExt';
import type { ValuationModel, ValuationRun, InstrumentValuation } from '../api/valuationApi';
import { toast } from 'sonner';

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  2: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

// ── Models Tab ──────────────────────────────────────────────────────────────

function ModelsTab() {
  const { data: models = [], isLoading } = useValuationModels();
  const define = useDefineValuationModel();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ modelName: '', instrumentType: 'BOND', methodology: 'DCF', fairValueLevel: 2, description: '' });

  const columns = useMemo<ColumnDef<ValuationModel, unknown>[]>(() => [
    { accessorKey: 'modelCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.modelCode}</span> },
    { accessorKey: 'modelName', header: 'Name' },
    { accessorKey: 'instrumentType', header: 'Instrument Type' },
    { accessorKey: 'methodology', header: 'Methodology' },
    { accessorKey: 'fairValueLevel', header: 'FV Level', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', LEVEL_COLORS[row.original.fairValueLevel] ?? 'bg-gray-100 text-gray-600')}>Level {row.original.fairValueLevel}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Define Model</button>
      </div>
      <DataTable columns={columns} data={models as ValuationModel[]} isLoading={isLoading} pageSize={15} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Define Valuation Model</h2>
            <form onSubmit={(e) => { e.preventDefault(); define.mutate({ modelName: form.modelName, instrumentType: form.instrumentType, methodology: form.methodology, fairValueLevel: form.fairValueLevel, description: form.description } as Partial<ValuationModel>, { onSuccess: () => { toast.success('Model defined'); setShowForm(false); } }); }} className="space-y-4">
              <div><label className="text-sm font-medium text-muted-foreground">Model Name</label><input className="w-full mt-1 input" value={form.modelName} onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-muted-foreground">Instrument Type</label><select className="w-full mt-1 input" value={form.instrumentType} onChange={(e) => setForm((f) => ({ ...f, instrumentType: e.target.value }))}><option value="BOND">Bond</option><option value="EQUITY">Equity</option><option value="DERIVATIVE">Derivative</option><option value="FX">FX</option><option value="STRUCTURED_PRODUCT">Structured Product</option></select></div>
                <div><label className="text-sm font-medium text-muted-foreground">Methodology</label><select className="w-full mt-1 input" value={form.methodology} onChange={(e) => setForm((f) => ({ ...f, methodology: e.target.value }))}><option value="DCF">DCF</option><option value="COMPARABLE">Comparable</option><option value="BLACK_SCHOLES">Black-Scholes</option><option value="MONTE_CARLO">Monte Carlo</option></select></div>
              </div>
              <div><label className="text-sm font-medium text-muted-foreground">Fair Value Level</label><select className="w-full mt-1 input" value={form.fairValueLevel} onChange={(e) => setForm((f) => ({ ...f, fairValueLevel: parseInt(e.target.value) }))}><option value={1}>Level 1 - Quoted prices</option><option value={2}>Level 2 - Observable inputs</option><option value={3}>Level 3 - Unobservable inputs</option></select></div>
              <div><label className="text-sm font-medium text-muted-foreground">Description</label><textarea className="w-full mt-1 input min-h-[60px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={define.isPending} className="btn-primary">{define.isPending ? 'Defining...' : 'Define'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Runs Tab ────────────────────────────────────────────────────────────────

function RunsTab() {
  const { data: runs = [], isLoading } = useValuationRuns();
  const { data: models = [] } = useValuationModels();
  const run = useRunValuation();
  const complete = useCompleteValuationRun();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ modelId: 0, date: new Date().toISOString().split('T')[0], runType: 'EOD' });

  const columns = useMemo<ColumnDef<ValuationRun, unknown>[]>(() => [
    { accessorKey: 'runRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.runRef}</span> },
    { accessorKey: 'valuationDate', header: 'Date', cell: ({ row }) => formatDate(row.original.valuationDate) },
    { accessorKey: 'runType', header: 'Type' },
    { accessorKey: 'instrumentsValued', header: 'Instruments', cell: ({ row }) => <span className="tabular-nums">{row.original.instrumentsValued}</span> },
    { accessorKey: 'totalMarketValue', header: 'Total MV', cell: ({ row }) => formatMoney(row.original.totalMarketValue, row.original.currency) },
    { accessorKey: 'unrealizedGainLoss', header: 'Unrealized P&L', cell: ({ row }) => <span className={cn('tabular-nums font-medium', (row.original.unrealizedGainLoss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(row.original.unrealizedGainLoss, row.original.currency)}</span> },
    { accessorKey: 'ipvBreachCount', header: 'IPV Breaches', cell: ({ row }) => <span className={cn('tabular-nums', (row.original.ipvBreachCount ?? 0) > 0 ? 'text-red-600 font-semibold' : '')}>{row.original.ipvBreachCount}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'RUNNING' ? (
      <button className="btn-primary text-xs px-2 py-1 flex items-center gap-1" onClick={() => complete.mutate(row.original.runRef, { onSuccess: () => toast.success('Run completed') })}><CheckCircle2 className="w-3 h-3" /> Complete</button>
    ) : null },
  ], [complete]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}><Play className="w-4 h-4" /> Run Valuation</button>
      </div>
      <DataTable columns={columns} data={runs as ValuationRun[]} isLoading={isLoading} pageSize={15} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Run Valuation</h2>
            <form onSubmit={(e) => { e.preventDefault(); run.mutate({ modelId: form.modelId, date: form.date, runType: form.runType }, { onSuccess: () => { toast.success('Valuation run started'); setShowForm(false); } }); }} className="space-y-4">
              <div><label className="text-sm font-medium text-muted-foreground">Model</label><select className="w-full mt-1 input" value={form.modelId} onChange={(e) => setForm((f) => ({ ...f, modelId: parseInt(e.target.value) }))}><option value={0}>Select model...</option>{(models as ValuationModel[]).map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select></div>
              <div><label className="text-sm font-medium text-muted-foreground">Valuation Date</label><input type="date" className="w-full mt-1 input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium text-muted-foreground">Run Type</label><select className="w-full mt-1 input" value={form.runType} onChange={(e) => setForm((f) => ({ ...f, runType: e.target.value }))}><option value="EOD">End of Day</option><option value="INTRADAY">Intraday</option><option value="AD_HOC">Ad Hoc</option></select></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={run.isPending || !form.modelId} className="btn-primary">{run.isPending ? 'Starting...' : 'Run'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exceptions Tab ──────────────────────────────────────────────────────────

function ExceptionsTab() {
  const { data: runs = [] } = useValuationRuns();
  const latestRun = (runs as ValuationRun[]).find((r) => r.status === 'COMPLETED') ?? (runs as ValuationRun[])[0];
  const { data: exceptions = [], isLoading } = useValuationExceptions(latestRun?.runRef ?? '');

  const columns = useMemo<ColumnDef<InstrumentValuation, unknown>[]>(() => [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.instrumentCode}</span> },
    { accessorKey: 'instrumentName', header: 'Name' },
    { accessorKey: 'modelPrice', header: 'Model Price', cell: ({ row }) => row.original.modelPrice?.toFixed(4) },
    { accessorKey: 'marketPrice', header: 'Market Price', cell: ({ row }) => row.original.marketPrice?.toFixed(4) },
    { accessorKey: 'deviationPct', header: 'Deviation', cell: ({ row }) => <span className="text-red-600 font-medium">{formatPercent(row.original.deviationPct)}</span> },
    { accessorKey: 'fairValueLevel', header: 'FV Level', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', LEVEL_COLORS[row.original.fairValueLevel] ?? 'bg-gray-100 text-gray-600')}>L{row.original.fairValueLevel}</span> },
    { accessorKey: 'exceptionReason', header: 'Reason', cell: ({ row }) => row.original.exceptionReason || '-' },
  ], []);

  return (
    <div className="p-4 space-y-4">
      {latestRun && <p className="text-sm text-muted-foreground">Showing exceptions from run <span className="font-mono font-medium text-primary">{latestRun.runRef}</span> ({formatDate(latestRun.valuationDate)})</p>}
      <DataTable columns={columns} data={exceptions as InstrumentValuation[]} isLoading={isLoading} pageSize={15} emptyMessage="No pricing exceptions" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ValuationPage() {
  useEffect(() => { document.title = 'Instrument Valuation | CBS'; }, []);

  const { data: models = [] } = useValuationModels();
  const { data: runs = [] } = useValuationRuns();
  const allRuns = runs as ValuationRun[];
  const latestRun = allRuns.find((r) => r.status === 'COMPLETED') ?? allRuns[0];

  const pieData = useMemo(() => {
    if (!latestRun) return [];
    return [
      { name: 'Level 1', value: latestRun.fairValueLevel1Total || 0 },
      { name: 'Level 2', value: latestRun.fairValueLevel2Total || 0 },
      { name: 'Level 3', value: latestRun.fairValueLevel3Total || 0 },
    ].filter((d) => d.value > 0);
  }, [latestRun]);

  return (
    <>
      <PageHeader title="Instrument Valuation" subtitle="Fair value measurement, IPV and IFRS 13 classification" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Valuation Models" value={(models as ValuationModel[]).length} format="number" icon={Calculator} />
          <StatCard label="Total Runs" value={allRuns.length} format="number" icon={BarChart3} />
          <StatCard label="Latest MV" value={latestRun?.totalMarketValue ?? 0} format="money" icon={Calculator} />
          <StatCard label="IPV Breaches" value={latestRun?.ipvBreachCount ?? 0} format="number" icon={AlertTriangle} />
        </div>

        {pieData.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">IFRS 13 Fair Value Hierarchy</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'models', label: 'Valuation Models', badge: (models as ValuationModel[]).length || undefined, content: <ModelsTab /> },
            { id: 'runs', label: 'Valuation Runs', badge: allRuns.length || undefined, content: <RunsTab /> },
            { id: 'exceptions', label: 'Exceptions', badge: latestRun?.ipvBreachCount || undefined, content: <ExceptionsTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
