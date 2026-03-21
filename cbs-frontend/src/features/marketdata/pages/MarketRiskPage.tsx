import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import api, { apiGet, apiPost } from '@/lib/api';
import type { PageMeta } from '@/types/common';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ShieldAlert, AlertTriangle, BarChart3, TrendingUp,
  Plus, X, Loader2, Calendar,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarketRiskPosition {
  id: number;
  positionDate: string;
  riskType: string;
  portfolio: string;
  currency: string;
  var1d95: number;
  var1d99: number;
  var10d99: number;
  varMethod: string;
  stressLossModerate: number;
  stressLossSevere: number;
  stressScenario: string;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  varLimit: number;
  varUtilizationPct: number;
  limitBreach: boolean;
  dailyPnl: number;
  mtdPnl: number;
  ytdPnl: number;
  createdAt: string;
}

interface MarketRiskStats {
  totalPositions: number;
  breaches: number;
}

// ─── API ────────────────────────────────────────────────────────────────────

interface PaginatedPositions {
  data: MarketRiskPosition[];
  page: PageMeta;
}

const riskKeys = {
  all: ['market-risk'] as const,
  byDate: (date: string) => [...riskKeys.all, 'date', date] as const,
  paginated: (page: number, size: number) => [...riskKeys.all, 'paginated', page, size] as const,
  breaches: () => [...riskKeys.all, 'breaches'] as const,
  stats: () => [...riskKeys.all, 'stats'] as const,
};

const fetchPositionsByDate = (date: string) =>
  apiGet<MarketRiskPosition[]>(`/api/v1/market-risk/${date}`);

const fetchPaginatedPositions = async (page: number, size: number): Promise<PaginatedPositions> => {
  const { data } = await api.get('/api/v1/market-risk', { params: { page, size } });
  return {
    data: data.data ?? [],
    page: data.page ?? { page: 0, size, totalElements: 0, totalPages: 0 },
  };
};

const fetchBreaches = () =>
  apiGet<MarketRiskPosition[]>('/api/v1/market-risk/breaches');

const fetchStats = () =>
  apiGet<MarketRiskStats>('/api/v1/market-risk/stats');

const createPosition = (data: Partial<MarketRiskPosition>) =>
  apiPost<MarketRiskPosition>('/api/v1/market-risk', data);

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useRiskPositions(date: string) {
  return useQuery({
    queryKey: riskKeys.byDate(date),
    queryFn: () => fetchPositionsByDate(date),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function usePaginatedPositions(page: number, size: number) {
  return useQuery({
    queryKey: riskKeys.paginated(page, size),
    queryFn: () => fetchPaginatedPositions(page, size),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    placeholderData: (prev: PaginatedPositions | undefined) => prev,
  });
}

function useRiskBreaches() {
  return useQuery({
    queryKey: riskKeys.breaches(),
    queryFn: fetchBreaches,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function useRiskStats() {
  return useQuery({
    queryKey: riskKeys.stats(),
    queryFn: fetchStats,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskKeys.all });
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pnlCell(value: number, currency: string) {
  if (value == null) return <span className="text-muted-foreground">--</span>;
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  return <span className={cn('font-mono text-xs', color)}>{formatMoney(value, currency)}</span>;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM: Partial<MarketRiskPosition> = {
  positionDate: todayStr(),
  riskType: '',
  portfolio: '',
  currency: 'USD',
  var1d95: 0,
  var1d99: 0,
  var10d99: 0,
  varMethod: 'HISTORICAL',
  stressLossModerate: 0,
  stressLossSevere: 0,
  stressScenario: '',
  delta: 0,
  gamma: 0,
  vega: 0,
  theta: 0,
  rho: 0,
  varLimit: 0,
  varUtilizationPct: 0,
  limitBreach: false,
  dailyPnl: 0,
  mtdPnl: 0,
  ytdPnl: 0,
};

// ─── Columns ────────────────────────────────────────────────────────────────

const positionColumns: ColumnDef<MarketRiskPosition, any>[] = [
  { accessorKey: 'portfolio', header: 'Portfolio', cell: ({ getValue }) => <span className="font-medium text-sm">{getValue()}</span> },
  { accessorKey: 'riskType', header: 'Risk Type' },
  { accessorKey: 'currency', header: 'CCY', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span> },
  {
    accessorKey: 'var1d95',
    header: 'VaR 1d@95%',
    cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var1d95, row.original.currency)}</span>,
  },
  {
    accessorKey: 'var1d99',
    header: 'VaR 1d@99%',
    cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var1d99, row.original.currency)}</span>,
  },
  {
    accessorKey: 'varLimit',
    header: 'VaR Limit',
    cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.varLimit, row.original.currency)}</span>,
  },
  {
    accessorKey: 'varUtilizationPct',
    header: 'Utilization %',
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <span className={cn('font-mono text-xs', v >= 100 ? 'text-red-600 font-semibold' : v >= 80 ? 'text-amber-600' : '')}>
          {formatPercent(v)}
        </span>
      );
    },
  },
  {
    accessorKey: 'limitBreach',
    header: 'Breach',
    cell: ({ getValue }) =>
      getValue() ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" /> Breach
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">OK</span>
      ),
  },
  {
    accessorKey: 'dailyPnl',
    header: 'Daily P&L',
    cell: ({ row }) => pnlCell(row.original.dailyPnl, row.original.currency),
  },
  {
    accessorKey: 'mtdPnl',
    header: 'MTD P&L',
    cell: ({ row }) => pnlCell(row.original.mtdPnl, row.original.currency),
  },
  {
    accessorKey: 'ytdPnl',
    header: 'YTD P&L',
    cell: ({ row }) => pnlCell(row.original.ytdPnl, row.original.currency),
  },
];

const breachColumns: ColumnDef<MarketRiskPosition, any>[] = [
  { accessorKey: 'portfolio', header: 'Portfolio', cell: ({ getValue }) => <span className="font-medium text-sm">{getValue()}</span> },
  { accessorKey: 'riskType', header: 'Risk Type' },
  {
    accessorKey: 'var1d99',
    header: 'VaR',
    cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var1d99, row.original.currency)}</span>,
  },
  {
    accessorKey: 'varLimit',
    header: 'Limit',
    cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.varLimit, row.original.currency)}</span>,
  },
  {
    accessorKey: 'varUtilizationPct',
    header: 'Utilization %',
    cell: ({ getValue }) => <span className="font-mono text-xs text-red-600 font-semibold">{formatPercent(getValue() as number)}</span>,
  },
  {
    accessorKey: 'positionDate',
    header: 'Date',
    cell: ({ getValue }) => <span className="text-xs">{formatDate(getValue() as string)}</span>,
  },
];

const greekColumns: ColumnDef<MarketRiskPosition, any>[] = [
  { accessorKey: 'portfolio', header: 'Portfolio', cell: ({ getValue }) => <span className="font-medium text-sm">{getValue()}</span> },
  { accessorKey: 'riskType', header: 'Risk Type' },
  { accessorKey: 'delta', header: 'Delta', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span> },
  { accessorKey: 'gamma', header: 'Gamma', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span> },
  { accessorKey: 'vega', header: 'Vega', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span> },
  { accessorKey: 'theta', header: 'Theta', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span> },
  { accessorKey: 'rho', header: 'Rho', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span> },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketRiskPage() {
  useEffect(() => { document.title = 'Market Risk | CBS'; }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<Partial<MarketRiskPosition>>({ ...EMPTY_FORM });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const positionsQuery = useRiskPositions(selectedDate);
  const paginatedQuery = usePaginatedPositions(page, pageSize);
  const breachesQuery = useRiskBreaches();
  const statsQuery = useRiskStats();
  const createMut = useCreatePosition();

  const paginatedData = paginatedQuery.data;
  const positions = paginatedData?.data ?? [];
  const pageMeta = paginatedData?.page;
  const datePositions = positionsQuery.data ?? [];
  const breaches = breachesQuery.data ?? [];
  const stats = statsQuery.data;

  const avgUtilization = useMemo(() => {
    if (datePositions.length === 0) return 0;
    return datePositions.reduce((sum, p) => sum + (p.varUtilizationPct ?? 0), 0) / datePositions.length;
  }, [datePositions]);

  const handleCreate = () => {
    createMut.mutate(form, {
      onSuccess: () => {
        toast.success('Position recorded');
        setShowCreateDialog(false);
        setForm({ ...EMPTY_FORM });
      },
      onError: () => toast.error('Failed to record position'),
    });
  };

  const updateField = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Market Risk"
        subtitle={`Position date: ${formatDate(selectedDate)}`}
        actions={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Record Position
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Positions"
            value={stats?.totalPositions ?? positions.length}
            format="number"
            icon={BarChart3}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="Breaches"
            value={stats?.breaches ?? breaches.length}
            format="number"
            icon={ShieldAlert}
            loading={statsQuery.isLoading}
            trend={(stats?.breaches ?? breaches.length) > 0 ? 'down' : undefined}
          />
          <StatCard
            label="Avg VaR Utilization"
            value={avgUtilization}
            format="percent"
            icon={TrendingUp}
            loading={positionsQuery.isLoading}
          />
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">Position Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm"
          />
        </div>

        {/* Error state */}
        {positionsQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">Failed to load risk positions.</p>
            </div>
            <button onClick={() => positionsQuery.refetch()} className="text-xs text-primary hover:underline">Retry</button>
          </div>
        )}

        {/* Tabs */}
        <TabsPage
          tabs={[
            {
              id: 'positions',
              label: 'Positions',
              icon: BarChart3,
              badge: pageMeta?.totalElements ?? positions.length,
              content: (
                <div className="p-4 space-y-4">
                  <DataTable
                    columns={positionColumns}
                    data={positions}
                    isLoading={paginatedQuery.isLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename={`market-risk-positions-${selectedDate}`}
                    emptyMessage="No risk positions for this date"
                    pageSize={pageSize}
                  />
                  {/* Pagination Controls */}
                  {pageMeta && pageMeta.totalPages > 0 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Rows per page</label>
                        <select
                          value={pageSize}
                          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                          className="px-2 py-1 rounded-lg border bg-background text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Page {pageMeta.page + 1} of {pageMeta.totalPages}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage((p) => Math.min(pageMeta.totalPages - 1, p + 1))}
                            disabled={page >= pageMeta.totalPages - 1}
                            className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'breaches',
              label: 'Breaches',
              icon: ShieldAlert,
              badge: breaches.length,
              content: (
                <div className="p-4">
                  {breachesQuery.isError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <p className="text-sm text-red-700">Failed to load breaches.</p>
                      </div>
                      <button onClick={() => breachesQuery.refetch()} className="text-xs text-primary hover:underline">Retry</button>
                    </div>
                  ) : (
                    <DataTable
                      columns={breachColumns}
                      data={breaches}
                      isLoading={breachesQuery.isLoading}
                      enableGlobalFilter
                      emptyMessage="No limit breaches"
                      pageSize={15}
                      getRowClassName={() => 'bg-red-50/30 dark:bg-red-900/5'}
                    />
                  )}
                </div>
              ),
            },
            {
              id: 'greeks',
              label: 'Greeks',
              icon: TrendingUp,
              content: (
                <div className="p-4">
                  <DataTable
                    columns={greekColumns}
                    data={datePositions}
                    isLoading={positionsQuery.isLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename={`market-risk-greeks-${selectedDate}`}
                    emptyMessage="No Greek exposures for this date"
                    pageSize={15}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Record Position Dialog */}
      {showCreateDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateDialog(false)} />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="font-semibold">Record Risk Position</h3>
                <button onClick={() => setShowCreateDialog(false)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Core fields */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ['positionDate', 'Position Date', 'date'],
                    ['portfolio', 'Portfolio', 'text'],
                    ['riskType', 'Risk Type', 'text'],
                    ['currency', 'Currency', 'text'],
                    ['varMethod', 'VaR Method', 'text'],
                  ] as const).map(([key, label, type]) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input
                        type={type}
                        value={(form as any)[key] ?? ''}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* VaR fields */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-xs font-semibold text-muted-foreground px-2">Value at Risk</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      ['var1d95', 'VaR 1d@95%'],
                      ['var1d99', 'VaR 1d@99%'],
                      ['var10d99', 'VaR 10d@99%'],
                      ['varLimit', 'VaR Limit'],
                      ['varUtilizationPct', 'Utilization %'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-muted-foreground">{label}</label>
                        <input
                          type="number"
                          step="any"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => updateField(key, Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                        />
                      </div>
                    ))}
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.limitBreach ?? false}
                          onChange={(e) => updateField('limitBreach', e.target.checked)}
                          className="rounded"
                        />
                        Limit Breach
                      </label>
                    </div>
                  </div>
                </fieldset>

                {/* Stress fields */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-xs font-semibold text-muted-foreground px-2">Stress Testing</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Scenario</label>
                      <input
                        type="text"
                        value={form.stressScenario ?? ''}
                        onChange={(e) => updateField('stressScenario', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Moderate Loss</label>
                      <input
                        type="number"
                        step="any"
                        value={form.stressLossModerate ?? ''}
                        onChange={(e) => updateField('stressLossModerate', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Severe Loss</label>
                      <input
                        type="number"
                        step="any"
                        value={form.stressLossSevere ?? ''}
                        onChange={(e) => updateField('stressLossSevere', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Greeks */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-xs font-semibold text-muted-foreground px-2">Greeks</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(['delta', 'gamma', 'vega', 'theta', 'rho'] as const).map((key) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-muted-foreground capitalize">{key}</label>
                        <input
                          type="number"
                          step="any"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => updateField(key, Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* P&L */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-xs font-semibold text-muted-foreground px-2">P&amp;L</legend>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ['dailyPnl', 'Daily P&L'],
                      ['mtdPnl', 'MTD P&L'],
                      ['ytdPnl', 'YTD P&L'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-muted-foreground">{label}</label>
                        <input
                          type="number"
                          step="any"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => updateField(key, Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMut.isPending || !form.portfolio || !form.riskType}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record Position
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
