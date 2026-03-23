import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Target } from 'lucide-react';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { AutomationStats } from '../../api/operationalReportApi';

interface AutomationRateChartProps {
  data: AutomationStats[];
  isLoading: boolean;
}

const DONUT_COLORS = {
  Automated: '#10b981',
  Manual: '#e2e8f0',
};

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: inner } = payload[0];
  const pct = inner?.percent ? (inner.percent * 100).toFixed(1) : '0';
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">
        {value.toLocaleString()} transactions ({pct}%)
      </p>
    </div>
  );
}

export function AutomationRateChart({ data, isLoading }: AutomationRateChartProps) {
  const overallStats = useMemo(() => {
    if (!data.length) return { totalCount: 0, automatedCount: 0, manualCount: 0, automationPct: 0 };
    const totalCount = data.reduce((s, d) => s + d.totalCount, 0);
    const automatedCount = data.reduce((s, d) => s + d.automatedCount, 0);
    const manualCount = data.reduce((s, d) => s + d.manualCount, 0);
    const automationPct = totalCount > 0 ? parseFloat(((automatedCount / totalCount) * 100).toFixed(1)) : 0;
    return { totalCount, automatedCount, manualCount, automationPct };
  }, [data]);

  const pieData = [
    { name: 'Automated', value: overallStats.automatedCount },
    { name: 'Manual', value: overallStats.manualCount },
  ];

  const columns = useMemo<ColumnDef<AutomationStats, any>[]>(
    () => [
      {
        accessorKey: 'transactionType',
        header: 'Transaction Type',
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'totalCount',
        header: 'Total',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'automatedCount',
        header: 'Automated',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm text-emerald-600 font-medium">
            {getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'manualCount',
        header: 'Manual',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {getValue<number>().toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'automationPct',
        header: 'Automation %',
        cell: ({ getValue }) => {
          const pct = getValue<number>();
          const color =
            pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
          return (
            <span className={cn('tabular-nums text-sm font-semibold', color)}>
              {pct.toFixed(1)}%
            </span>
          );
        },
      },
      {
        accessorKey: 'manualInterventionOpportunity',
        header: 'Opportunity',
        cell: ({ getValue }) => {
          const isOpportunity = getValue<boolean>();
          if (!isOpportunity) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-300 dark:border-orange-700">
              <Target className="w-3 h-3" />
              Candidate
            </span>
          );
        },
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue<string | undefined>() ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="surface-card p-4 space-y-6">
      <h2 className="text-sm font-semibold text-foreground">Automation Rate</h2>

      {/* Overall Donut */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-56 h-56 flex-shrink-0">
          {isLoading ? (
            <div className="w-full h-full rounded-full bg-muted animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[entry.name as keyof typeof DONUT_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {overallStats.automationPct.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">Automated</span>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Overall Automation</p>
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.automatedCount.toLocaleString()} of {overallStats.totalCount.toLocaleString()} transactions processed automatically
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {overallStats.automatedCount.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Automated</p>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {overallStats.manualCount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Manual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          By Transaction Type
        </h3>
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          pageSize={10}
          emptyMessage="No automation data available"
        />
      </div>
    </div>
  );
}
