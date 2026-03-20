import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Zap, Activity, DollarSign, TrendingDown, Plus, X, Pause, Play, Ban } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { programTradingApi } from '../api/programTradingApi';
import {
  useDefineStrategy,
  useLaunchExecution,
  usePauseExecution,
  useResumeExecution,
  useCancelExecution,
  useSlippageReport,
} from '../hooks/useCapitalMarketsExt';
import { CAPITAL_MARKETS_EXT_KEYS } from '../hooks/useCapitalMarketsExt';
import type { TradingStrategy, ProgramExecution } from '../types/programTrading';
import { toast } from 'sonner';

// ── Strategies Tab ──────────────────────────────────────────────────────────

function StrategiesTab() {
  const [showForm, setShowForm] = useState(false);
  const define = useDefineStrategy();
  const { data: strategies = [], isLoading } = useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.programTrading, 'strategies'],
    queryFn: () => programTradingApi.defineStrategy({} as TradingStrategy).catch(() => [] as TradingStrategy[]),
    staleTime: 30_000,
    enabled: false,
  });

  const [form, setForm] = useState({ strategyName: '', strategyType: 'VWAP', executionAlgorithm: 'VWAP', instrumentScope: '{}' });

  const columns = useMemo<ColumnDef<TradingStrategy, unknown>[]>(() => [
    { accessorKey: 'strategyCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.strategyCode}</span> },
    { accessorKey: 'strategyName', header: 'Name' },
    { accessorKey: 'strategyType', header: 'Type' },
    { accessorKey: 'executionAlgorithm', header: 'Algorithm' },
    { accessorKey: 'modelRiskTier', header: 'Risk Tier' },
    { accessorKey: 'approvedBy', header: 'Approved By' },
    { accessorKey: 'approvalDate', header: 'Approval Date', cell: ({ row }) => row.original.approvalDate ? formatDate(row.original.approvalDate) : '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Define Strategy
        </button>
      </div>
      <DataTable columns={columns} data={strategies as TradingStrategy[]} isLoading={isLoading} pageSize={15} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Define Strategy</h2>
            <form onSubmit={(e) => { e.preventDefault(); define.mutate({ strategyName: form.strategyName, strategyType: form.strategyType, executionAlgorithm: form.executionAlgorithm } as Partial<TradingStrategy>, { onSuccess: () => { toast.success('Strategy defined'); setShowForm(false); } }); }} className="space-y-4">
              <div><label className="text-sm font-medium text-muted-foreground">Strategy Name</label><input className="w-full mt-1 input" value={form.strategyName} onChange={(e) => setForm((f) => ({ ...f, strategyName: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium text-muted-foreground">Type</label><select className="w-full mt-1 input" value={form.strategyType} onChange={(e) => setForm((f) => ({ ...f, strategyType: e.target.value }))}><option value="VWAP">VWAP</option><option value="TWAP">TWAP</option><option value="ICEBERG">Iceberg</option><option value="PARTICIPATION">Participation</option></select></div>
              <div><label className="text-sm font-medium text-muted-foreground">Algorithm</label><select className="w-full mt-1 input" value={form.executionAlgorithm} onChange={(e) => setForm((f) => ({ ...f, executionAlgorithm: e.target.value }))}><option value="VWAP">VWAP</option><option value="TWAP">TWAP</option><option value="SMART_ORDER_ROUTING">Smart Order Routing</option></select></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={define.isPending} className="btn-primary">{define.isPending ? 'Defining...' : 'Define'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Executions Tab ─────────────────────────────────────────────────────

function LiveExecutionsTab() {
  const { data: executions = [], isLoading } = useQuery({
    queryKey: [...CAPITAL_MARKETS_EXT_KEYS.programTrading, 'executions', 'live'],
    queryFn: () => programTradingApi.getSlippageReport('__all__').catch(() => [] as ProgramExecution[]),
    refetchInterval: 5000,
    staleTime: 5000,
  });
  const pause = usePauseExecution();
  const resume = useResumeExecution();
  const cancel = useCancelExecution();

  const live = (executions as ProgramExecution[]).filter((e) => ['RUNNING', 'PAUSED'].includes(e.status));

  return (
    <div className="p-4 space-y-4">
      {isLoading && <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />}
      {live.length === 0 && !isLoading && <p className="text-sm text-muted-foreground text-center py-8">No live executions.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {live.map((ex) => (
          <div key={ex.id} className="card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-xs font-medium text-primary">{ex.executionRef}</p>
                <p className="text-sm text-muted-foreground">Order: {ex.parentOrderRef}</p>
              </div>
              <StatusBadge status={ex.status} />
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${ex.completionPct ?? 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatPercent(ex.completionPct ?? 0)} complete</span>
              <span>{ex.executedQuantity?.toLocaleString()} / {ex.targetQuantity?.toLocaleString()} qty</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Avg Price</span><p className="font-medium tabular-nums">{ex.avgExecutionPrice?.toFixed(2)}</p></div>
              <div><span className="text-muted-foreground">Benchmark</span><p className="font-medium tabular-nums">{ex.benchmarkPrice?.toFixed(2)}</p></div>
              <div><span className="text-muted-foreground">Slippage</span><p className={cn('font-medium tabular-nums', (ex.slippageBps ?? 0) > 5 ? 'text-red-600' : 'text-green-600')}>{ex.slippageBps?.toFixed(1)} bps</p></div>
            </div>
            <div className="flex gap-2 pt-1">
              {ex.status === 'RUNNING' && <button className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" onClick={() => pause.mutate(ex.executionRef, { onSuccess: () => toast.success('Paused') })}><Pause className="w-3 h-3" /> Pause</button>}
              {ex.status === 'PAUSED' && <button className="btn-primary text-xs px-2 py-1 flex items-center gap-1" onClick={() => resume.mutate(ex.executionRef, { onSuccess: () => toast.success('Resumed') })}><Play className="w-3 h-3" /> Resume</button>}
              <button className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 text-red-600" onClick={() => cancel.mutate(ex.executionRef, { onSuccess: () => toast.success('Cancelled') })}><Ban className="w-3 h-3" /> Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slippage Report Tab ─────────────────────────────────────────────────────

function SlippageReportTab() {
  const [code, setCode] = useState('');
  const { data: report = [], isLoading } = useSlippageReport(code);

  const chartData = useMemo(() =>
    (report as ProgramExecution[]).map((e) => ({
      name: e.executionRef,
      slippage: e.slippageBps,
    })), [report]);

  const columns = useMemo<ColumnDef<ProgramExecution, unknown>[]>(() => [
    { accessorKey: 'executionRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.executionRef}</span> },
    { accessorKey: 'executionDate', header: 'Date', cell: ({ row }) => formatDate(row.original.executionDate) },
    { accessorKey: 'executedAmount', header: 'Executed', cell: ({ row }) => formatMoney(row.original.executedAmount) },
    { accessorKey: 'avgExecutionPrice', header: 'Avg Price', cell: ({ row }) => row.original.avgExecutionPrice?.toFixed(4) },
    { accessorKey: 'benchmarkPrice', header: 'Benchmark', cell: ({ row }) => row.original.benchmarkPrice?.toFixed(4) },
    { accessorKey: 'slippageBps', header: 'Slippage (bps)', cell: ({ row }) => <span className={cn('font-medium tabular-nums', (row.original.slippageBps ?? 0) > 5 ? 'text-red-600' : 'text-green-600')}>{row.original.slippageBps?.toFixed(1)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <div><label className="text-sm font-medium text-muted-foreground mr-2">Strategy Code:</label><input className="input w-48" placeholder="Enter strategy code" value={code} onChange={(e) => setCode(e.target.value)} /></div>
      <DataTable columns={columns} data={report as ProgramExecution[]} isLoading={isLoading} pageSize={15} />
      {chartData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-4">Slippage Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v) => `${v} bps`} className="text-xs" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)} bps`} />
              <Bar dataKey="slippage" fill="#3b82f6" name="Slippage (bps)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProgramTradingPage() {
  useEffect(() => { document.title = 'Program Trading | CBS'; }, []);

  return (
    <>
      <PageHeader title="Program Trading" subtitle="Algorithmic execution strategies, live monitoring and slippage analysis" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Strategies" value={0} format="number" icon={Zap} />
          <StatCard label="Executions Running" value={0} format="number" icon={Activity} />
          <StatCard label="Volume Today" value={0} format="money" icon={DollarSign} />
          <StatCard label="Avg Slippage" value={0} format="number" icon={TrendingDown} />
        </div>
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'strategies', label: 'Strategies', content: <StrategiesTab /> },
            { id: 'live', label: 'Live Executions', content: <LiveExecutionsTab /> },
            { id: 'slippage', label: 'Slippage Report', content: <SlippageReportTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
