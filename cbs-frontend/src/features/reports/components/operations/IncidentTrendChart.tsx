import { useMemo } from 'react';
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
import type { IncidentPoint } from '../../api/operationalReportApi';

interface IncidentTrendChartProps {
  data: IncidentPoint[];
  isLoading: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  Major: '#f97316',
  Minor: '#fbbf24',
};

function IncidentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={`${entry.dataKey}-${entry.name}`} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className="font-medium">
            {entry.dataKey === 'mttrHours'
              ? `${entry.value?.toFixed(1)}h`
              : entry.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IncidentTrendChart({ data, isLoading }: IncidentTrendChartProps) {
  // Pivot: one row per month with severity columns + avg mttr
  const chartData = useMemo(() => {
    const byMonth: Record<string, { month: string; Critical: number; Major: number; Minor: number; mttrHours: number; mttrCount: number }> = {};
    data.forEach(({ month, count, mttrHours, severity }) => {
      if (!byMonth[month]) {
        byMonth[month] = { month, Critical: 0, Major: 0, Minor: 0, mttrHours: 0, mttrCount: 0 };
      }
      if (severity === 'Critical' || severity === 'Major' || severity === 'Minor') {
        byMonth[month][severity] += count;
      }
      if (count > 0) {
        byMonth[month].mttrHours += mttrHours * count;
        byMonth[month].mttrCount += count;
      }
    });
    return Object.values(byMonth).map((d) => ({
      ...d,
      avgMttrHours: d.mttrCount > 0 ? parseFloat((d.mttrHours / d.mttrCount).toFixed(1)) : 0,
    }));
  }, [data]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Incident Trend (12 Months)</h2>

      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
              width={40}
            />
            <Tooltip content={<IncidentTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {(['Critical', 'Major', 'Minor'] as const).map((severity) => (
              <Bar
                key={severity}
                yAxisId="left"
                dataKey={severity}
                name={severity}
                stackId="incidents"
                fill={SEVERITY_COLORS[severity]}
                maxBarSize={36}
                radius={severity === 'Critical' ? [0, 0, 0, 0] : undefined}
              />
            ))}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgMttrHours"
              name="MTTR (avg hours)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
