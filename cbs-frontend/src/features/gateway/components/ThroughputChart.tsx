import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import { gatewayApi } from '../api/gatewayApi';

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1">
      <div className="font-medium text-foreground mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ThroughputChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['gateway', 'throughput'],
    queryFn: () => gatewayApi.getThroughput(),
    refetchInterval: 30_000,
  });

  const points = data?.points ?? [];
  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Message Throughput — Last 24 Hours</h3>
        <span className="text-xs text-muted-foreground">Auto-refresh every 30s</span>
      </div>

      {summary && (
        <div className="flex gap-6 mb-3 text-xs">
          <div><span className="text-muted-foreground">Total: </span><span className="font-semibold">{summary.totalMessages.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Last 24h: </span><span className="font-semibold">{summary.messagesLast24h.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Last 7d: </span><span className="font-semibold">{summary.messagesLast7d.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Avg/hr: </span><span className="font-semibold">{summary.avgPerHourLast24h.toFixed(1)}</span></div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={points} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="messages"
            name="Messages"
            fill="#3b82f6"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
