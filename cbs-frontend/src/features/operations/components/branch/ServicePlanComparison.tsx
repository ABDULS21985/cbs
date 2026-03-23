import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, Medal } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { branchOpsApi, type ServicePlanMetric, type BranchRanking } from '../../api/branchOpsApi';

interface ServicePlanComparisonProps {
  branchId: string;
}

const achievementColor = (pct: number): string => {
  if (pct >= 100) return 'text-green-600 dark:text-green-400';
  if (pct >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const achievementBg = (pct: number): string => {
  if (pct >= 100) return 'bg-green-50 dark:bg-green-950/30';
  if (pct >= 80) return 'bg-amber-50 dark:bg-amber-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
};

const metricColumns: ColumnDef<ServicePlanMetric, unknown>[] = [
  {
    accessorKey: 'metric',
    header: 'Metric',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.metric}</span>,
  },
  {
    accessorKey: 'target',
    header: 'Target',
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        {row.original.unit === 'NGN'
          ? `₦${(row.original.target / 1_000_000).toFixed(1)}M`
          : `${row.original.target.toLocaleString()} ${row.original.unit}`}
      </span>
    ),
  },
  {
    accessorKey: 'actual',
    header: 'Actual',
    cell: ({ row }) => (
      <span className="text-sm font-mono font-medium">
        {row.original.unit === 'NGN'
          ? `₦${(row.original.actual / 1_000_000).toFixed(1)}M`
          : `${row.original.actual.toLocaleString()} ${row.original.unit}`}
      </span>
    ),
  },
  {
    accessorKey: 'achievementPct',
    header: 'Achievement',
    cell: ({ row }) => {
      const pct = row.original.achievementPct;
      return (
        <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg', achievementBg(pct))}>
          <span className={cn('text-sm font-bold font-mono', achievementColor(pct))}>
            {pct.toFixed(1)}%
          </span>
          {pct >= 100 && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      const style = s === 'MET'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : s === 'AT_RISK'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      return (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', style)}>
          {s.replace('_', ' ')}
        </span>
      );
    },
  },
];

const rankingColumns: ColumnDef<BranchRanking, unknown>[] = [
  {
    accessorKey: 'rank',
    header: 'Rank',
    cell: ({ row }) => {
      const rank = row.original.rank;
      return (
        <div className="flex items-center gap-2">
          {rank === 1 ? (
            <Medal className="w-4 h-4 text-amber-500" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {rank}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'branchName',
    header: 'Branch',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.branchName}</span>,
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(row.original.score, 100)}%` }}
          />
        </div>
        <span className="text-sm font-mono font-semibold">{row.original.score.toFixed(1)}</span>
      </div>
    ),
  },
  {
    accessorKey: 'transactionsToday',
    header: 'Transactions',
    cell: ({ row }) => <span className="text-sm">{row.original.transactionsToday.toLocaleString()}</span>,
  },
  {
    accessorKey: 'avgWait',
    header: 'Avg Wait',
    cell: ({ row }) => <span className="text-sm">{row.original.avgWait} min</span>,
  },
  {
    accessorKey: 'satisfactionScore',
    header: 'Satisfaction',
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        ★ {row.original.satisfactionScore.toFixed(1)}
      </span>
    ),
  },
];

export function ServicePlanComparison({ branchId }: ServicePlanComparisonProps) {
  const { data: metrics = [], isLoading: metricsLoading } = useQuery<ServicePlanMetric[]>({
    queryKey: ['branches', branchId, 'service-plan'],
    queryFn: () => branchOpsApi.getServicePlan(branchId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rankings = [], isLoading: rankingsLoading } = useQuery<BranchRanking[]>({
    queryKey: ['branches', 'rankings'],
    queryFn: () => branchOpsApi.getBranchRankings(),
    staleTime: 5 * 60 * 1000,
  });

  const currentRank = rankings.find((r) => r.branchId === branchId);

  const chartData = metrics
    .filter((m) => m.unit !== 'NGN')
    .map((m) => ({
      name: m.metric.length > 15 ? m.metric.slice(0, 14) + '…' : m.metric,
      fullName: m.metric,
      target: m.target,
      actual: m.actual,
    }));

  if (metricsLoading || rankingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentRank && (
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3">
          <Medal className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">This Branch: </span>
            <span>Rank </span>
            <span className="font-bold text-primary">#{currentRank.rank}</span>
            <span className="text-muted-foreground"> of {rankings.length} branches</span>
            <span className="ml-3 text-muted-foreground">·</span>
            <span className="ml-3 font-mono font-semibold text-primary">{currentRank.score.toFixed(1)}</span>
            <span className="text-muted-foreground"> overall score</span>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Service Plan Metrics</h3>
        <DataTable
          columns={metricColumns}
          data={metrics}
          isLoading={metricsLoading}
          emptyMessage="No service plan data"
          pageSize={15}
        />
      </div>

      {chartData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Target vs Actual (Non-monetary Metrics)</h3>
          <div className="surface-card p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const item = chartData.find((d) => d.name === label);
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
                        <div className="font-semibold mb-1">{item?.fullName ?? label}</div>
                        {payload.map((p) => (
                          <div key={p.name} className="flex gap-2">
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span className="font-mono">{Number(p.value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar dataKey="target" name="Target" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Branch Rankings</h3>
        <DataTable
          columns={rankingColumns}
          data={rankings}
          isLoading={rankingsLoading}
          emptyMessage="No ranking data available"
          pageSize={10}
        />
      </div>
    </div>
  );
}
