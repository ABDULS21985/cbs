import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Loader2, X, Settings, Play, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate, formatPercent, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  useEclParameters,
  useSaveEclParameter,
  useCalculateEcl,
  useRunEclCalculation,
  useEclCalculationsForDate,
} from '../hooks/useEclDashboard';
import type { EclModelParameter } from '../types/eclExt';
import type { EclCalculation } from '../types/eclExt';

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700',
};
const STAGE_LABELS: Record<number, string> = {
  1: 'Stage 1 — 12-Month ECL', 2: 'Stage 2 — Lifetime (SICR)', 3: 'Stage 3 — Lifetime (Impaired)',
};
const SCENARIO_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-700', OPTIMISTIC: 'bg-green-100 text-green-700', PESSIMISTIC: 'bg-red-100 text-red-700',
};

// ── Create/Edit Parameter Dialog ─────────────────────────────────────────────

function ParameterDialog({ initial, onClose }: { initial?: EclModelParameter; onClose: () => void }) {
  const saveMut = useSaveEclParameter();
  const [form, setForm] = useState({
    parameterName: initial?.parameterName ?? '',
    segment: initial?.segment ?? 'RETAIL',
    stage: initial?.stage ?? 1,
    pd12Month: initial?.pd12Month ?? 0,
    pdLifetime: initial?.pdLifetime ?? 0,
    lgdRate: initial?.lgdRate ?? 0,
    eadCcf: initial?.eadCcf ?? 1.0,
    macroScenario: initial?.macroScenario ?? 'BASE',
    scenarioWeight: initial?.scenarioWeight ?? 0.5,
    macroAdjustment: initial?.macroAdjustment ?? 0,
    effectiveDate: initial?.effectiveDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate(form as any, {
      onSuccess: () => { toast.success(initial ? 'Parameter updated' : 'Parameter created'); onClose(); },
      onError: () => toast.error('Failed to save parameter'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">{initial ? 'Edit' : 'New'} ECL Parameter</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Parameter Name *</label>
            <input value={form.parameterName} onChange={(e) => setForm({ ...form, parameterName: e.target.value })} className={fc} required /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Segment</label>
              <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} className={fc}>
                {['RETAIL', 'CORPORATE', 'SME', 'MICROFINANCE', 'STAFF'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: Number(e.target.value) })} className={fc}>
                {[1, 2, 3].map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">PD 12-Month (%)</label>
              <input type="number" step="0.01" value={form.pd12Month || ''} onChange={(e) => setForm({ ...form, pd12Month: Number(e.target.value) })} className={cn(fc, 'font-mono')} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">PD Lifetime (%)</label>
              <input type="number" step="0.01" value={form.pdLifetime || ''} onChange={(e) => setForm({ ...form, pdLifetime: Number(e.target.value) })} className={cn(fc, 'font-mono')} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">LGD Rate (%)</label>
              <input type="number" step="0.01" value={form.lgdRate || ''} onChange={(e) => setForm({ ...form, lgdRate: Number(e.target.value) })} className={cn(fc, 'font-mono')} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">EAD CCF</label>
              <input type="number" step="0.01" min="0" max="1" value={form.eadCcf} onChange={(e) => setForm({ ...form, eadCcf: Number(e.target.value) })} className={cn(fc, 'font-mono')} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Credit Conversion Factor (0-1)</p></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Macro Scenario</label>
              <select value={form.macroScenario} onChange={(e) => setForm({ ...form, macroScenario: e.target.value })} className={fc}>
                {['BASE', 'OPTIMISTIC', 'PESSIMISTIC'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Weight</label>
              <input type="number" step="0.01" min="0" max="1" value={form.scenarioWeight} onChange={(e) => setForm({ ...form, scenarioWeight: Number(e.target.value) })} className={cn(fc, 'font-mono')} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Probability weight</p></div>
            <div><label className="text-xs font-medium text-muted-foreground">Macro Adj (%)</label>
              <input type="number" step="0.01" value={form.macroAdjustment || ''} onChange={(e) => setForm({ ...form, macroAdjustment: Number(e.target.value) })} className={cn(fc, 'font-mono')} /></div>
          </div>

          <div><label className="text-xs font-medium text-muted-foreground">Effective Date</label>
            <input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} className={fc} /></div>

          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={!form.parameterName || saveMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} {initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function EclParameterPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editParam, setEditParam] = useState<EclModelParameter | null>(null);
  const [calcDate, setCalcDate] = useState('');

  const { data: parameters = [], isLoading } = useEclParameters();
  const runEcl = useRunEclCalculation();
  const calculateEcl = useCalculateEcl();
  const { data: calculations = [], isLoading: calcsLoading } = useEclCalculationsForDate(calcDate);
  const [previewResult, setPreviewResult] = useState<EclCalculation | null>(null);

  const activeCount = parameters.filter((p: EclModelParameter) => p.isActive).length;
  const stageCount = (stage: number) => parameters.filter((p: EclModelParameter) => p.stage === stage).length;

  const handlePreview = () => {
    calculateEcl.mutate({ segment: 'RETAIL', stage: 1, outstanding: 1000000 }, {
      onSuccess: (data) => { setPreviewResult(data); toast.success('ECL calculated'); },
      onError: () => toast.error('Calculation failed'),
    });
  };

  const paramColumns: ColumnDef<EclModelParameter, unknown>[] = [
    { accessorKey: 'parameterName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.parameterName}</span> },
    { accessorKey: 'segment', header: 'Segment', cell: ({ row }) => <span className="text-xs bg-muted px-2 py-0.5 rounded">{row.original.segment}</span> },
    { accessorKey: 'stage', header: 'Stage', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[row.original.stage])}>{row.original.stage}</span> },
    { accessorKey: 'pd12Month', header: 'PD 12M', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.pd12Month)}</span> },
    { accessorKey: 'pdLifetime', header: 'PD Life', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.pdLifetime)}</span> },
    { accessorKey: 'lgdRate', header: 'LGD', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.lgdRate)}</span> },
    { accessorKey: 'eadCcf', header: 'EAD CCF', cell: ({ row }) => <span className="font-mono text-xs">{row.original.eadCcf.toFixed(2)}</span> },
    { accessorKey: 'macroScenario', header: 'Scenario', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded text-xs font-medium', SCENARIO_COLORS[row.original.macroScenario])}>{row.original.macroScenario}</span> },
    { accessorKey: 'scenarioWeight', header: 'Weight', cell: ({ row }) => <span className="font-mono text-xs">{(row.original.scenarioWeight * 100).toFixed(0)}%</span> },
    { accessorKey: 'effectiveDate', header: 'Effective', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.effectiveDate)}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
    { accessorKey: 'createdBy', header: 'Created By', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.createdBy}</span> },
  ];

  const calcColumns: ColumnDef<EclCalculation, unknown>[] = [
    { accessorKey: 'loanAccountId', header: 'Loan ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.loanAccountId}</span> },
    { accessorKey: 'segment', header: 'Segment', cell: ({ row }) => <span className="text-xs">{row.original.segment}</span> },
    { accessorKey: 'currentStage', header: 'Stage', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[row.original.currentStage])}>{row.original.currentStage}</span> },
    { accessorKey: 'pdUsed', header: 'PD', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.pdUsed)}</span> },
    { accessorKey: 'lgdUsed', header: 'LGD', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.lgdUsed)}</span> },
    { accessorKey: 'ead', header: 'EAD', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.ead)}</span> },
    { accessorKey: 'eclWeighted', header: 'ECL Weighted', cell: ({ row }) => <span className="font-mono text-xs font-medium">{formatMoney(row.original.eclWeighted)}</span> },
    { accessorKey: 'previousEcl', header: 'Previous', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.previousEcl)}</span> },
    { accessorKey: 'eclMovement', header: 'Movement', cell: ({ row }) => {
      const m = row.original.eclMovement;
      return <span className={cn('font-mono text-xs font-medium', m > 0 ? 'text-red-600' : m < 0 ? 'text-green-600' : '')}>{m > 0 ? '+' : ''}{formatMoney(m)}</span>;
    }},
  ];

  return (
    <>
      {showCreate && <ParameterDialog onClose={() => setShowCreate(false)} />}
      {editParam && <ParameterDialog initial={editParam} onClose={() => setEditParam(null)} />}

      <PageHeader title="ECL Model Parameters" subtitle="IFRS 9 probability of default, loss given default, and exposure management"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Parameter</button>
            <button onClick={() => runEcl.mutate(undefined, { onSuccess: () => toast.success('ECL batch started'), onError: () => toast.error('Batch failed') })}
              disabled={runEcl.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50">
              {runEcl.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run ECL Batch
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Parameters" value={parameters.length} format="number" icon={Settings} loading={isLoading} />
          <StatCard label="Active" value={activeCount} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Stage 1" value={stageCount(1)} format="number" loading={isLoading} />
          <StatCard label="Stage 2" value={stageCount(2)} format="number" loading={isLoading} />
          <StatCard label="Stage 3" value={stageCount(3)} format="number" loading={isLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'parameters', label: 'Parameters', badge: parameters.length || undefined, content: (
            <div className="p-4">
              <DataTable
                columns={paramColumns}
                data={parameters}
                isLoading={isLoading}
                enableGlobalFilter
                enableExport
                exportFilename="ecl-parameters"
                emptyMessage="No ECL parameters configured"
                pageSize={15}
                onRowClick={(row: EclModelParameter) => setEditParam(row)}
              />
            </div>
          )},
          { id: 'preview', label: 'Impact Preview', content: (
            <div className="p-6 max-w-xl space-y-4">
              <h3 className="text-sm font-semibold">Sample ECL Calculation</h3>
              <p className="text-xs text-muted-foreground">Run ECL calculation with current parameters to preview impact.</p>
              <button onClick={handlePreview} disabled={calculateEcl.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {calculateEcl.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Calculate Sample ECL
              </button>
              {previewResult && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle2 className="w-4 h-4" /> Calculation Complete</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Stage:</span> <span className={cn('px-2 py-0.5 rounded-full font-medium', STAGE_COLORS[previewResult.currentStage])}>{previewResult.currentStage}</span></div>
                    <div><span className="text-muted-foreground">PD Used:</span> <span className="font-mono">{formatPercent(previewResult.pdUsed)}</span></div>
                    <div><span className="text-muted-foreground">LGD Used:</span> <span className="font-mono">{formatPercent(previewResult.lgdUsed)}</span></div>
                    <div><span className="text-muted-foreground">EAD:</span> <span className="font-mono">{formatMoney(previewResult.ead)}</span></div>
                  </div>
                  <div className="border-t pt-2 grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Base ECL:</span><p className="font-mono font-medium">{formatMoney(previewResult.eclBase)}</p></div>
                    <div><span className="text-muted-foreground">Optimistic:</span><p className="font-mono font-medium text-green-600">{formatMoney(previewResult.eclOptimistic)}</p></div>
                    <div><span className="text-muted-foreground">Pessimistic:</span><p className="font-mono font-medium text-red-600">{formatMoney(previewResult.eclPessimistic)}</p></div>
                  </div>
                  <div className="border-t pt-2"><span className="text-xs text-muted-foreground">Weighted ECL:</span><p className="text-lg font-bold font-mono">{formatMoney(previewResult.eclWeighted)}</p></div>
                </div>
              )}
            </div>
          )},
          { id: 'calculations', label: 'Historical Calculations', content: (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground">Calculation Date:</label>
                <input type="date" value={calcDate} onChange={(e) => setCalcDate(e.target.value)} className="px-3 py-1.5 text-sm rounded-md border bg-background" />
              </div>
              {calcDate ? (
                <>
                  {calculations.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-lg font-bold font-mono">{formatMoney(calculations.reduce((s: number, c: EclCalculation) => s + c.eclWeighted, 0))}</p>
                        <p className="text-xs text-muted-foreground">Total Weighted ECL</p>
                      </div>
                      {[1, 2, 3].map((stage) => {
                        const stageCalcs = calculations.filter((c: EclCalculation) => c.currentStage === stage);
                        if (stageCalcs.length === 0) return null;
                        return (
                          <div key={stage} className="rounded-lg border p-3 text-center">
                            <p className="text-lg font-bold font-mono">{formatMoney(stageCalcs.reduce((s: number, c: EclCalculation) => s + c.eclWeighted, 0))}</p>
                            <p className="text-xs text-muted-foreground">Stage {stage} ({stageCalcs.length} loans)</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <DataTable columns={calcColumns} data={calculations} isLoading={calcsLoading} enableGlobalFilter enableExport exportFilename={`ecl-calculations-${calcDate}`} emptyMessage="No calculations found for this date" pageSize={15} />
                </>
              ) : (
                <div className="rounded-lg border p-12 text-center text-muted-foreground">
                  <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a date to view ECL calculations.</p>
                </div>
              )}
            </div>
          )},
        ]} />
      </div>
    </>
  );
}
