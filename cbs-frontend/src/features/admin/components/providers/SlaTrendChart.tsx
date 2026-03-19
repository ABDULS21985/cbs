import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SlaRecord } from '../../api/providerApi';

interface SlaTrendChartProps {
  records: SlaRecord[];
  slaTarget?: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const uptime = payload[0]?.value;
  const met = uptime !== undefined && uptime >= (payload[0]?.name ? parseFloat(payload[0].name) : 99.9);
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-muted-foreground mb-1">{label}</p>
      <p className={met ? 'text-green-600' : 'text-red-600'}>
        Uptime: <strong>{uptime?.toFixed(3)}%</strong>
      </p>
    </div>
  );
};

export function SlaTrendChart({ records, slaTarget = 99.9 }: SlaTrendChartProps) {
  // Sort ascending
  const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));

  const data = sorted.map(r => ({
    month: r.month,
    uptime: r.actualUptime,
    met: r.uptimeMet,
  }));

  const minY = Math.min(...data.map(d => d.uptime), slaTarget) - 0.5;
  const domain: [number, number] = [Math.max(95, Math.floor(minY * 10) / 10), 100];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            className="fill-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine
            y={slaTarget}
            stroke="#3b82f6"
            strokeDasharray="6 4"
            strokeOpacity={0.8}
            label={{ value: `SLA Target ${slaTarget}%`, position: 'insideTopRight', fontSize: 10, fill: '#3b82f6' }}
          />
          <Line
            type="monotone"
            dataKey="uptime"
            name="Actual Uptime %"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { met: boolean } };
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.met ? '#22c55e' : '#ef4444'}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-1 px-2">
        Dots: <span className="text-green-600">green</span> = SLA met, <span className="text-red-600">red</span> = SLA missed
      </p>
    </div>
  );
}
