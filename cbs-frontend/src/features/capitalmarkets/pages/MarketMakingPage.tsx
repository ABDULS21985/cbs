import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatDate, formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Activity, ShieldAlert, Plus, X, Pause, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { marketMakingApi } from '../api/marketMakingApi';
import type { MarketMakingMandate, MarketMakingActivity } from '../types/marketMaking';
import { toast } from 'sonner';

const MM_KEYS = {
  active: ['market-making', 'active'] as const,
  performance: (code: string) => ['market-making', 'performance', code] as const,
  compliance: ['market-making', 'compliance'] as const,
};

// ── Mandates Tab ────────────────────────────────────────────────────────────

function MandatesTab() {
  const { data: mandates = [], isLoading } = useQuery({
    queryKey: MM_KEYS.active,
    queryFn: () => marketMakingApi.getActiveMandates(),
    staleTime: 30_000,
  });
  const qc = useQueryClient();
  const suspend = useMutation({
    mutationFn: (code: string) => marketMakingApi.suspendMandate(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MM_KEYS.active }); toast.success('Mandate suspended'); },
  });
  const [showForm, setShowForm] = useState(false);
  const create = useMutation({
    mutationFn: (data: Partial<MarketMakingMandate>) => marketMakingApi.createMandate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MM_KEYS.active }); setShowForm(false); toast.success('Mandate created'); },
  });

  const columns = useMemo<ColumnDef<MarketMakingMandate, unknown>[]>(() => [
    { accessorKey: 'mandateCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.mandateCode}</span> },
    { accessorKey: 'mandateName', header: 'Name' },
    { accessorKey: 'instrumentType', header: 'Instrument' },
    { accessorKey: 'instrumentCode', header: 'Code' },
    { accessorKey: 'exchange', header: 'Exchange' },
    { accessorKey: 'mandateType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.mandateType} /> },
    { accessorKey: 'quoteObligation', header: 'Obligation' },
    { accessorKey: 'maxSpreadBps', header: 'Max Spread (bps)', cell: ({ row }) => <span className="tabular-nums">{row.original.maxSpreadBps}</span> },
    { accessorKey: 'effectiveFrom', header: 'Effective', cell: ({ row }) => formatDate(row.original.effectiveFrom) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'ACTIVE' ? (
      <button className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 text-amber-600" onClick={() => suspend.mutate(row.original.mandateCode)} disabled={suspend.isPending}>
        <Pause className="w-3 h-3" /> Suspend
      </button>
    ) : null },
  ], [suspend]);

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Create Mandate
        </button>
      </div>
      <DataTable columns={columns} data={mandates as MarketMakingMandate[]} isLoading={isLoading} pageSize={15} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Create Market Making Mandate</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              create.mutate({
                mandateName: fd.get('mandateName') as string,
                instrumentType: fd.get('instrumentType') as string,
                instrumentCode: fd.get('instrumentCode') as string,
                exchange: fd.get('exchange') as string,
                mandateType: fd.get('mandateType') as MarketMakingMandate['mandateType'],
                quoteObligation: fd.get('quoteObligation') as MarketMakingMandate['quoteObligation'],
                maxSpreadBps: Number(fd.get('maxSpreadBps')),
                effectiveFrom: fd.get('effectiveFrom') as string,
                deskId: Number(fd.get('deskId')),
              });
            }} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-sm font-medium">Mandate Name</label><input name="mandateName" className={inputCls} required /></div>
              <div><label className="text-sm font-medium">Instrument Type</label><input name="instrumentType" className={inputCls} required /></div>
              <div><label className="text-sm font-medium">Instrument Code</label><input name="instrumentCode" className={inputCls} /></div>
              <div><label className="text-sm font-medium">Exchange</label><input name="exchange" className={inputCls} /></div>
              <div><label className="text-sm font-medium">Desk ID</label><input name="deskId" type="number" className={inputCls} required /></div>
              <div><label className="text-sm font-medium">Mandate Type</label>
                <select name="mandateType" className={inputCls} required>
                  <option value="DESIGNATED">Designated</option><option value="VOLUNTARY">Voluntary</option>
                  <option value="INTERBANK">Interbank</option><option value="PRIMARY_DEALER">Primary Dealer</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">Quote Obligation</label>
                <select name="quoteObligation" className={inputCls} required>
                  <option value="CONTINUOUS">Continuous</option><option value="ON_REQUEST">On Request</option><option value="SCHEDULED">Scheduled</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">Max Spread (bps)</label><input name="maxSpreadBps" type="number" step="0.1" className={inputCls} /></div>
              <div><label className="text-sm font-medium">Effective From</label><input name="effectiveFrom" type="date" className={inputCls} required /></div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary">{create.isPending ? 'Creating...' : 'Create Mandate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Performance Tab ─────────────────────────────────────────────────────────

function PerformanceTab() {
  const { data: mandates = [] } = useQuery({
    queryKey: MM_KEYS.active,
    queryFn: () => marketMakingApi.getActiveMandates(),
    staleTime: 30_000,
  });
  const [selectedCode, setSelectedCode] = useState('');
  const { data: activities = [], isLoading } = useQuery({
    queryKey: MM_KEYS.performance(selectedCode),
    queryFn: () => marketMakingApi.getPerformance(selectedCode),
    enabled: !!selectedCode,
    staleTime: 30_000,
  });

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="p-4 space-y-4">
      <div className="max-w-xs">
        <label className="text-sm font-medium text-muted-foreground">Select Mandate</label>
        <select className={inputCls} value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}>
          <option value="">Select...</option>
          {(mandates as MarketMakingMandate[]).map((m) => <option key={m.mandateCode} value={m.mandateCode}>{m.mandateCode} — {m.mandateName}</option>)}
        </select>
      </div>
      {selectedCode && (activities as MarketMakingActivity[]).length > 0 && (
        <>
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={activities as MarketMakingActivity[]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="activityDate" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="quotesPublished" name="Quotes Published" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="quotesHit" name="Quotes Hit" fill="#22c55e" />
                <Line yAxisId="right" type="monotone" dataKey="avgBidAskSpreadBps" name="Avg Spread (bps)" stroke="#f59e0b" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">Activity Detail</h3>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Quotes</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Fill %</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Spread (bps)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Volume</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Net Pos</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">P&L</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Uptime %</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Obligation</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(activities as MarketMakingActivity[]).map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-mono text-xs">{formatDate(a.activityDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.quotesPublished}/{a.quotesHit}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.fillRatioPct?.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.avgBidAskSpreadBps?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(a.totalVolume)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(a.netPosition)}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums font-medium', (a.realizedPnl + a.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatMoney(a.realizedPnl + a.unrealizedPnl)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.quotingUptimePct?.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', a.obligationMet ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                          {a.obligationMet ? 'Met' : 'Breached'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {selectedCode && !isLoading && (activities as MarketMakingActivity[]).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No activity recorded for this mandate.</p>
      )}
    </div>
  );
}

// ── Compliance Tab ──────────────────────────────────────────────────────────

function ComplianceTab() {
  const { data: violations = [], isLoading } = useQuery({
    queryKey: MM_KEYS.compliance,
    queryFn: () => marketMakingApi.getObligationCompliance(),
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<MarketMakingActivity, unknown>[]>(() => [
    { accessorKey: 'mandateId', header: 'Mandate ID' },
    { accessorKey: 'activityDate', header: 'Date', cell: ({ row }) => formatDate(row.original.activityDate) },
    { accessorKey: 'quotesPublished', header: 'Quotes' },
    { accessorKey: 'fillRatioPct', header: 'Fill %', cell: ({ row }) => <span className="tabular-nums">{row.original.fillRatioPct?.toFixed(1)}%</span> },
    { accessorKey: 'avgBidAskSpreadBps', header: 'Avg Spread (bps)', cell: ({ row }) => <span className="tabular-nums">{row.original.avgBidAskSpreadBps?.toFixed(1)}</span> },
    { accessorKey: 'spreadViolationCount', header: 'Violations', cell: ({ row }) => <span className={cn('tabular-nums font-medium', row.original.spreadViolationCount > 0 ? 'text-red-600' : '')}>{row.original.spreadViolationCount}</span> },
    { accessorKey: 'quotingUptimePct', header: 'Uptime %', cell: ({ row }) => <span className="tabular-nums">{row.original.quotingUptimePct?.toFixed(1)}%</span> },
    { accessorKey: 'obligationMet', header: 'Obligation', cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', row.original.obligationMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
        {row.original.obligationMet ? 'Met' : 'Breached'}
      </span>
    ) },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <DataTable columns={columns} data={violations as MarketMakingActivity[]} isLoading={isLoading} pageSize={15} emptyMessage="No obligation violations found" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MarketMakingPage() {
  useEffect(() => { document.title = 'Market Making | CBS'; }, []);

  const { data: mandates = [] } = useQuery({
    queryKey: MM_KEYS.active,
    queryFn: () => marketMakingApi.getActiveMandates(),
    staleTime: 30_000,
  });
  const { data: compliance = [] } = useQuery({
    queryKey: MM_KEYS.compliance,
    queryFn: () => marketMakingApi.getObligationCompliance(),
    staleTime: 30_000,
  });

  const activeMandates = (mandates as MarketMakingMandate[]).filter((m) => m.status === 'ACTIVE');
  const violations = (compliance as MarketMakingActivity[]).filter((a) => !a.obligationMet);

  return (
    <>
      <PageHeader title="Market Making" subtitle="Mandate management, activity tracking and obligation compliance" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Mandates" value={(mandates as MarketMakingMandate[]).length} format="number" icon={Building2} />
          <StatCard label="Active Mandates" value={activeMandates.length} format="number" icon={Activity} />
          <StatCard label="Obligation Violations" value={violations.length} format="number" icon={AlertTriangle} />
          <StatCard label="Compliance Rate" value={(mandates as MarketMakingMandate[]).length > 0 ? ((activeMandates.length - violations.length) / Math.max(activeMandates.length, 1) * 100) : 0} format="percent" icon={ShieldAlert} />
        </div>
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'mandates', label: 'Mandates', badge: (mandates as MarketMakingMandate[]).length || undefined, content: <MandatesTab /> },
            { id: 'performance', label: 'Performance', content: <PerformanceTab /> },
            { id: 'compliance', label: 'Compliance', badge: violations.length || undefined, content: <ComplianceTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
