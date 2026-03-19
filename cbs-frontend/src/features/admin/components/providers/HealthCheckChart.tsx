import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
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
            {entry.name.includes('Response') ? `${entry.value}ms` : `${entry.value}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export function HealthCheckChart({ logs, slaUptime = 99.9, slaResponse = 300 }: HealthCheckChartProps) {
  const data = logs.map(log => ({
    date: format(new Date(log.checkTimestamp), 'MMM dd HH:mm'),
    responseTime: log.responseTimeMs,
    healthy: log.isHealthy ? 1 : 0,
    requests: log.requestCount,
    errors: log.errorCount,
    errorRate: log.errorRatePct,
  })).reverse();

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 60, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))} className="fill-muted-foreground" />
          <YAxis yAxisId="response" orientation="left" tick={{ fontSize: 11 }} tickLine={false}
            axisLine={false} tickFormatter={v => `${v}ms`} className="fill-muted-foreground" />
          <YAxis yAxisId="errorRate" orientation="right" tick={{ fontSize: 11 }} tickLine={false}
            axisLine={false} tickFormatter={v => `${v}%`} className="fill-muted-foreground" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <ReferenceLine yAxisId="response" y={slaResponse} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.7}
            label={{ value: `SLA ${slaResponse}ms`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
          <Line yAxisId="response" type="monotone" dataKey="responseTime" name="Response Time (ms)"
            stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="errorRate" type="monotone" dataKey="errorRate" name="Error Rate (%)"
            stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>

      {data.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground px-2">
          <span>Avg Response: <strong className="text-foreground">{Math.round(data.reduce((s, d) => s + d.responseTime, 0) / data.length)}ms</strong></span>
          <span>Total Requests: <strong className="text-foreground">{logs.reduce((s, l) => s + l.requestCount, 0).toLocaleString()}</strong></span>
          <span>Total Errors: <strong className="text-foreground">{logs.reduce((s, l) => s + l.errorCount, 0).toLocaleString()}</strong></span>
          <span>Health Checks: <strong className="text-foreground">{logs.length}</strong></span>
        </div>
      )}
    </div>
  );
}
