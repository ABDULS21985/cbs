import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CostOfFundsPoint } from '../../api/depositAnalyticsApi';

interface CostOfFundsTrendProps {
  data: CostOfFundsPoint[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[190px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.stroke ?? entry.color }} className="font-medium">{entry.name}</span>
          <span className="text-foreground font-semibold tabular-nums">{entry.value?.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

const LINES: Array<{ key: keyof CostOfFundsPoint; label: string; color: string; width: number; dash?: string }> = [
  { key: 'savings', label: 'Savings CoF', color: '#3b82f6', width: 1.5 },
  { key: 'current', label: 'Current CoF', color: '#10b981', width: 1.5 },
  { key: 'term', label: 'Term CoF', color: '#f97316', width: 1.5 },
  { key: 'overall', label: 'Overall CoF', color: '#1e293b', width: 2.5 },
  { key: 'mpr', label: 'MPR (CBN)', color: '#ef4444', width: 1.5, dash: '6 3' },
];

export function CostOfFundsTrend({ data, isLoading }: CostOfFundsTrendProps) {
  const latestMpr = data.length > 0 ? data[data.length - 1].mpr : 18.75;

  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-red-50/60 dark:bg-red-950/10 rounded-md px-3 py-2 border border-red-200/60 dark:border-red-800/30">
        <span className="font-semibold text-red-700 dark:text-red-400">MPR:</span>
        <span>
          Monetary Policy Rate currently at{' '}
          <span className="font-bold text-red-700 dark:text-red-400">{latestMpr}%</span>{' '}
          (CBN). Cost of Funds shown on secondary scale for readability.
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          {/* Left axis: CoF (0–10%) */}
          <YAxis
            yAxisId="cof"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 10]}
            width={40}
          />
          {/* Right axis: MPR (0–25%) */}
          <YAxis
            yAxisId="mpr"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 25]}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

          {/* CoF lines */}
          {LINES.filter((l) => l.key !== 'mpr').map((line) => (
            <Line
              key={line.key}
              yAxisId="cof"
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={line.width}
              strokeDasharray={line.dash}
              dot={{ r: 2.5, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          ))}

          {/* MPR line on right axis */}
          <Line
            yAxisId="mpr"
            type="monotone"
            dataKey="mpr"
            name="MPR (CBN)"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* CoF band indicators */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { label: 'Savings CoF', color: '#3b82f6', value: data.length > 0 ? data[data.length - 1].savings : 0 },
          { label: 'Current CoF', color: '#10b981', value: data.length > 0 ? data[data.length - 1].current : 0 },
          { label: 'Term CoF', color: '#f97316', value: data.length > 0 ? data[data.length - 1].term : 0 },
          { label: 'Overall CoF', color: '#1e293b', value: data.length > 0 ? data[data.length - 1].overall : 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
            <div className="text-muted-foreground text-[10px]">{item.label}</div>
            <div className="font-bold mt-0.5" style={{ color: item.color }}>{item.value.toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
