import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Droplets, ShieldCheck, AlertTriangle, TrendingUp, BarChart3, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import { liquidityRiskApi, type LiquidityMetric } from '../api/liquidityRiskApi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['liquidity-risk', 'stats'],
    queryFn: () => liquidityRiskApi.getStats(),
    staleTime: 60_000,
  });
  const { data: breaches = [] } = useQuery({
    queryKey: ['liquidity-risk', 'breaches'],
    queryFn: () => liquidityRiskApi.getBreaches(),
  });

  const s = (stats ?? {}) as Record<string, unknown>;
  const lcr = (s.currentLcr as number) ?? 0;
  const nsfr = (s.currentNsfr as number) ?? 0;
  const lcrTrend = (s.lcrTrend as { date: string; value: number }[]) ?? [];
  const nsfrTrend = (s.nsfrTrend as { date: string; value: number }[]) ?? [];
  const hqla = (s.hqlaComposition as { level: string; amount: number }[]) ?? [];

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="LCR" value={`${lcr.toFixed(1)}%`} icon={Droplets} loading={isLoading} />
        <StatCard label="NSFR" value={`${nsfr.toFixed(1)}%`} icon={ShieldCheck} loading={isLoading} />
        <StatCard label="Breaches" value={(s.breachCount as number) ?? breaches.length} format="number" icon={AlertTriangle} loading={isLoading} />
        <StatCard label="Total HQLA" value={hqla.reduce((s, h) => s + h.amount, 0)} format="money" compact icon={BarChart3} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LCR/NSFR Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">LCR / NSFR Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lcrTrend.length > 0 ? lcrTrend : nsfrTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" label="Min 100%" />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name="LCR %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* HQLA Composition */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">HQLA Composition</h3>
          {hqla.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={hqla} dataKey="amount" nameKey="level" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {hqla.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatMoney(v), '']} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No HQLA data</div>
          )}
        </div>
      </div>

      {breaches.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{breaches.length} active liquidity breach{breaches.length !== 1 ? 'es' : ''}</p>
        </div>
      )}
    </div>
  );
}

function MetricsTab() {
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['liquidity-risk', 'list'],
    queryFn: () => liquidityRiskApi.list({ page: 0, size: 50 }),
  });

  const cols: ColumnDef<LiquidityMetric, unknown>[] = useMemo(() => [
    { accessorKey: 'reportDate', header: 'Date', cell: ({ row }) => formatDate(row.original.reportDate) },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'lcrRatio', header: 'LCR %', cell: ({ row }) => <span className={cn('font-mono text-sm font-semibold', row.original.lcrBreached ? 'text-red-600' : 'text-green-600')}>{row.original.lcrRatio.toFixed(1)}%</span> },
    { accessorKey: 'nsfrRatio', header: 'NSFR %', cell: ({ row }) => <span className={cn('font-mono text-sm font-semibold', row.original.nsfrBreached ? 'text-red-600' : 'text-green-600')}>{row.original.nsfrRatio.toFixed(1)}%</span> },
    { accessorKey: 'totalHqla', header: 'Total HQLA', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalHqla)}</span> },
    { accessorKey: 'totalNetCashOutflows', header: 'Net Outflows', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalNetCashOutflows)}</span> },
    { accessorKey: 'availableStableFunding', header: 'ASF', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.availableStableFunding)}</span> },
    { accessorKey: 'requiredStableFunding', header: 'RSF', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.requiredStableFunding)}</span> },
  ], []);

  return (
    <div className="p-4">
      <DataTable columns={cols} data={metrics} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="liquidity-metrics" emptyMessage="No liquidity metrics" pageSize={20} />
    </div>
  );
}

export default function LiquidityRiskPage() {
  useEffect(() => { document.title = 'Liquidity Risk | CBS'; }, []);

  return (
    <>
      <PageHeader title="Liquidity Risk" subtitle="Basel III LCR/NSFR monitoring, HQLA composition, and breach detection" backTo="/treasury" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'overview', label: 'Overview', content: <OverviewTab /> },
          { id: 'metrics', label: 'Metrics History', content: <MetricsTab /> },
        ]} />
      </div>
    </>
  );
}
