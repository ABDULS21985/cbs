import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, TrendingUp, TrendingDown, BarChart3,
  Users, PieChart as PieChartIcon, Shield, FileText, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import { creditRiskApi } from '../api/creditRiskApi';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

function useRiskData() {
  const stats = useQuery({ queryKey: ['credit-risk', 'stats'], queryFn: () => creditRiskApi.getStats(), staleTime: 60_000 });
  const ratingDist = useQuery({ queryKey: ['credit-risk', 'rating-dist'], queryFn: () => creditRiskApi.getRatingDistribution(), staleTime: 60_000 });
  const nplTrend = useQuery({ queryKey: ['credit-risk', 'npl-trend'], queryFn: () => creditRiskApi.getNplTrend(), staleTime: 60_000 });
  const sectorConc = useQuery({ queryKey: ['credit-risk', 'sector'], queryFn: () => creditRiskApi.getSectorConcentration(), staleTime: 60_000 });
  const productConc = useQuery({ queryKey: ['credit-risk', 'product'], queryFn: () => creditRiskApi.getProductConcentration(), staleTime: 60_000 });
  const watchList = useQuery({ queryKey: ['credit-risk', 'watchlist'], queryFn: () => creditRiskApi.getWatchList({ page: 0, size: 20 }), staleTime: 60_000 });
  const obligors = useQuery({ queryKey: ['credit-risk', 'obligors'], queryFn: () => creditRiskApi.getSingleObligors(), staleTime: 60_000 });
  return { stats, ratingDist, nplTrend, sectorConc, productConc, watchList, obligors };
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { stats, ratingDist, nplTrend } = useRiskData();
  const s = stats.data ?? {};

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Portfolio" value={s.totalExposure as number ?? 0} format="money" compact icon={BarChart3} loading={stats.isLoading} />
        <StatCard label="NPL Ratio" value={`${((s.nplRatio as number) ?? 0).toFixed(2)}%`} icon={AlertTriangle} loading={stats.isLoading} />
        <StatCard label="Coverage Ratio" value={`${((s.coverageRatio as number) ?? 0).toFixed(1)}%`} icon={Shield} loading={stats.isLoading} />
        <StatCard label="Active Loans" value={s.activeLoanCount as number ?? 0} format="number" icon={Users} loading={stats.isLoading} />
        <StatCard label="Watch List" value={s.watchListCount as number ?? 0} format="number" icon={Eye} loading={stats.isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IFRS9 Stage Distribution */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">IFRS 9 Stage Distribution</h3>
          {ratingDist.data && ratingDist.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={ratingDist.data} dataKey="count" nameKey="stage" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {ratingDist.data.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
          )}
        </div>

        {/* NPL Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">NPL Trend</h3>
          {nplTrend.data && nplTrend.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={nplTrend.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="nplAmount" stroke="#ef4444" strokeWidth={2} name="NPL Amount" />
                <Line type="monotone" dataKey="nplRatio" stroke="#f59e0b" strokeWidth={2} name="NPL %" yAxisId={0} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Concentration Tab ─────────────────────────────────────────────────────────

function ConcentrationTab() {
  const { sectorConc, productConc } = useRiskData();

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Concentration */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Sector Concentration</h3>
          {sectorConc.data && sectorConc.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorConc.data} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10 }} width={75} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="exposure" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
          )}
        </div>

        {/* Product Concentration */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Product Concentration</h3>
          {productConc.data && productConc.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={productConc.data} dataKey="exposure" nameKey="product" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                  {productConc.data.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Watch List Tab ────────────────────────────────────────────────────────────

function WatchListTab() {
  const { watchList } = useRiskData();
  const items = (watchList.data as Record<string, unknown>)?.content as Record<string, unknown>[] ?? [];

  const cols: ColumnDef<Record<string, unknown>, unknown>[] = useMemo(() => [
    { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <code className="text-xs font-mono">{String(row.original.loanNumber ?? '')}</code> },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'productName', header: 'Product' },
    { accessorKey: 'outstandingPrincipal', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstandingPrincipal as number ?? 0)}</span> },
    { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => {
      const dpd = row.original.daysPastDue as number ?? 0;
      return <span className={cn('font-mono text-sm font-semibold', dpd > 90 ? 'text-red-600' : dpd > 30 ? 'text-amber-600' : '')}>{dpd}d</span>;
    }},
    { accessorKey: 'ifrs9Stage', header: 'Stage', cell: ({ row }) => <span className="text-xs font-medium">{String(row.original.ifrs9Stage ?? '')}</span> },
    { accessorKey: 'riskGrade', header: 'Risk Grade' },
    { accessorKey: 'provisionAmount', header: 'Provision', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.provisionAmount as number ?? 0)}</span> },
  ], []);

  return (
    <div className="p-4">
      <DataTable columns={cols} data={items} isLoading={watchList.isLoading} enableGlobalFilter enableExport exportFilename="credit-risk-watchlist" emptyMessage="No watch list items" pageSize={20} />
    </div>
  );
}

// ── Top Exposures Tab ─────────────────────────────────────────────────────────

function TopExposuresTab() {
  const { obligors } = useRiskData();

  const cols: ColumnDef<Record<string, unknown>, unknown>[] = useMemo(() => [
    { accessorKey: 'rank', header: '#', cell: ({ row }) => <span className="text-xs tabular-nums">{(row.index + 1)}</span> },
    { accessorKey: 'customerName', header: 'Obligor' },
    { accessorKey: 'totalExposure', header: 'Total Exposure', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.totalExposure as number ?? 0)}</span> },
    { accessorKey: 'loanCount', header: 'Loans', cell: ({ row }) => <span className="tabular-nums">{String(row.original.loanCount ?? 0)}</span> },
    { accessorKey: 'sector', header: 'Sector' },
    { accessorKey: 'riskGrade', header: 'Risk' },
    { accessorKey: 'concentrationPct', header: '% Portfolio', cell: ({ row }) => <span className="tabular-nums text-sm">{((row.original.concentrationPct as number) ?? 0).toFixed(2)}%</span> },
  ], []);

  return (
    <div className="p-4">
      <DataTable columns={cols} data={obligors.data ?? []} isLoading={obligors.isLoading} enableGlobalFilter emptyMessage="No single obligor data" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreditRiskDashboardPage() {
  useEffect(() => { document.title = 'Credit Risk | CBS'; }, []);

  return (
    <>
      <PageHeader title="Credit Risk Dashboard" subtitle="Portfolio risk analytics, concentration, NPL tracking, and watch list monitoring" backTo="/lending" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'overview', label: 'Overview', content: <OverviewTab /> },
          { id: 'concentration', label: 'Concentration', content: <ConcentrationTab /> },
          { id: 'watchlist', label: 'Watch List', content: <WatchListTab /> },
          { id: 'top-exposures', label: 'Top Exposures', content: <TopExposuresTab /> },
        ]} />
      </div>
    </>
  );
}
