import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import type { SuccessRateTrendPoint } from '../../api/channelAnalyticsApi';

interface SuccessRateTrendProps {
  data: SuccessRateTrendPoint[];
  isLoading?: boolean;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm min-w-[140px]">
      <div className="font-semibold text-foreground mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 text-xs mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

const LINES = [
  { key: 'mobile' as const, label: 'Mobile', color: '#3b82f6' },
  { key: 'web'    as const, label: 'Web',    color: '#8b5cf6' },
  { key: 'branch' as const, label: 'Branch', color: '#6b7280' },
];

export function SuccessRateTrend({ data, isLoading }: SuccessRateTrendProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-56 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  // Show every 5th tick for readability
  const ticks = data.filter((_, i) => i % 5 === 0).map((d) => d.date);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Success Rate Trend (30 Days)</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dashed line = 99% SLA target
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[98, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
          <ReferenceLine
            y={99}
            stroke="#ef4444"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: '99% SLA', position: 'right', fontSize: 10, fill: '#ef4444' }}
          />
          {LINES.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
