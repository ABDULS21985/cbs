import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, Play, Loader2, X, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ValModel {
  id: number; modelCode: string; modelName: string; instrumentType: string;
  methodology: string; fairValueLevel: number; description: string;
  status: string; createdAt: string;
}

interface ValRun {
  id: number; runRef: string; valuationDate: string; modelId: number;
  runType: string; instrumentsValued: number; totalMarketValue: number;
  currency: string; unrealizedGainLoss: number; fairValueLevel1Total: number;
  fairValueLevel2Total: number; fairValueLevel3Total: number;
  ipvBreachCount: number; status: string;
}

interface InstrValuation {
  id: number; runId: number; instrumentCode: string; instrumentName: string;
  modelPrice: number; marketPrice: number; deviationPct: number;
  fairValueLevel: number; isException: boolean; exceptionReason: string | null;
}

const FVL_BADGE: Record<number, string> = {
  1: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  2: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const RUN_TYPE_BADGE: Record<string, string> = {
  EOD: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INTRADAY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  AD_HOC: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#f59e0b'];

// ─── Define Model Dialog ─────────────────────────────────────────────────────

function DefineModelDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ modelCode: '', modelName: '', instrumentType: '', methodology: '', fairValueLevel: 1, description: '' });

  const mutation = useMutation({
    mutationFn: () => apiPost<ValModel>('/api/v1/valuations/models', form),
    onSuccess: () => { toast.success('Valuation model defined'); queryClient.invalidateQueries({ queryKey: ['val-models'] }); onClose(); },
    onError: () => toast.error('Failed to define model'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Define Valuation Model</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model Code</label>
              <input className="w-full mt-1 input" value={form.modelCode} onChange={(e) => setForm((f) => ({ ...f, modelCode: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model Name</label>
              <input className="w-full mt-1 input" value={form.modelName} onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Instrument Type</label>
              <input className="w-full mt-1 input" placeholder="e.g. BOND" value={form.instrumentType} onChange={(e) => setForm((f) => ({ ...f, instrumentType: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Methodology</label>
              <input className="w-full mt-1 input" placeholder="e.g. DCF" value={form.methodology} onChange={(e) => setForm((f) => ({ ...f, methodology: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fair Value Level (IFRS 13)</label>
            <select className="w-full mt-1 input" value={form.fairValueLevel} onChange={(e) => setForm((f) => ({ ...f, fairValueLevel: Number(e.target.value) }))}>
              <option value={1}>Level 1 - Quoted prices</option>
              <option value={2}>Level 2 - Observable inputs</option>
              <option value={3}>Level 3 - Unobservable inputs</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 input min-h-[60px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : 'Define Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Run Valuation Dialog ────────────────────────────────────────────────────

function RunValuationDialog({ models, onClose }: { models: ValModel[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ modelId: models[0]?.id ?? 0, date: new Date().toISOString().slice(0, 10), runType: 'EOD' });

  const mutation = useMutation({
    mutationFn: () => apiPost<ValRun>(`/api/v1/valuations/runs?modelId=${form.modelId}&date=${form.date}&runType=${encodeURIComponent(form.runType)}`),
    onSuccess: () => { toast.success('Valuation run started'); queryClient.invalidateQueries({ queryKey: ['val-runs'] }); onClose(); },
    onError: () => toast.error('Failed to start valuation run'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Run Valuation</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Model</label>
            <select className="w-full mt-1 input" value={form.modelId} onChange={(e) => setForm((f) => ({ ...f, modelId: Number(e.target.value) }))}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.modelName} ({m.modelCode})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Valuation Date</label>
            <input type="date" className="w-full mt-1 input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Run Type</label>
            <select className="w-full mt-1 input" value={form.runType} onChange={(e) => setForm((f) => ({ ...f, runType: e.target.value }))}>
              <option value="EOD">End of Day</option>
              <option value="INTRADAY">Intraday</option>
              <option value="AD_HOC">Ad Hoc</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Running...</> : 'Run Valuation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ValuationPage() {
  const [showDefine, setShowDefine] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  useEffect(() => { document.title = 'Instrument Valuation'; }, []);

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['val-models'],
    queryFn: () => apiGet<ValModel[]>('/api/v1/valuations/models').catch(() => []),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['val-runs'],
    queryFn: () => apiGet<ValRun[]>('/api/v1/valuations/runs').catch(() => []),
  });

  const latestRef = useMemo(() => (runs.length > 0 ? runs[0].runRef : null), [runs]);

  const { data: exceptions = [] } = useQuery({
    queryKey: ['val-exceptions', latestRef],
    queryFn: () => apiGet<InstrValuation[]>(`/api/v1/valuations/runs/${latestRef}/exceptions`).catch(() => []),
    enabled: !!latestRef,
  });

  const { data: runSummary } = useQuery({
    queryKey: ['val-run-summary', selectedRun],
    queryFn: () => apiGet<ValRun>(`/api/v1/valuations/runs/${selectedRun}/summary`),
    enabled: !!selectedRun,
  });

  const modelColumns = useMemo<ColumnDef<ValModel, unknown>[]>(() => [
    { accessorKey: 'modelCode', header: 'Code', cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span> },
    { accessorKey: 'modelName', header: 'Name' },
    { accessorKey: 'instrumentType', header: 'Instrument Type' },
    { accessorKey: 'methodology', header: 'Methodology' },
    {
      accessorKey: 'fairValueLevel',
      header: 'FV Level',
      cell: ({ getValue }) => {
        const lvl = getValue<number>();
        return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', FVL_BADGE[lvl] ?? '')}>L{lvl}</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  ], []);

  const runColumns = useMemo<ColumnDef<ValRun, unknown>[]>(() => [
    { accessorKey: 'runRef', header: 'Reference', cell: ({ getValue }) => <button className="font-mono text-primary hover:underline" onClick={() => setSelectedRun(getValue<string>())}>{getValue<string>()}</button> },
    { accessorKey: 'valuationDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      accessorKey: 'runType', header: 'Type',
      cell: ({ getValue }) => {
        const t = getValue<string>();
        return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', RUN_TYPE_BADGE[t] ?? '')}>{t.replace(/_/g, ' ')}</span>;
      },
    },
    { accessorKey: 'instrumentsValued', header: 'Instruments' },
    { accessorKey: 'totalMarketValue', header: 'Total MV', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
    {
      accessorKey: 'ipvBreachCount', header: 'IPV Breaches',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return <span className={cn('font-mono font-medium', v > 0 ? 'text-red-600' : 'text-green-600')}>{v}</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  ], []);

  const exceptionColumns = useMemo<ColumnDef<InstrValuation, unknown>[]>(() => [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span> },
    { accessorKey: 'instrumentName', header: 'Name' },
    { accessorKey: 'modelPrice', header: 'Model Price', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
    { accessorKey: 'marketPrice', header: 'Market Price', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
    {
      accessorKey: 'deviationPct', header: 'Deviation %',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return <span className={cn('font-mono font-medium', Math.abs(v) > 5 ? 'text-red-600' : 'text-foreground')}>{v.toFixed(2)}%</span>;
      },
    },
    {
      accessorKey: 'fairValueLevel', header: 'FV Level',
      cell: ({ getValue }) => {
        const lvl = getValue<number>();
        return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', FVL_BADGE[lvl] ?? '')}>L{lvl}</span>;
      },
    },
    { accessorKey: 'isException', header: 'Exception', cell: ({ getValue }) => getValue<boolean>() ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" /> },
    { accessorKey: 'exceptionReason', header: 'Reason', cell: ({ getValue }) => getValue<string>() || '—' },
  ], []);

  const fvPieData = useMemo(() => {
    const latest = runs[0];
    if (!latest) return [];
    return [
      { name: 'Level 1', value: latest.fairValueLevel1Total },
      { name: 'Level 2', value: latest.fairValueLevel2Total },
      { name: 'Level 3', value: latest.fairValueLevel3Total },
    ].filter((d) => d.value > 0);
  }, [runs]);

  const tabs = [
    {
      id: 'models',
      label: 'Models',
      badge: models.length || undefined,
      content: (
        <div className="p-4">
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowDefine(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Define Model
            </button>
          </div>
          <DataTable columns={modelColumns} data={models} isLoading={modelsLoading} enableGlobalFilter emptyMessage="No valuation models defined" />
        </div>
      ),
    },
    {
      id: 'runs',
      label: 'Runs',
      badge: runs.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRun(true)} disabled={models.length === 0} className="btn-primary flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> Run Valuation
            </button>
          </div>
          <DataTable columns={runColumns} data={runs} isLoading={runsLoading} enableGlobalFilter emptyMessage="No valuation runs" />
          {runSummary && (
            <div className="card p-6 mt-4">
              <h3 className="font-semibold mb-3">Run Summary: {runSummary.runRef}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDate(runSummary.valuationDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Instruments</p><p className="font-medium">{runSummary.instrumentsValued}</p></div>
                <div><p className="text-xs text-muted-foreground">Total MV</p><p className="font-mono font-medium">{formatMoney(runSummary.totalMarketValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">Unrealized G/L</p><p className={cn('font-mono font-medium', runSummary.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(runSummary.unrealizedGainLoss)}</p></div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      badge: exceptions.length || undefined,
      content: (
        <div className="p-4 space-y-6">
          <DataTable columns={exceptionColumns} data={exceptions} enableGlobalFilter emptyMessage="No exceptions in latest run" />
          {fvPieData.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4">IFRS 13 Fair Value Hierarchy</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={fvPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {fvPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {showDefine && <DefineModelDialog onClose={() => setShowDefine(false)} />}
      {showRun && <RunValuationDialog models={models} onClose={() => setShowRun(false)} />}

      <PageHeader
        title="Instrument Valuation"
        subtitle="Valuation models, pricing runs and IFRS 13 fair value exceptions"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDefine(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Define Model
            </button>
            <button onClick={() => setShowRun(true)} disabled={models.length === 0} className="btn-primary flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> Run Valuation
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Valuation Models" value={models.length} format="number" icon={Calculator} loading={modelsLoading} />
          <StatCard label="Total Runs" value={runs.length} format="number" icon={Play} loading={runsLoading} />
          <StatCard label="Latest MV" value={runs[0]?.totalMarketValue ?? 0} format="money" compact icon={Calculator} loading={runsLoading} />
          <StatCard
            label="IPV Breaches"
            value={runs[0]?.ipvBreachCount ?? 0}
            format="number"
            trend={(runs[0]?.ipvBreachCount ?? 0) > 0 ? 'down' : 'up'}
            icon={AlertTriangle}
            loading={runsLoading}
          />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
