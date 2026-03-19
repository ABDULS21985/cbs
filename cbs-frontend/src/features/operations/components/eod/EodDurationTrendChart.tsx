import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { formatDate } from '@/lib/formatters';
import type { EodDurationPoint } from '../../api/eodApi';

interface EodDurationTrendChartProps {
  data: EodDurationPoint[];
}

function msToMinutes(ms: number): number {
  return Math.round((ms / 60_000) * 10) / 10;
}

function formatDurationLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface ChartPoint {
  date: string;
  durationMs: number;
  durationMin: number;
  aboveAvg: boolean;
}

const CustomTooltip = ({ active, payload, label, avgMin }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Duration: <span className="font-mono font-medium text-foreground">{formatDurationLabel(d.durationMs)}</span>
      </p>
      <p className={d.aboveAvg ? 'text-red-500' : 'text-green-600'}>
        {d.aboveAvg ? `+${(d.durationMin - avgMin).toFixed(1)} min above avg` : `${(avgMin - d.durationMin).toFixed(1)} min below avg`}
      </p>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = payload.aboveAvg ? '#ef4444' : '#22c55e';
  return <Dot cx={cx} cy={cy} r={3} fill={color} stroke={color} />;
};

export function EodDurationTrendChart({ data }: EodDurationTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No trend data available
      </div>
    );
  }

  const totalMs = data.reduce((sum, d) => sum + d.durationMs, 0);
  const avgMs = totalMs / data.length;
  const avgMin = msToMinutes(avgMs);

  const chartData: ChartPoint[] = data.map((d) => ({
    date: formatDate(d.date),
    durationMs: d.durationMs,
    durationMin: msToMinutes(d.durationMs),
    aboveAvg: d.durationMs > avgMs,
  }));

  const minMin = Math.min(...chartData.map((d) => d.durationMin));
  const maxMin = Math.max(...chartData.map((d) => d.durationMin));
  const yPadding = 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-green-500 rounded" />
          Below average
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-red-500 rounded" />
          Above average
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 border-t border-dashed border-gray-400" />
          Avg: {formatDurationLabel(avgMs)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v.split(' ').slice(0, 2).join(' ')}
            interval={Math.floor(chartData.length / 6)}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[Math.max(0, minMin - yPadding), maxMin + yPadding]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}m`}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip avgMin={avgMin} />} />
          <ReferenceLine
            y={avgMin}
            stroke="#9ca3af"
            strokeDasharray="4 4"
            label={{ value: `Avg ${avgMin.toFixed(1)}m`, position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="durationMin"
            stroke="#6366f1"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
