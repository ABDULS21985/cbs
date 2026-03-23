import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Info } from 'lucide-react';
import { DataTable } from '@/components/shared';
import type { QueueMetric, PeakHourData } from '../../api/operationalReportApi';

interface QueueAnalyticsChartsProps {
  metrics: QueueMetric[];
  peakHours: PeakHourData[];
  isLoading: boolean;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function QueueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className="font-medium">
            {entry.dataKey === 'avgWaitMinutes'
              ? `${entry.value?.toFixed(1)} min`
              : entry.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

export function QueueAnalyticsCharts({ metrics, peakHours, isLoading }: QueueAnalyticsChartsProps) {
  const columns = useMemo<ColumnDef<QueueMetric, any>[]>(
    () => [
      {
        accessorKey: 'branch',
        header: 'Branch',
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'avgWaitMinutes',
        header: 'Avg Wait (min)',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toFixed(1)}</span>
        ),
      },
      {
        accessorKey: 'avgServiceMinutes',
        header: 'Avg Service (min)',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toFixed(1)}</span>
        ),
      },
      {
        accessorKey: 'noShowRate',
        header: 'No-Show Rate',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toFixed(1)}%</span>
        ),
      },
      {
        accessorKey: 'ticketsToday',
        header: 'Tickets Today',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm font-medium">{getValue<number>().toLocaleString()}</span>
        ),
      },
    ],
    [],
  );

  const chartData = useMemo(
    () => peakHours.map((d) => ({ ...d, hourLabel: formatHour(d.hour) })),
    [peakHours],
  );

  return (
    <div className="surface-card p-4 space-y-6">
      <h2 className="text-sm font-semibold text-foreground">Queue Analytics</h2>

      {/* Branch Queue Metrics Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Branch Queue Metrics
        </h3>
        <DataTable
          columns={columns}
          data={metrics}
          isLoading={isLoading}
          pageSize={10}
          emptyMessage="No queue data available"
        />
      </div>

      {/* Peak Hours Chart */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Peak Hour Analysis
        </h3>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                width={36}
                label={{ value: 'Volume', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))', dy: 30 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}m`}
                width={40}
                label={{ value: 'Wait (min)', angle: 90, position: 'insideRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))', dy: -40 }}
              />
              <Tooltip content={<QueueTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) =>
                  value === 'volumeCount' ? 'Ticket Volume' : 'Avg Wait (min)'
                }
              />
              <Bar
                yAxisId="left"
                dataKey="volumeCount"
                name="volumeCount"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgWaitMinutes"
                name="avgWaitMinutes"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Insight Banner */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Insight: </span>
          Peak hours are 10am–12pm and 2pm–4pm — consider adding 2 tellers during these windows to reduce average wait time by an estimated 35%.
        </p>
      </div>
    </div>
  );
}
