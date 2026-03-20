import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { NpsPoint } from '../../api/marketingAnalyticsApi';

interface NpsTrendChartProps {
  data: NpsPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function NpsTrendChart({ data }: NpsTrendChartProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">NPS Trend (12 Months)</h3>
        <div className="text-xs text-muted-foreground">Customer sentiment from survey responses returned by the backend.</div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          {/* Color zone backgrounds */}
          <ReferenceArea y1={60} y2={100} fill="#16a34a" fillOpacity={0.06} />
          <ReferenceArea y1={30} y2={60} fill="#f59e0b" fillOpacity={0.06} />
          <ReferenceArea y1={-100} y2={30} fill="#ef4444" fillOpacity={0.06} />

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[-20, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zone reference lines */}
          <ReferenceLine y={60} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
          <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

          <Line
            type="monotone"
            dataKey="nps"
            name="NPS Score"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
