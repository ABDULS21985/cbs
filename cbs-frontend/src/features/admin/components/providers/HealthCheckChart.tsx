import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { ProviderHealthLog } from '../../api/providerApi';

interface HealthCheckChartProps {
  logs: ProviderHealthLog[];
  slaUptime?: number;
  slaResponse?: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">
            {entry.name === 'Uptime %' ? `${entry.value.toFixed(3)}%` : `${entry.value}ms`}
          </span>
        </div>
      ))}
    </div>
  );
};

export function HealthCheckChart({ logs, slaUptime = 99.9, slaResponse = 300 }: HealthCheckChartProps) {
  const data = logs.map(log => ({
    date: format(new Date(log.timestamp), 'MMM dd'),
    uptime: log.uptime,
    latency: log.avgLatencyMs,
    calls: log.callCount,
    errors: log.errorCount,
  }));

  const minUptime = Math.min(...data.map(d => d.uptime), slaUptime) - 1;
  const uptimeDomain: [number, number] = [Math.max(90, Math.floor(minUptime * 10) / 10), 100];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 60, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 8)}
            className="fill-muted-foreground"
          />
          {/* Left Y: Uptime */}
          <YAxis
            yAxisId="uptime"
            orientation="left"
            domain={uptimeDomain}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            className="fill-muted-foreground"
          />
          {/* Right Y: Latency */}
          <YAxis
            yAxisId="latency"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}ms`}
            className="fill-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />

          {/* SLA reference lines */}
          <ReferenceLine
            yAxisId="uptime"
            y={slaUptime}
            stroke="#3b82f6"
            strokeDasharray="6 4"
            strokeOpacity={0.7}
            label={{ value: `SLA ${slaUptime}%`, position: 'insideTopLeft', fontSize: 10, fill: '#3b82f6' }}
          />
          <ReferenceLine
            yAxisId="latency"
            y={slaResponse}
            stroke="#f59e0b"
            strokeDasharray="6 4"
            strokeOpacity={0.7}
            label={{ value: `SLA ${slaResponse}ms`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
          />

          <Line
            yAxisId="uptime"
            type="monotone"
            dataKey="uptime"
            name="Uptime %"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="latency"
            type="monotone"
            dataKey="latency"
            name="Avg Latency (ms)"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary below chart */}
      {data.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground px-2">
          <span>
            Avg Uptime: <strong className="text-foreground">
              {(data.reduce((s, d) => s + d.uptime, 0) / data.length).toFixed(3)}%
            </strong>
          </span>
          <span>
            Avg Latency: <strong className="text-foreground">
              {Math.round(data.reduce((s, d) => s + d.latency, 0) / data.length)}ms
            </strong>
          </span>
          <span>
            Total Calls: <strong className="text-foreground">
              {logs.reduce((s, l) => s + l.callCount, 0).toLocaleString()}
            </strong>
          </span>
          <span>
            Total Errors: <strong className="text-foreground">
              {logs.reduce((s, l) => s + l.errorCount, 0).toLocaleString()}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
