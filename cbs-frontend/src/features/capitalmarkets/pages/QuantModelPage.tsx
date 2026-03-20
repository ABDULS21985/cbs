import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Brain, CheckCircle2, Clock, FlaskConical, Plus, X, ShieldAlert, Activity } from 'lucide-react';
import {
  useQuantModelsByType,
  useQuantModelsDueForReview,
  useQuantModelBacktests,
  useApproveQuantModel,
  usePromoteQuantModel,
  useRetireQuantModel,
  useRecordBacktest,
  useModelOpsEvents,
  useModelOpsAlerts,
} from '../hooks/useCapitalMarketsExt';
import type { QuantModel, ModelBacktest } from '../types/quantModel';
import type { ModelLifecycleEvent } from '../types/modelOps';
import { toast } from 'sonner';

const MODEL_TYPES = ['ALL', 'PD', 'LGD', 'EAD', 'PRICING', 'MARKET_RISK', 'STRESS_TEST'];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    PRODUCTION: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    VALIDATED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DEVELOPMENT: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    RETIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return map[s] ?? map.DEVELOPMENT;
};

// ── Registry Tab ────────────────────────────────────────────────────────────

function RegistryTab() {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const { data: models = [], isLoading } = useQuantModelsByType(typeFilter === 'ALL' ? '' : typeFilter);
  const { data: allModels = [] } = useQuantModelsDueForReview();
  const approve = useApproveQuantModel();
  const promote = usePromoteQuantModel();
  const retire = useRetireQuantModel();

  const display = typeFilter === 'ALL' ? [...(models.length ? models : allModels)] : models;

  const columns = useMemo<ColumnDef<QuantModel, unknown>[]>(() => [
    { accessorKey: 'modelCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.modelCode}</span> },
    { accessorKey: 'modelName', header: 'Name' },
    { accessorKey: 'modelType', header: 'Type', cell: ({ row }) => <span className="text-xs font-medium">{row.original.modelType}</span> },
    { accessorKey: 'modelRiskTier', header: 'Risk Tier' },
    { accessorKey: 'accuracyPct', header: 'Accuracy', cell: ({ row }) => formatPercent(row.original.accuracyPct) },
    { accessorKey: 'aucRoc', header: 'AUC-ROC', cell: ({ row }) => row.original.aucRoc?.toFixed(3) },
    { accessorKey: 'nextReviewDate', header: 'Next Review', cell: ({ row }) => formatDate(row.original.nextReviewDate) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusColor(row.original.status))}>{row.original.status}</span> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.status === 'VALIDATED' && <button className="btn-primary text-xs px-2 py-1" onClick={() => approve.mutate(row.original.modelCode, { onSuccess: () => toast.success('Model approved') })}>Approve</button>}
        {row.original.status === 'APPROVED' && <button className="btn-primary text-xs px-2 py-1" onClick={() => promote.mutate(row.original.modelCode, { onSuccess: () => toast.success('Model promoted') })}>Promote</button>}
        {row.original.status !== 'RETIRED' && <button className="btn-secondary text-xs px-2 py-1" onClick={() => retire.mutate(row.original.modelCode, { onSuccess: () => toast.success('Model retired') })}>Retire</button>}
      </div>
    )},
  ], [approve, promote, retire]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Type:</label>
        <select className="input w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {MODEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <DataTable columns={columns} data={display} isLoading={isLoading} pageSize={15} />
    </div>
  );
}

// ── Backtesting Tab ─────────────────────────────────────────────────────────

function BacktestingTab() {
  const [selectedModel, setSelectedModel] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data: models = [] } = useQuantModelsDueForReview();
  const { data: backtests = [], isLoading } = useQuantModelBacktests(selectedModel);
  const record = useRecordBacktest();

  const [form, setForm] = useState({ backtestType: 'IN_SAMPLE', testPeriodStart: '', testPeriodEnd: '', sampleSize: 10000 });

  const columns = useMemo<ColumnDef<ModelBacktest, unknown>[]>(() => [
    { accessorKey: 'backtestRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.backtestRef}</span> },
    { accessorKey: 'backtestType', header: 'Type' },
    { accessorKey: 'accuracyPct', header: 'Accuracy', cell: ({ row }) => formatPercent(row.original.accuracyPct) },
    { accessorKey: 'aucRoc', header: 'AUC-ROC', cell: ({ row }) => row.original.aucRoc?.toFixed(3) },
    { accessorKey: 'giniCoefficient', header: 'Gini', cell: ({ row }) => row.original.giniCoefficient?.toFixed(3) },
    { accessorKey: 'breachCount', header: 'Breaches' },
    { accessorKey: 'resultStatus', header: 'Result', cell: ({ row }) => <StatusBadge status={row.original.resultStatus} /> },
    { accessorKey: 'runAt', header: 'Run At', cell: ({ row }) => formatDate(row.original.runAt) },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <select className="input w-56" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          <option value="">Select a model...</option>
          {(models as QuantModel[]).map((m) => <option key={m.modelCode} value={m.modelCode}>{m.modelCode} - {m.modelName}</option>)}
        </select>
        <button className="btn-primary flex items-center gap-2" disabled={!selectedModel} onClick={() => setShowForm(true)}>
          <FlaskConical className="w-4 h-4" /> Run Backtest
        </button>
      </div>
      <DataTable columns={columns} data={backtests} isLoading={isLoading} pageSize={10} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Run Backtest</h2>
            <form onSubmit={(e) => { e.preventDefault(); record.mutate({ code: selectedModel, data: form }, { onSuccess: () => { toast.success('Backtest recorded'); setShowForm(false); } }); }} className="space-y-4">
              <div><label className="text-sm font-medium text-muted-foreground">Type</label><select className="w-full mt-1 input" value={form.backtestType} onChange={(e) => setForm((f) => ({ ...f, backtestType: e.target.value }))}><option value="IN_SAMPLE">In-Sample</option><option value="OUT_OF_SAMPLE">Out-of-Sample</option><option value="TIME_SERIES">Time Series</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-muted-foreground">Period Start</label><input type="date" className="w-full mt-1 input" value={form.testPeriodStart} onChange={(e) => setForm((f) => ({ ...f, testPeriodStart: e.target.value }))} required /></div>
                <div><label className="text-sm font-medium text-muted-foreground">Period End</label><input type="date" className="w-full mt-1 input" value={form.testPeriodEnd} onChange={(e) => setForm((f) => ({ ...f, testPeriodEnd: e.target.value }))} required /></div>
              </div>
              <div><label className="text-sm font-medium text-muted-foreground">Sample Size</label><input type="number" className="w-full mt-1 input" value={form.sampleSize} onChange={(e) => setForm((f) => ({ ...f, sampleSize: parseInt(e.target.value) || 0 }))} min={100} /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={record.isPending} className="btn-primary">{record.isPending ? 'Running...' : 'Run'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Model Ops Tab ───────────────────────────────────────────────────────────

function ModelOpsTab() {
  const [code, setCode] = useState('');
  const { data: models = [] } = useQuantModelsDueForReview();
  const { data: events = [], isLoading } = useModelOpsEvents(code);

  return (
    <div className="p-4 space-y-4">
      <select className="input w-56" value={code} onChange={(e) => setCode(e.target.value)}>
        <option value="">Select a model...</option>
        {(models as QuantModel[]).map((m) => <option key={m.modelCode} value={m.modelCode}>{m.modelCode} - {m.modelName}</option>)}
      </select>
      {isLoading && <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />}
      <div className="space-y-3">
        {(events as ModelLifecycleEvent[]).map((ev) => (
          <div key={ev.id} className="flex gap-4 items-start border-l-2 border-primary/30 pl-4 py-2">
            <Activity className="w-4 h-4 mt-1 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{ev.eventType} <span className="text-muted-foreground">by {ev.performedBy}</span></p>
              <p className="text-xs text-muted-foreground">{ev.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(ev.eventDate)}</p>
            </div>
            <StatusBadge status={ev.status} />
          </div>
        ))}
        {!isLoading && code && (events as ModelLifecycleEvent[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No events for this model.</p>}
      </div>
    </div>
  );
}

// ── Alerts Tab ──────────────────────────────────────────────────────────────

function AlertsTab() {
  const { data: alerts = [], isLoading } = useModelOpsAlerts();
  const severityColor = (s: string) => {
    const map: Record<string, string> = { CRITICAL: 'border-red-500 bg-red-50 dark:bg-red-900/20', HIGH: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', MEDIUM: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', LOW: 'border-gray-300 bg-gray-50 dark:bg-gray-800' };
    return map[s] ?? map.LOW;
  };

  return (
    <div className="p-4 space-y-3">
      {isLoading && <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />}
      {(alerts as Array<{ id: number; severity: string; message: string; modelCode: string; createdAt: string; acknowledged: boolean }>).map((a) => (
        <div key={a.id} className={cn('rounded-lg border-l-4 p-4', severityColor(a.severity))}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase">{a.severity}</span>
              <p className="text-sm font-medium mt-1">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">Model: {a.modelCode} | {formatDate(a.createdAt)}</p>
            </div>
            {!a.acknowledged && <button className="btn-secondary text-xs px-2 py-1" onClick={() => toast.success('Alert acknowledged')}>Acknowledge</button>}
          </div>
        </div>
      ))}
      {!isLoading && (alerts as unknown[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active alerts.</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function QuantModelPage() {
  useEffect(() => { document.title = 'Quantitative Models | CBS'; }, []);

  const { data: allModels = [] } = useQuantModelsDueForReview();
  const { data: dueForReview = [] } = useQuantModelsDueForReview();
  const models = allModels as QuantModel[];
  const production = models.filter((m) => m.status === 'PRODUCTION');

  return (
    <>
      <PageHeader title="Quantitative Models" subtitle="Model registry, backtesting, lifecycle and alerts">
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Register Model</button>
      </PageHeader>
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Models" value={models.length} format="number" icon={Brain} />
          <StatCard label="In Production" value={production.length} format="number" icon={CheckCircle2} />
          <StatCard label="Due for Review" value={(dueForReview as QuantModel[]).length} format="number" icon={Clock} />
          <StatCard label="Backtests" value={0} format="number" icon={FlaskConical} />
        </div>
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'registry', label: 'Model Registry', badge: models.length || undefined, content: <RegistryTab /> },
            { id: 'backtesting', label: 'Backtesting', content: <BacktestingTab /> },
            { id: 'model-ops', label: 'Model Ops', content: <ModelOpsTab /> },
            { id: 'alerts', label: 'Alerts', icon: <ShieldAlert className="w-4 h-4" />, content: <AlertsTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
