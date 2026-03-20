import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Calculator, Plus, Loader2, X, AlertTriangle, CheckCircle,
  Activity, Eye, Target, BarChart3, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import {
  useValuationModels,
  useValuationRunExceptions,
  useDefineValuationModel,
  useCompleteValuationRun,
} from '../hooks/useCustodyExt';
import { valuationApi } from '@/features/capitalmarkets/api/valuationApi';
import type { ValuationModel, ValuationRun, InstrumentValuation } from '../types/valuation';
import { ValuationModelForm } from '../components/ValuationModelForm';
import { FairValueBreakdown } from '../components/FairValueBreakdown';

// ─── Model Detail Slide-over ────────────────────────────────────────────────

function ModelDetailPanel({ model, onClose }: { model: ValuationModel; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{model.modelName}</h2>
            <p className="text-xs text-muted-foreground font-mono">{model.modelCode}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Instrument Type</p><p className="font-medium">{model.instrumentType}</p></div>
            <div><p className="text-xs text-muted-foreground">Methodology</p><p className="font-medium">{model.valuationMethodology?.replace(/_/g, ' ')}</p></div>
            <div><p className="text-xs text-muted-foreground">Fair Value Hierarchy</p><StatusBadge status={model.fairValueHierarchy} /></div>
            <div><p className="text-xs text-muted-foreground">Calibration</p><p className="font-medium">{model.calibrationFrequency}</p></div>
            <div><p className="text-xs text-muted-foreground">Last Calibrated</p><p className="font-medium">{model.lastCalibratedAt ? formatDate(model.lastCalibratedAt) : '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">IPV Threshold</p><p className="font-mono font-medium">{model.ipvThresholdPct}%</p></div>
            <div><p className="text-xs text-muted-foreground">IPV Enabled</p><p className="font-medium">{model.independentPriceVerification ? 'Yes' : 'No'}</p></div>
            <div><p className="text-xs text-muted-foreground">IPV Frequency</p><p className="font-medium">{model.ipvFrequency || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Model Owner</p><p className="font-medium">{model.modelOwner || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Validated By</p><p className="font-medium">{model.validatedBy || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Regulatory Approval</p><p className="font-medium">{model.regulatoryApproval ? 'Approved' : 'Pending'}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={model.status} dot /></div>
          </div>

          {model.inputParameters && Object.keys(model.inputParameters).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Input Parameters</p>
              <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto font-mono">
                {JSON.stringify(model.inputParameters, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Run Dialog ─────────────────────────────────────────────────────────

function NewRunDialog({ models, onClose }: { models: ValuationModel[]; onClose: () => void }) {
  const [modelId, setModelId] = useState(models[0]?.id ?? 0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [runType, setRunType] = useState('END_OF_DAY');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    valuationApi.runValuation(modelId, date, runType)
      .then(() => { toast.success('Valuation run started'); onClose(); })
      .catch(() => toast.error('Failed to start run'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New Valuation Run</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Model</label>
            <select className="w-full mt-1 input" value={modelId} onChange={(e) => setModelId(parseInt(e.target.value))}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.modelName} ({m.modelCode})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Valuation Date</label>
            <input type="date" className="w-full mt-1 input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Run Type</label>
            <select className="w-full mt-1 input" value={runType} onChange={(e) => setRunType(e.target.value)}>
              <option value="END_OF_DAY">End of Day</option>
              <option value="INTRADAY">Intraday</option>
              <option value="AD_HOC">Ad-Hoc</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Starting...' : 'Start Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ValuationPage() {
  useEffect(() => { document.title = 'Valuations | CBS'; }, []);

  const navigate = useNavigate();
  const [showModelForm, setShowModelForm] = useState(false);
  const [showNewRun, setShowNewRun] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ValuationModel | null>(null);

  const { data: models = [], isLoading: modelsLoading } = useValuationModels();
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['valuation', 'runs'],
    queryFn: () => valuationApi.getRuns(),
    staleTime: 30_000,
  });

  // IPV data from recent runs
  const recentCompletedRuns = runs.filter((r) => r.status === 'COMPLETED').slice(0, 10);
  const totalBreachesThisMonth = recentCompletedRuns.reduce((s, r) => s + r.ipvBreachCount, 0);
  const modelsWithBreaches = new Set(recentCompletedRuns.filter((r) => r.ipvBreachCount > 0).map((r) => r.modelId)).size;

  // Latest completed run for exceptions
  const latestRun = recentCompletedRuns[0];
  const { data: latestExceptions = [] } = useValuationRunExceptions(latestRun?.runRef ?? '');

  const breachedExceptions = latestExceptions.filter((e) => e.deviationBreached);

  // Model columns
  const modelCols: ColumnDef<ValuationModel, unknown>[] = [
    { accessorKey: 'modelCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.modelCode}</span> },
    { accessorKey: 'modelName', header: 'Name', cell: ({ row }) => <span className="font-medium text-sm">{row.original.modelName}</span> },
    { accessorKey: 'instrumentType', header: 'Instrument', cell: ({ row }) => <span className="text-xs">{row.original.instrumentType}</span> },
    { accessorKey: 'valuationMethodology', header: 'Methodology', cell: ({ row }) => <span className="text-xs">{row.original.valuationMethodology?.replace(/_/g, ' ')}</span> },
    {
      accessorKey: 'fairValueHierarchy', header: 'FV Level',
      cell: ({ row }) => {
        const level = row.original.fairValueHierarchy;
        const color = level === 'LEVEL_1' ? 'bg-blue-100 text-blue-700' : level === 'LEVEL_2' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
        return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', color)}>{level?.replace('_', ' ')}</span>;
      },
    },
    { accessorKey: 'calibrationFrequency', header: 'Calibration', cell: ({ row }) => <span className="text-xs">{row.original.calibrationFrequency}</span> },
    { accessorKey: 'lastCalibratedAt', header: 'Last Calibrated', cell: ({ row }) => <span className="text-xs">{row.original.lastCalibratedAt ? formatDate(row.original.lastCalibratedAt) : '—'}</span> },
    { accessorKey: 'ipvThresholdPct', header: 'IPV %', cell: ({ row }) => <span className="text-xs font-mono">{row.original.ipvThresholdPct}%</span> },
    { accessorKey: 'modelOwner', header: 'Owner', cell: ({ row }) => <span className="text-xs">{row.original.modelOwner || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  // Run columns
  const runCols: ColumnDef<ValuationRun, unknown>[] = [
    {
      accessorKey: 'runRef', header: 'Run Ref',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/custody/valuations/runs/${row.original.runRef}`)} className="font-mono text-xs font-medium text-primary hover:underline">
          {row.original.runRef}
        </button>
      ),
    },
    { accessorKey: 'valuationDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.valuationDate)}</span> },
    { accessorKey: 'modelId', header: 'Model', cell: ({ row }) => <span className="text-xs font-mono">#{row.original.modelId}</span> },
    { accessorKey: 'runType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.runType} /> },
    { accessorKey: 'instrumentsValued', header: 'Instruments', cell: ({ row }) => <span className="text-xs font-mono">{row.original.instrumentsValued}</span> },
    { accessorKey: 'totalMarketValue', header: 'Market Value', cell: ({ row }) => <span className="text-xs font-mono font-medium">{formatMoney(row.original.totalMarketValue, row.original.currency)}</span> },
    {
      accessorKey: 'unrealizedGainLoss', header: 'Unrealized G/L',
      cell: ({ row }) => <span className={cn('text-xs font-mono font-medium', row.original.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(row.original.unrealizedGainLoss, row.original.currency)}</span>,
    },
    {
      accessorKey: 'ipvBreachCount', header: 'IPV Breaches',
      cell: ({ row }) => row.original.ipvBreachCount > 0
        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{row.original.ipvBreachCount}</span>
        : <span className="text-xs text-green-600">0</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'runStartedAt', header: 'Started', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.runStartedAt)}</span> },
  ];

  // IPV breach columns
  const breachCols: ColumnDef<InstrumentValuation, unknown>[] = [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.instrumentCode}</span> },
    { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin}</span> },
    { accessorKey: 'modelPrice', header: 'Model Price', cell: ({ row }) => <span className="font-mono text-xs">{row.original.modelPrice.toFixed(4)}</span> },
    { accessorKey: 'marketPrice', header: 'Market Price', cell: ({ row }) => <span className="font-mono text-xs">{row.original.marketPrice.toFixed(4)}</span> },
    {
      accessorKey: 'priceDeviation', header: 'Deviation',
      cell: ({ row }) => {
        const dev = row.original.priceDeviation;
        const color = row.original.deviationBreached ? 'text-red-600 font-bold' : dev > 3 ? 'text-amber-600' : 'text-green-600';
        return <span className={cn('font-mono text-xs', color)}>{dev.toFixed(2)}%</span>;
      },
    },
    { accessorKey: 'fairValueLevel', header: 'FV Level', cell: ({ row }) => <StatusBadge status={row.original.fairValueLevel} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  const tabs = [
    {
      id: 'models',
      label: 'Models Registry',
      badge: models.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowModelForm(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> Define Model
            </button>
          </div>
          <DataTable columns={modelCols} data={models} isLoading={modelsLoading} enableGlobalFilter emptyMessage="No valuation models defined" onRowClick={(row) => setSelectedModel(row)} />
        </div>
      ),
    },
    {
      id: 'runs',
      label: 'Valuation Runs',
      badge: runs.filter((r) => r.status === 'RUNNING').length || undefined,
      content: (
        <div className="p-4 space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowNewRun(true)} disabled={models.length === 0} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> New Valuation Run
            </button>
          </div>
          <DataTable columns={runCols} data={runs} isLoading={runsLoading} enableGlobalFilter enableExport exportFilename="valuation-runs" emptyMessage="No valuation runs" onRowClick={(row) => navigate(`/custody/valuations/runs/${row.runRef}`)} />
          {recentCompletedRuns.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Fair Value Breakdown (Latest Run)</h3>
              <FairValueBreakdown
                level1Total={recentCompletedRuns[0].fairValueLevel1Total}
                level2Total={recentCompletedRuns[0].fairValueLevel2Total}
                level3Total={recentCompletedRuns[0].fairValueLevel3Total}
                currency={recentCompletedRuns[0].currency}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'ipv',
      label: 'IPV Dashboard',
      badge: totalBreachesThisMonth > 0 ? totalBreachesThisMonth : undefined,
      content: (
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Breaches This Month" value={totalBreachesThisMonth} format="number" icon={AlertTriangle} />
            <StatCard label="Models with Breaches" value={modelsWithBreaches} format="number" icon={Target} />
            <StatCard label="Instruments to Review" value={breachedExceptions.length} format="number" icon={Eye} />
            <StatCard label="Total Runs" value={recentCompletedRuns.length} format="number" icon={Activity} />
          </div>

          {/* Breach trend */}
          {recentCompletedRuns.length > 1 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">IPV Breach Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={recentCompletedRuns.reverse().map((r) => ({ date: r.valuationDate, breaches: r.ipvBreachCount }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="breaches" name="IPV Breaches" stroke="#ef4444" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Current breaches */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Current Breaches {latestRun && `(Run: ${latestRun.runRef})`}</h3>
            {breachedExceptions.length > 0 ? (
              <DataTable columns={breachCols} data={breachedExceptions} enableGlobalFilter emptyMessage="No breaches" />
            ) : (
              <EmptyState title="No IPV breaches" description="All instruments are within threshold" />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showModelForm && <ValuationModelForm onClose={() => setShowModelForm(false)} />}
      {showNewRun && <NewRunDialog models={models} onClose={() => setShowNewRun(false)} />}
      {selectedModel && <ModelDetailPanel model={selectedModel} onClose={() => setSelectedModel(null)} />}

      <PageHeader
        title="Securities Valuation"
        subtitle="Model registry, valuation runs, and independent price verification"
        actions={
          <button onClick={() => setShowModelForm(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Define Model
          </button>
        }
      />

      <div className="page-container">
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
