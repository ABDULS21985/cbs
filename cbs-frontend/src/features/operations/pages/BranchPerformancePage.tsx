import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, Award,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useBranchRanking,
  useBranchUnderperformers,
  useBranchPerformance,
} from '../hooks/useOperationsData';
import type { BranchPerformance } from '../types/branchPerformance';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function ragStatus(actual: number, target: number): 'green' | 'amber' | 'red' {
  if (target === 0) return 'green';
  const pct = actual / target;
  if (pct >= 1) return 'green';
  if (pct >= 0.8) return 'amber';
  return 'red';
}

const RAG_CLASSES: Record<string, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function RagCell({ actual, target }: { actual: number; target: number }) {
  const rag = ragStatus(actual, target);
  const pct = target > 0 ? ((actual / target) * 100).toFixed(0) : '100';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono">{actual.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">/ {target.toLocaleString()}</span>
      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', RAG_CLASSES[rag])}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Rankings Section ───────────────────────────────────────────────────────────

function RankingsSection({ data, isLoading }: { data: BranchPerformance[]; isLoading: boolean }) {
  const [mode, setMode] = useState<'top' | 'bottom'>('top');

  const sorted = useMemo(() => {
    const list = [...data].sort((a, b) =>
      mode === 'top' ? b.ranking - a.ranking : a.ranking - b.ranking
    );
    return list.slice(0, 10);
  }, [data, mode]);

  // If ranking is 0-based or all same, fall back to totalRevenue for chart
  const chartData = sorted.map((b) => ({
    name: `Branch ${b.branchId}`,
    score: b.ranking || b.customerSatisfactionScore,
    revenue: b.totalRevenue,
  }));

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Branch Rankings</h3>
        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('top')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'top' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            Top 10
          </button>
          <button
            type="button"
            onClick={() => setMode('bottom')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'bottom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            Bottom 10
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-lg bg-muted/40 animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          No ranking data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toLocaleString()}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend />
            <Bar dataKey="score" name="Score" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── KPI Dashboard ──────────────────────────────────────────────────────────────

function KpiDashboard({ data, isLoading }: { data: BranchPerformance[]; isLoading: boolean }) {
  // Use average values as "targets" for RAG since the backend doesn't provide explicit targets
  const avgTxn = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.totalTransactions, 0) / data.length)
    : 0;
  const avgNewCust = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.newCustomers, 0) / data.length)
    : 0;

  const columns: ColumnDef<BranchPerformance, unknown>[] = [
    {
      accessorKey: 'branchId',
      header: 'Branch',
      cell: ({ row }) => <span className="font-medium text-sm">Branch {row.original.branchId}</span>,
    },
    {
      id: 'txnVolume',
      header: 'Transaction Volume',
      cell: ({ row }) => (
        <RagCell actual={row.original.totalTransactions} target={avgTxn} />
      ),
    },
    {
      id: 'newAccounts',
      header: 'New Accounts',
      cell: ({ row }) => (
        <RagCell actual={row.original.newCustomers} target={avgNewCust} />
      ),
    },
    {
      id: 'crossSell',
      header: 'Revenue / Customer',
      cell: ({ row }) => (
        <span className="text-sm font-mono">{formatMoney(row.original.avgRevenuePerCustomer)}</span>
      ),
    },
    {
      accessorKey: 'avgQueueWaitMinutes',
      header: 'Avg Wait (min)',
      cell: ({ row }) => {
        const w = row.original.avgQueueWaitMinutes;
        return (
          <span className={cn(
            'text-sm font-mono',
            w > 15 ? 'text-red-600' : w > 10 ? 'text-amber-600' : 'text-green-600',
          )}>
            {w.toFixed(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'customerSatisfactionScore',
      header: 'Satisfaction',
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.customerSatisfactionScore.toFixed(1)}</span>
      ),
    },
    {
      accessorKey: 'costToIncomeRatio',
      header: 'Cost/Income',
      cell: ({ row }) => (
        <span className={cn(
          'text-sm font-mono',
          row.original.costToIncomeRatio > 80 ? 'text-red-600' : row.original.costToIncomeRatio > 60 ? 'text-amber-600' : 'text-green-600',
        )}>
          {row.original.costToIncomeRatio.toFixed(1)}%
        </span>
      ),
    },
    {
      id: 'ragStatus',
      header: 'RAG',
      cell: ({ row }) => {
        const r = row.original;
        const txnRag = ragStatus(r.totalTransactions, avgTxn);
        const custRag = ragStatus(r.newCustomers, avgNewCust);
        // Worst of the two
        const overall = txnRag === 'red' || custRag === 'red' ? 'red'
          : txnRag === 'amber' || custRag === 'amber' ? 'amber' : 'green';
        return (
          <span className={cn('inline-block w-3 h-3 rounded-full', {
            'bg-green-500': overall === 'green',
            'bg-amber-500': overall === 'amber',
            'bg-red-500': overall === 'red',
          })} />
        );
      },
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">KPI Dashboard</h3>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No performance data"
        pageSize={10}
      />
    </div>
  );
}

// ─── Trend Analysis ─────────────────────────────────────────────────────────────

function TrendAnalysis({ data, isLoading }: { data: BranchPerformance[]; isLoading: boolean }) {
  const branchIds = useMemo(() => {
    const set = new Set(data.map((d) => d.branchId));
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);

  const activeBranchId = selectedBranchId || branchIds[0] || 0;

  const { data: branchData = [], isLoading: trendLoading } = useBranchPerformance(activeBranchId);

  const chartData = useMemo(() =>
    branchData.map((d) => ({
      period: d.periodDate,
      transactions: d.totalTransactions,
      revenue: d.totalRevenue,
      newCustomers: d.newCustomers,
      satisfaction: d.customerSatisfactionScore,
    })),
  [branchData]);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Trend Analysis</h3>
        <select
          value={activeBranchId}
          onChange={(e) => setSelectedBranchId(Number(e.target.value))}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {branchIds.map((id) => (
            <option key={id} value={id}>Branch {id}</option>
          ))}
        </select>
      </div>

      {trendLoading || isLoading ? (
        <div className="h-64 rounded-lg bg-muted/40 animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          Select a branch to view trends
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend />
            <Line type="monotone" dataKey="transactions" stroke="#6366f1" name="Transactions" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="newCustomers" stroke="#10b981" name="New Customers" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="satisfaction" stroke="#f59e0b" name="Satisfaction" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Underperformers ────────────────────────────────────────────────────────────

function UnderperformerSection() {
  const { data: underperformers = [], isLoading } = useBranchUnderperformers();

  // Branches missing targets by >20%
  const critical = useMemo(() =>
    underperformers.filter((b) => {
      const avgTarget = (b.totalTransactions + b.newCustomers) / 2;
      return avgTarget > 0 && b.ranking < 50; // Low ranked branches
    }),
  [underperformers]);

  const columns: ColumnDef<BranchPerformance, unknown>[] = [
    {
      accessorKey: 'branchId',
      header: 'Branch',
      cell: ({ row }) => (
        <span className="font-medium text-sm text-red-600">Branch {row.original.branchId}</span>
      ),
    },
    {
      accessorKey: 'ranking',
      header: 'Rank',
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.ranking}</span>,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Revenue',
      cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.totalRevenue)}</span>,
    },
    {
      accessorKey: 'totalTransactions',
      header: 'Transactions',
      cell: ({ row }) => <span className="text-sm">{row.original.totalTransactions.toLocaleString()}</span>,
    },
    {
      accessorKey: 'costToIncomeRatio',
      header: 'Cost/Income %',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-red-600">{row.original.costToIncomeRatio.toFixed(1)}%</span>
      ),
    },
    {
      accessorKey: 'nplRatioPct',
      header: 'NPL Ratio %',
      cell: ({ row }) => (
        <span className={cn(
          'text-sm font-mono',
          row.original.nplRatioPct > 5 ? 'text-red-600' : 'text-muted-foreground',
        )}>
          {row.original.nplRatioPct.toFixed(2)}%
        </span>
      ),
    },
    {
      accessorKey: 'customerRetentionPct',
      header: 'Retention %',
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.customerRetentionPct.toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
          Underperforming Branches
        </h3>
        <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
          {critical.length > 0 ? critical.length : underperformers.length} branches
        </span>
      </div>
      <DataTable
        columns={columns}
        data={critical.length > 0 ? critical : underperformers}
        isLoading={isLoading}
        emptyMessage="No underperformers - all branches meeting targets"
        pageSize={10}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function BranchPerformancePage() {
  const { data: rankingData = [], isLoading: rankingLoading } = useBranchRanking();

  // Aggregate stats
  const stats = useMemo(() => {
    if (rankingData.length === 0) return { total: 0, avgSatisfaction: 0, avgCostIncome: 0, totalRevenue: 0 };
    const total = rankingData.length;
    const avgSatisfaction = rankingData.reduce((s, d) => s + d.customerSatisfactionScore, 0) / total;
    const avgCostIncome = rankingData.reduce((s, d) => s + d.costToIncomeRatio, 0) / total;
    const totalRevenue = rankingData.reduce((s, d) => s + d.totalRevenue, 0);
    return { total, avgSatisfaction, avgCostIncome, totalRevenue };
  }, [rankingData]);

  return (
    <div className="page-container">
      <PageHeader
        title="Branch Performance Analytics"
        subtitle="KPI dashboards, rankings, and trend analysis across the branch network"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 mt-4">
        <StatCard label="Branches Tracked" value={stats.total} format="number" icon={BarChart3} loading={rankingLoading} />
        <StatCard label="Total Revenue" value={stats.totalRevenue} format="money" icon={TrendingUp} loading={rankingLoading} compact />
        <StatCard label="Avg Satisfaction" value={stats.avgSatisfaction.toFixed(1)} icon={Award} loading={rankingLoading} />
        <StatCard label="Avg Cost/Income" value={`${stats.avgCostIncome.toFixed(1)}%`} icon={TrendingDown} loading={rankingLoading} />
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Rankings */}
        <RankingsSection data={rankingData} isLoading={rankingLoading} />

        {/* KPI Dashboard */}
        <KpiDashboard data={rankingData} isLoading={rankingLoading} />

        {/* Trend Analysis */}
        <TrendAnalysis data={rankingData} isLoading={rankingLoading} />

        {/* Underperformers */}
        <UnderperformerSection />
      </div>
    </div>
  );
}
