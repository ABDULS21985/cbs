import { useState, useEffect } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { FormSection } from '@/components/shared/FormSection';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useTdFrameworks,
  useMaturityLadder,
  useRolloverForecast,
  useLargeDeposits,
  useTdSummaryHistory,
  useCreateTdSummary,
} from '../hooks/useAgreementsExt';
import type { TdFrameworkSummary } from '../types/agreementExt';

const MATURITY_COLORS = { next30Days: '#ef4444', next60Days: '#f59e0b', next90Days: '#22c55e' };

export function TdSummaryDashboardPage() {
  useEffect(() => { document.title = 'TD Portfolio Analytics | CBS'; }, []);
  const [selectedAgreementId, setSelectedAgreementId] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(1000000);
  const [thresholdInput, setThresholdInput] = useState('1000000');
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: frameworks = [] } = useTdFrameworks();
  const { data: maturity } = useMaturityLadder(selectedAgreementId);
  const { data: rollover } = useRolloverForecast(selectedAgreementId);
  const { data: largeDeposits = [] } = useLargeDeposits(threshold);
  const { data: history = [] } = useTdSummaryHistory(selectedAgreementId);
  const createSummary = useCreateTdSummary();

  const maturityData = maturity ? [
    { name: 'Next 30 Days', value: maturity.next30Days ?? 0, color: MATURITY_COLORS.next30Days },
    { name: 'Next 60 Days', value: maturity.next60Days ?? 0, color: MATURITY_COLORS.next60Days },
    { name: 'Next 90 Days', value: maturity.next90Days ?? 0, color: MATURITY_COLORS.next90Days },
  ] : [];

  const rolloverPct = rollover?.expectedRolloverPct ?? 0;

  // Generate summary form state
  const [genForm, setGenForm] = useState({
    activeDeposits: 0,
    totalPrincipal: 0,
    totalAccruedInterest: 0,
    weightedAvgRate: 0,
    weightedAvgTenorDays: 0,
    maturingNext30Days: 0,
    maturingNext60Days: 0,
    maturingNext90Days: 0,
    expectedRolloverPct: 0,
    concentrationPct: 0,
  });

  const handleGenerate = () => {
    if (!selectedAgreementId) {
      toast.error('Select an agreement first');
      return;
    }
    createSummary.mutate(
      { agreementId: selectedAgreementId, ...genForm },
      {
        onSuccess: () => { toast.success('Summary snapshot generated'); setShowGenerate(false); },
        onError: () => toast.error('Failed to generate summary'),
      },
    );
  };

  const largeDepositColumns: ColumnDef<TdFrameworkSummary>[] = [
    { accessorKey: 'agreementId', header: 'Agreement ID' },
    { accessorKey: 'snapshotDate', header: 'Snapshot Date', cell: ({ row }) => formatDate(row.original.snapshotDate) },
    { accessorKey: 'activeDeposits', header: 'Active Deposits' },
    { accessorKey: 'totalPrincipal', header: 'Total Principal', cell: ({ row }) => formatMoney(row.original.totalPrincipal) },
    { accessorKey: 'weightedAvgRate', header: 'Wtd Avg Rate', cell: ({ row }) => formatPercent(row.original.weightedAvgRate ?? 0) },
    { accessorKey: 'weightedAvgTenorDays', header: 'Wtd Avg Tenor' },
    { accessorKey: 'concentrationPct', header: 'Concentration %', cell: ({ row }) => formatPercent(row.original.concentrationPct ?? 0) },
  ];

  const historyColumns: ColumnDef<TdFrameworkSummary>[] = [
    { accessorKey: 'snapshotDate', header: 'Date', cell: ({ row }) => formatDate(row.original.snapshotDate) },
    { accessorKey: 'activeDeposits', header: 'Deposits' },
    { accessorKey: 'totalPrincipal', header: 'Principal', cell: ({ row }) => formatMoney(row.original.totalPrincipal ?? 0) },
    { accessorKey: 'totalAccruedInterest', header: 'Accrued Interest', cell: ({ row }) => formatMoney(row.original.totalAccruedInterest ?? 0) },
    { accessorKey: 'weightedAvgRate', header: 'Avg Rate', cell: ({ row }) => formatPercent(row.original.weightedAvgRate ?? 0) },
    { accessorKey: 'weightedAvgTenorDays', header: 'Avg Tenor' },
    { accessorKey: 'expectedRolloverPct', header: 'Rollover %', cell: ({ row }) => formatPercent(row.original.expectedRolloverPct ?? 0) },
  ];

  return (
    <>
      <PageHeader
        title="Term Deposit Portfolio Analytics"
        subtitle="Maturity ladder, rollover forecasts, concentration analysis"
        actions={
          <button onClick={() => setShowGenerate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Generate Summary
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Agreement Selector */}
        <div className="surface-card p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">Agreement:</label>
            <select value={selectedAgreementId} onChange={(e) => setSelectedAgreementId(Number(e.target.value))}
              className="flex-1 max-w-md px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value={0}>Select an agreement…</option>
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>{f.agreementNumber} — {f.agreementType} ({f.currency})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedAgreementId > 0 && (
          <>
            {/* Maturity Ladder + Rollover Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Maturity Ladder */}
              <div className="lg:col-span-2 surface-card p-5">
                <h3 className="text-sm font-semibold mb-4">Maturity Ladder</h3>
                {maturityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={maturityData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                      <Tooltip formatter={(v: number) => formatMoney(v, 'USD')} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {maturityData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No maturity data available</div>
                )}
              </div>

              {/* Rollover Forecast */}
              <div className="surface-card p-5 space-y-4">
                <h3 className="text-sm font-semibold">Rollover Forecast</h3>
                {rollover ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Principal</p>
                        <p className="text-lg font-bold">{formatMoney(rollover.totalPrincipal ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Rollover</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', rolloverPct >= 70 ? 'bg-green-500' : rolloverPct >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${Math.min(rolloverPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold tabular-nums">{formatPercent(rolloverPct)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Rollover Amount</p>
                        <p className="text-lg font-bold text-green-600">{formatMoney(rollover.expectedRolloverAmount ?? 0)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No forecast data</div>
                )}
              </div>
            </div>

            {/* Summary History Chart + Table */}
            <FormSection title="Summary History">
              {history.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={[...history].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="snapshotDate" tick={{ fontSize: 11 }} tickFormatter={(v) => formatDate(v)} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number, name: string) => name === 'totalPrincipal' ? formatMoney(v) : formatPercent(v)} />
                      <Line yAxisId="left" type="monotone" dataKey="totalPrincipal" stroke="#3b82f6" strokeWidth={2} name="Total Principal" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="weightedAvgRate" stroke="#f59e0b" strokeWidth={2} name="Wtd Avg Rate" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <DataTable columns={historyColumns} data={history} pageSize={10} emptyMessage="No history records." />
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">No summary history for this agreement. Generate a snapshot to get started.</div>
              )}
            </FormSection>
          </>
        )}

        {/* Large Deposits Report */}
        <FormSection title="Large Deposits Report">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium">Threshold:</label>
            <input type="number" value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)}
              className="w-40 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={() => setThreshold(Number(thresholdInput) || 1000000)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
          <DataTable columns={largeDepositColumns} data={largeDeposits} emptyMessage="No deposits above threshold." enableGlobalFilter />
        </FormSection>
      </div>

      {/* Generate Summary Dialog */}
      {showGenerate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowGenerate(false)} />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-base font-semibold">Generate Summary Snapshot</h2>
                <button onClick={() => setShowGenerate(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {!selectedAgreementId && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-3 text-sm text-amber-700 dark:text-amber-400">
                    Please select an agreement from the dropdown above first.
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {([
                    ['activeDeposits', 'Active Deposits', 'number'],
                    ['totalPrincipal', 'Total Principal', 'number'],
                    ['totalAccruedInterest', 'Accrued Interest', 'number'],
                    ['weightedAvgRate', 'Wtd Avg Rate (%)', 'number'],
                    ['weightedAvgTenorDays', 'Wtd Avg Tenor (days)', 'number'],
                    ['maturingNext30Days', 'Maturing 30d', 'number'],
                    ['maturingNext60Days', 'Maturing 60d', 'number'],
                    ['maturingNext90Days', 'Maturing 90d', 'number'],
                    ['expectedRolloverPct', 'Expected Rollover %', 'number'],
                    ['concentrationPct', 'Concentration %', 'number'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide">{label}</label>
                      <input type="number" step="0.01"
                        value={(genForm as Record<string, number>)[key] || ''}
                        onChange={(e) => setGenForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => setShowGenerate(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleGenerate} disabled={!selectedAgreementId || createSummary.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createSummary.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <TrendingUp className="w-4 h-4" /> Generate
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
