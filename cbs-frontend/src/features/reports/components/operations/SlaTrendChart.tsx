import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { SlaTrendPoint } from '../../api/operationalReportApi';

interface SlaTrendChartProps {
  data: SlaTrendPoint[];
  isLoading: boolean;
}

const PROCESS_COLORS: Record<string, string> = {
  'Account Opening': '#3b82f6',
  'Loan Disbursement': '#f97316',
  'Payment Processing': '#10b981',
  'Card Issuance': '#8b5cf6',
  'Case Resolution': '#f59e0b',
};

const ALL_PROCESSES = Object.keys(PROCESS_COLORS);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{entry.value?.toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
}

export function SlaTrendChart({ data, isLoading }: SlaTrendChartProps) {
  const [visibleProcesses, setVisibleProcesses] = useState<Set<string>>(new Set(ALL_PROCESSES));

  const chartData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    data.forEach(({ month, process, achievementPct }) => {
      if (!byMonth[month]) byMonth[month] = {};
      byMonth[month][process] = achievementPct;
    });
    return Object.entries(byMonth).map(([month, values]) => ({ month, ...values }));
  }, [data]);

  const toggleProcess = (process: string) => {
    setVisibleProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(process)) {
        if (next.size > 1) next.delete(process);
      } else {
        next.add(process);
      }
      return next;
    });
  };

  return (
    <div className="surface-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">SLA Achievement Trend (12 Months)</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_PROCESSES.map((process) => {
          const active = visibleProcesses.has(process);
          const color = PROCESS_COLORS[process];
          return (
            <button
              key={process}
              onClick={() => toggleProcess(process)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                active
                  ? 'bg-background border-current shadow-sm'
                  : 'bg-muted/40 border-transparent text-muted-foreground',
              )}
              style={active ? { color, borderColor: color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? color : '#94a3b8' }}
              />
              {process}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[70, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={44}
            />
            <ReferenceLine
              y={95}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Target 95%', position: 'right', fontSize: 10, fill: '#10b981' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {ALL_PROCESSES.filter((p) => visibleProcesses.has(p)).map((process) => (
              <Line
                key={process}
                type="monotone"
                dataKey={process}
                stroke={PROCESS_COLORS[process]}
                strokeWidth={2}
                dot={{ r: 3, fill: PROCESS_COLORS[process], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
